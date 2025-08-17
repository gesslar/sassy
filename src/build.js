#!/usr/bin/env node

/**
 * @file Aunty Rose theme compiler CLI.
 *
 * Responsibilities:
 *  - Parse CLI arguments (supports JSON5 / YAML theme entries, globs resolved externally by the shell)
 *  - Load a theme source file into an in‑memory "bundle" structure
 *  - Delegate compilation to `Compiler.compile(bundle)` (populates bundle.result)
 *  - Write (or print with --dry-run) the resulting VS Code color theme JSON
 *  - Prevent unnecessary writes by hashing previous output
 *  - (Optional) Watch all participating source + imported files and recompile on change
 *
 * Key Concepts:
 *  bundle: {
 *    file: FileObject                // entry theme file
 *    source: object                  // raw parsed data (must contain `config`)
 *    result?: {
 *       output: object               // final theme JSON object
 *       importedFiles: FileObject[]  // secondary sources discovered during compile
 *       json: string                 // cached stringified theme (added post-compile)
 *    }
 *    watcher?: FSWatcher             // chokidar watcher in --watch mode
 *    hash?: string                   // sha256 of bundle.result.json (after compile)
 *    perf?: {                        // simple per-phase timing samples (numbers, ms, 1 decimal)
 *       load?: number[]
 *       compile?: number[]
 *       write?: number[]
 *    }
 * }
 *
 * NOTE: The --profile flag is currently parsed but not yet producing timing output
 * beyond the load phase stored in bundle.perf. Future enhancement could surface
 * per-phase timings (compile, write, etc.).
 */

import {program} from "commander"
import process from "node:process"
import {fileURLToPath,URL} from "node:url"
import chokidar from "chokidar"
import {createHash} from "node:crypto"
import {performance} from "node:perf_hooks"
import path from "node:path"

import * as File from "./components/File.js"
import Compiler from "./components/Compiler.js"
import FileObject from "./components/FileObject.js"
import DirectoryObject from "./components/DirectoryObject.js"
import AuntyError from "./components/AuntyError.js"
import Term from "./components/Term.js"

/**
 * Main application entry point.
 * Sets up command line interface, validates input files, and handles compilation.
 * Supports watch mode for automatic recompilation when files change.
 *
 * @returns {Promise<void>} Resolves when build process completes or exits on error.
 */

/*  =========================
    Main
    ========================= */

void (async function main() {
  // we need nerd mode info here so that it's available in 'catch'
  let nerdMode

  try {
    const cr = new DirectoryObject(fileURLToPath(new URL("..", import.meta.url)))
    const cwd = new DirectoryObject(process.cwd())
    const packageJson = new FileObject("package.json", cr)
    const packageJsonData = await File.loadDataFile(packageJson)
    setupCLI(packageJsonData)

    const options = program.opts()
    const inputArgs = program.processedArgs[0]

    nerdMode = options.nerd

    if(options.watch) {
      Term.status([
        ["info", "WATCH MODE"],
        "F5=recompile, q=quit"
      ], options)
      Term.info()
    }

    await Promise.allSettled(
      inputArgs.map(input => processTheme({input, cwd, options}))
    )
  } catch(e) {
    e instanceof AuntyError
      ? e.report(nerdMode)
      : Term.error(`\n${e.stack}`)

    process.exit(1)
  }
})()

/*  =========================
    CLI
    ========================= */

/**
 * Configure the Commander CLI using metadata from package.json.
 *
 * Options:
 *  -w, --watch       Recompile when any input or imported file changes
 *  -o, --output-dir  Directory to emit *.color-theme.json files (defaults to CWD)
 *  -n, --dry-run     Print compiled JSON to stdout; skip writing
 *  -p, --profile     (Reserved) Print phase timing information (partial support)
 *  <file...>         One or more theme source files (JSON5 / YAML)
 *
 * @param {object} pkg - Parsed package.json contents.
 */
function setupCLI(pkg) {
  program
    .name(pkg.name)
    .description(pkg.description)
    .version(pkg.version)
    .option("-w, --watch", "watch for changes")
    .option("-o, --output-dir <dir>", "specify an output directory")
    .option("-n, --dry-run", "print theme JSON to stdout; do not write files")
    .option("-s, --silent", "silent mode. only print errors or dry-run")
    .option("--nerd", "enable stack tracing for debug purposes when errors are thrown")
    .argument("<file...>", "one or more JSON5 or YAML files to compile (supports globs)")
    .parse()
}

/*  =========================
    Build phases
    ========================= */

