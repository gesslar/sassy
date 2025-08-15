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
import console from "node:console"
import process from "node:process"
import {fileURLToPath,URL} from "node:url"
import chokidar from "chokidar"
import {createHash} from "node:crypto"
import {performance} from "node:perf_hooks"
import ansiColors from "ansi-colors"
import colorSupport from "color-support"

import * as File from "./components/File.js"
import Compiler from "./components/Compiler.js"
import FileObject from "./components/FileObject.js"
import DirectoryObject from "./components/DirectoryObject.js"

// Required everywhere. Will modularise this kind of thing later.
ansiColors.enabled = colorSupport.hasBasic
ansiColors.alias("success", ansiColors.green)
ansiColors.alias("success-bracket", ansiColors.greenBright)
ansiColors.alias("info", ansiColors.cyan)
ansiColors.alias("info-bracket", ansiColors.cyanBright)
ansiColors.alias("warn", ansiColors.yellow)
ansiColors.alias("warn-bracket", ansiColors.yellow.dim)
ansiColors.alias("error", ansiColors.redBright)
ansiColors.alias("error-bracket", ansiColors.redBright.dim)
ansiColors.alias("modified", ansiColors.magentaBright)
ansiColors.alias("modified-bracket", ansiColors.magenta)

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
  try {
    const cr = new DirectoryObject(fileURLToPath(new URL("..", import.meta.url)))
    const cwd = new DirectoryObject(process.cwd())
    const packageJson = new FileObject("package.json", cr)
    const packageJsonData = await File.loadDataFile(packageJson)

    setupCLI(packageJsonData)

    const options = program.opts()
    const inputArgs = program.processedArgs[0]

    await Promise.allSettled(
      inputArgs.map(input => processTheme({input, cwd, options}))
    )
  } catch(err) {
    warn(`\n${err.stack}`)
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
    .option("-p, --profile", "print phase timing")
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
      throw new Error(`No such file: ${fname}`)

    const {result: bundle, cost: loadCost} =
      await time(async() => loadThemeAsBundle(file))

    if(!bundle.source.config)
      throw new Error(`Source file does not contain 'config' property: ${fname}`)

    bundle.perf = {
      load: [loadCost]
    }

    const loadedBytes = await File.fileSize(file)

    statusMessage([
      ["success", rightAlignText(`${loadCost}ms`, 9)],
      `${bundle.file.module} loaded`,
      ["info", `${loadedBytes} bytes`],
    ])

    const outputDir = options.outputDir
      ? new DirectoryObject(options.outputDir)
      : cwd

    if(!await outputDir.exists)
      await File.assureDirectory(outputDir, {recursive: true})

    // Now, we do stuff!

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
        // Probably? idk, I think so. Anyway, it's safe!
        if(bundle.watcher) {
          await bundle.watcher.close()
          bundle.watcher = null
        }

        resetBundle(bundle)

        const {cost: compileCost} =
          await time(async() => Compiler.compile(bundle))

        statusMessage([
          ["success", rightAlignText(`${compileCost.toLocaleString()}ms`, 9)],
          `${bundle.file.module} compiled`
        ])

        if(Array.isArray(bundle.perf.compile))
          bundle.perf.compile.push(compileCost)
        else
          bundle.perf.compile = [compileCost]

        bundle.result.json = JSON.stringify(bundle.result.output, null, 2)

        bundle.hash = hashOf(bundle.result.json)

        const {cost: writeCost, result: writeResult} =
        await time(async() => writeTheme(bundle, outputDir, options))

        const {state: writeState, bytes: writeBytes, fileName} = writeResult

        statusMessage([
          ["success", rightAlignText(`${writeCost.toLocaleString()}ms`, 9)],
          `${fileName} <${writeState}>`,
          ["info", `${writeBytes.toLocaleString()} bytes`],
        ])

        if(Array.isArray(bundle.perf.write))
          bundle.perf.write.push(writeCost)
        else
          bundle.perf.write = [writeCost]

        // Watch mode
        if(options.watch) {
          bundle.watcher = chokidar.watch(getWatchedFiles(bundle))
          bundle.watcher.on("change", async changed => {
            statusMessage([
              ["modified", rightAlignText("CHANGED", 9)],
              changed,
              ["modified", bundle.file.module]
            ])

            if(changed === bundle.file.path) {
              const tempBundle = await loadThemeAsBundle(bundle.file)
              bundle.source = tempBundle.source

              const reloadedBytes = await File.fileSize(bundle.file.path)

              statusMessage([
                ["success", rightAlignText(`${loadCost}ms`, 9)],
                `${bundle.file.module} loaded`,
                ["info", `${reloadedBytes} bytes`],
              ])
            }

            doItUp()
          })
        }
      } finally {
        doItUp.busy = false
      }
    }

    doItUp.busy = false
    await doItUp()

  } catch(e) {
    error(e.message, e.stack)
    throw e
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
    console.log(output)
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
  await File.writeFile(file, output)

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
 * Emit a formatted status message.
 * Accepts either a simple string, or an array of segments where each segment is:
 *  - string (emitted as-is) OR
 *  - [level, text] where level corresponds to an ansiColors alias (e.g. success, info, warn, error).
 *
 * @param {string | Array<string | [string,string]>} args - Message spec.
 * @returns {void}
 */
function statusMessage(args) {
  if(typeof args === "string")
    return info(args)

  if(Array.isArray(args)) {
    const message = args
      .map(curr => {
        // Bracketed
        if(Array.isArray(curr)) {
          if(!curr.every(e => typeof e === "string"))
            throw new TypeError("Each element of a message array must be a string.")

          // Ok, now build it; 0 = the level, 1 = the string
          const [level, text] = curr
          return "" +
              ansiColors[`${level}-bracket`]("[")
            + ansiColors[level](text)
            + ansiColors[`${level}-bracket`]("]")
        }

        // Plain string, no decoration
        if(typeof curr === "string")
          return curr
      })
      .join(" ")

    return statusMessage(message)
  }

  throw new TypeError("Invalid arguments passed to statusMessage")
}

/**
 * Log an informational message.
 *
 * @param {...any} arg - Values to log.
 */
function info(...arg) {
  console.info(...arg)
}

/**
 * Log a warning message.
 *
 * @param {any} msg - Warning text / object.
 */
function warn(msg) {
  console.warn(msg)
}

/**
 * Log an error message (plus optional details).
 *
 * @param {...any} arg - Values to log.
 */
function error(...arg) {
  console.error(...arg)
}
/**
 * Log a debug message (no-op unless console.debug provided/visible by env).
 *
 * @param {...any} arg - Values to log.
 */
function _debug(...arg) { // prefixed underscore to satisfy unused var lint rule
  console.debug(...arg)
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