/**
 * Orchestrates the compilation (and optional watching) of a single provided theme path.
 *
 * Steps:
 *  1. Validate the input file exists.
 *  2. Load it into a bundle (parse JSON5 / YAML) + record load time.
 *  3. Ensure output directory exists (or create it recursively).
 *  4. Perform compilation via inner `doItUp()` function (compile + write timings captured).
 *  5. In watch mode, establish a chokidar watcher across all involved files.
 *  6. Emit colourised status lines for each phase (load / compile / write).
 *
 * Perf Tracking:
 *  Each phase timing is appended (number milliseconds, 1 decimal) to an array at `bundle.perf.<phase>`.
 *  This allows ad‑hoc future aggregation (avg, p95, etc.) if desired.
 *
 * Resilience:
 *  Errors log and rethrow so Promise.allSettled can surface per-file failures without aborting others.
 *
 * @param {object} params - Parameter object.
 * @param {string} params.input - Input file path as provided on CLI (relative or absolute).
 * @param {DirectoryObject} params.cwd - Working directory object representing process.cwd().
 * @param {object} params.options - Parsed Commander options (watch, outputDir, dryRun, profile).
 * @returns {Promise<void>} Resolves when compile (and any initial watch setup) completes.
 */
async function processTheme({input, cwd, options}) {
  try {
    // Initial setup
    const file = new FileObject(input, cwd)
    const fname = file.path
    if(!await file.exists)
      throw new AuntyError(`No such file 🤷: ${fname}`)

    const {result: bundle, cost: loadCost} =
      await time(async() => loadThemeAsBundle(file))

    if(!bundle.source.config)
      throw new AuntyError(`Source file does not contain 'config' property: ${fname}`)

    bundle.perf = {
      load: [loadCost]
    }

    const loadedBytes = await File.fileSize(file)
    Term.status([
      ["success", rightAlignText(`${loadCost}ms`, 10)],
      `${bundle.file.module} loaded`,
      ["info", `${loadedBytes} bytes`],
    ], options)

    const outputDir = options.outputDir
      ? new DirectoryObject(options.outputDir)
      : cwd

    if(!await outputDir.exists)
      await File.assureDirectory(outputDir, {recursive: true})

    // Store stdin handler reference to avoid multiple listeners
    let stdinHandler = null

    /**
     * Execute a (re)compile cycle for the currently loaded bundle.
     * Handles: watcher suspension, bundle reset, compilation, hashing, write,
     * and watcher re-arming (if --watch). Safe to call repeatedly; reentrancy
     * is prevented via the `busy` flag.
     *
     * Internal logic relies on `bundle.source` being up-to-date. When the entry
     * file changes we reload its source prior to the next cycle.
     *
     * Side effects:
     *  - Mutates bundle.result, bundle.hash, bundle.perf.* arrays.
     *  - Attaches / reattaches bundle.watcher in watch mode.
     */
    async function doItUp() {
      if(doItUp.busy)
        return

      doItUp.busy = true

      try {
        // First, we pause because writing themes will trigger it again!
        if(bundle.watcher) {
          await bundle.watcher.close()
          bundle.watcher = null
        }

        resetBundle(bundle)

        const {cost: compileCost} =
          await time(async() => new Compiler().compile(bundle))

        Term.status([
          ["success", rightAlignText(`${compileCost.toLocaleString()}ms`, 10)],
          `${bundle.file.module} compiled`
        ], options)

        if(Array.isArray(bundle.perf.compile))
          bundle.perf.compile.push(compileCost)
        else
          bundle.perf.compile = [compileCost]

        bundle.result.json = `${JSON.stringify(bundle.result.output, null, 2)}\n`
        bundle.hash = hashOf(bundle.result.json)

        const {cost: writeCost, result: writeResult} =
        await time(async() => writeTheme(bundle, outputDir, options))

        const {state: writeState, bytes: writeBytes, fileName} = writeResult

        Term.status([
          ["success", rightAlignText(`${writeCost.toLocaleString()}ms`, 10)],
          `${fileName} <${writeState}>`,
          ["info", `${writeBytes.toLocaleString()} bytes`],
        ], options)

        if(Array.isArray(bundle.perf.write))
          bundle.perf.write.push(writeCost)
        else
          bundle.perf.write = [writeCost]

        // Watch mode
        if(options.watch) {
          const watchedFiles = getWatchedFiles(bundle)

          bundle.watcher = chokidar.watch(watchedFiles, {
            // Prevent watching own output files
            ignored: [fileName],
            // Add some stability options
            awaitWriteFinish: {
              stabilityThreshold: 100,
              pollInterval: 50
            }
          })

          bundle.watcher.on("change", async changed => {
            const relative = path.relative(process.cwd(), bundle.file.path)
            const changedPath = relative.startsWith("..")
              ? bundle.file.path
              : relative

            Term.status([
              ["modified", rightAlignText("CHANGED", 10)],
              changedPath,
              ["modified", bundle.file.module]
            ], options)

            if(changed === bundle.file.path) {
              const {cost: reloadCost, result: tempBundle} =
                await time(async() => loadThemeAsBundle(bundle.file))
              const reloadedBytes = await File.fileSize(bundle.file)

              bundle.source = tempBundle.source

              Term.status([
                ["success", rightAlignText(`${reloadCost.toLocaleString()}ms`, 10)],
                `${bundle.file.module} loaded`,
                ["info", `${reloadedBytes} bytes`],
              ], options)
            }

            doItUp()
          })

          // Only set up stdin handling once
          if(!options.silent && !stdinHandler) {
            process.stdin.setRawMode(true)
            process.stdin.resume()
            process.stdin.setEncoding("utf8")

            stdinHandler = key => {
              if(key === "q" || key === "\u0003") {
                // 'q' or Ctrl+C to exit
                Term.info("")
                Term.info("Stopped watching.")
                Term.info("Exiting.")

                // Clean up
                if(bundle.watcher) {
                  bundle.watcher.close()
                }

                if(stdinHandler) {
                  process.stdin.removeListener("data", stdinHandler)
                }

                process.exit(0)
              } else if(key === "r" || key === "\x1b[15~") {
                // F5 key sends escape sequence: \x1b[15~

                Term.status([
                  ["info", "REBUILDING"],
                  bundle.file.path
                ], options)

                if(bundle.watcher) {
                  bundle.watcher.close()
                  bundle.watcher = null
                }

                doItUp()
              }
            }

            process.stdin.on("data", stdinHandler)
          }
        }
      } catch(e) {
        const err = `Process theme: ${bundle.file.path}`
        throw e instanceof AuntyError
          ? e.addTrace(err)
          : AuntyError.from(e, err)

      } finally {
        doItUp.busy = false
      }
    }

    doItUp.busy = false
    await doItUp()

  } catch(e) {
    e instanceof AuntyError
      ? e.report(options.nerd)
      : Term.error(`\n${e.stack}`)
  }
}

/**
 * Load + parse a theme source file, returning an initial bundle skeleton.
 * (Timing is now handled outside this function by `time()`).
 *
 * @param {FileObject} file - Entry file to load.
 * @returns {Promise<{file: FileObject, source: object}>} Initial bundle (no perf/result yet).
 */
async function loadThemeAsBundle(file) {
  return {
    file,
    source: await File.loadDataFile(file)
  }
}

/*  =========================
    Write step
    ========================= */

/**
 * Write the compiled theme JSON to its destination file if bytes differ.
 *
 * Behavior:
 *  - Dry run: prints JSON to stdout (no write) and returns {state:"dry-run", bytes}.
 *  - Skip: on-disk hash matches freshly compiled hash -> {state:"skipped", bytes}.
 *  - Write: Write file -> {state:"written", bytes}.
 *
 * @param {object} bundle - Fully compiled bundle (must include result.json + hash).
 * @param {DirectoryObject} destDir - Output directory object.
 * @param {object} options - CLI options (dryRun etc.).
 * @returns {Promise<{state: 'dry-run'|'skipped'|'written', bytes: number}>} Result descriptor.
 */
async function writeTheme(bundle, destDir, options) {
  const fileName = `${bundle.file.module}.color-theme.json`
  const file = new FileObject(fileName, destDir)
  const output = bundle.result.json

  if(options.dryRun) {
    Term.log(output)
    return {state: "dry-run", bytes: output.length, fileName}
  }

  const nextHash = bundle.hash
  const lastHash = await file.exists
    ? hashOf(await File.readFile(file))
    : "kakadoodoo"

  // Skip identical bytes
  if(lastHash === nextHash)
    return {state: "skipped", bytes: output.length, fileName}

  // Real write (timed)
  await File.writeFile(file, `${output}`)

  return {state: "written", bytes: output.length, fileName}
}

/*  =========================
    Helpers
    ========================= */

/**
 * Force a fresh compile by removing any previous `result` field.
 *
 * @param {object} bundle - Mutable bundle object.
 */
function resetBundle(bundle) {
  delete bundle.result
}

/**
 * Collect all participating file paths for a bundle (entry + imported).
 *
 * @param {object} bundle - Compiled bundle with `result.importedFiles`.
 * @returns {string[]} Absolute file system paths.
 */
function getAllThemeFiles(bundle) {
  return [
    bundle.file.path,
    ...bundle.result.importedFiles.map(imported => imported.path),
  ]
}

/**
 * Derive unique set of files to be watched for changes.
 *
 * @param {object} fileMap - Bundle object.
 * @returns {string[]} Distinct absolute paths.
 */
function getWatchedFiles(fileMap) {
  return [...new Set(getAllThemeFiles(fileMap))]
}

/**
 * Right-align a string inside a fixed width (left pad with spaces).
 * If the string exceeds width it is returned unchanged.
 *
 * @param {string|number} text - Text to align.
 * @param {number} width - Target field width (default 80).
 * @returns {string} Padded string.
 */
function rightAlignText(text, width=80) {
  const work = String(text)

  if(work.length > width)
    return work

  const diff = width-work.length

  return `${" ".repeat(diff)}${work}`
}

/**
 * Compute sha256 hash (hex) of the provided string.
 *
 * @param {string} s - Input string.
 * @returns {string} 64-char hexadecimal digest.
 */
function hashOf(s) {
  return createHash("sha256").update(s).digest("hex")
}

/**
 * Measure wall-clock time for an async function.
 *
 * @template T
 * @param {() => Promise<T>} fn - Thunk returning a promise.
 * @returns {Promise<{result: T, cost: number}>} Object containing result and elapsed ms (number, 1 decimal).
 */
async function time(fn) {
  const t0 = performance.now()
  const result = await fn()
  const cost = Math.round((performance.now() - t0) * 10) / 10

  return {result, cost}
}
