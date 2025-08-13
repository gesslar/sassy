#!/usr/bin/env node

/**
 * @file Build script for Aunty Rose theme compiler.
 * This script compiles JSON5 or YAML theme files into VS Code color themes.
 * Supports watch mode for automatic recompilation on file changes.
 */

import {program} from "commander"
import console from "node:console"
import process from "node:process"
import {fileURLToPath,URL} from "node:url"
import chokidar from "chokidar"
import {FSWatcher} from "chokidar"
import {createHash} from "node:crypto"
import {performance} from "node:perf_hooks"

import * as File from "./components/File.js"
import Compiler from "./components/Compiler.js"
import FileObject from "./components/FileObject.js"
import DirectoryObject from "./components/DirectoryObject.js"

/**
 * Main application entry point.
 * Sets up command line interface, validates input files, and handles compilation.
 * Supports watch mode for automatic recompilation when files change.
 *
 * @returns {Promise<void>} Resolves when build process completes or exits on error.
 */

/* =========================
   Main
   ========================= */

void (async function main() {
  try {
    const cr = new DirectoryObject(fileURLToPath(new URL("..", import.meta.url)))
    const cwd = new DirectoryObject(process.cwd())
    const packageJson = new FileObject("package.json", cr)
    const packageJsonData = await File.loadDataFile(packageJson)

    // in-memory output hash cache (survives watch runs in this process)
    const lastHash = new Map()

    setupCLI(packageJsonData)

    const options = program.opts()
    const inputArgs = program.processedArgs[0]
    const files = inputArgs.map(f => new FileObject(f, cwd))

    // Validate file existence & type
    const invalid = (
      await Promise.all(files.map(async file => ({
        file,
        exists: await file.exists
      })))
    )
      .filter(r => !(r.exists && r.file.isFile))
      .map(r => r.file.path)

    if(invalid.length) {
      throw new Error(
        composeMessage("One or more files could not be found:", invalid, f => f),
      )
    }

    // Load sources (parallel)
    const bundles = await loadAll(files, options)

    // Basic content validation
    const missingConfig = bundles.filter(bundle => !("config" in bundle.source))
    if(missingConfig.length) {
      throw new Error(
        composeMessage(
          "Missing config property from one or more files:",
          missingConfig,
          b => b.file.path
        )
      )
    }

    // First compile
    await compileAll(bundles, options)
    // Output!
    await writeAll(bundles, options, cwd, lastHash)

    // Watch mode
    if(options.watch) {
      const watcher = chokidar.watch(getWatchedFiles(bundles))
      watcher.on("change", changedPath => recompile(
        watcher,
        bundles,
        cwd,
        options,
        lastHash,
        changedPath
      ))
    }
  } catch(err) {
    warn(`\n${err.stack}`)
    process.exit(1)
  }
})()

/* =========================
   CLI
   ========================= */

/**
 * Sets up the CLI based on the information from the app's package.json.
 * Configures command-line options and arguments using Commander.
 *
 * @param {object} pkg - The loaded package.json data.
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

/* =========================
   Build phases
   ========================= */


/**
 * Loads all theme source files in parallel and returns their bundles.
 * Uses timing utility to measure load duration.
 *
 * @param {Array<FileObject>} files - Array of file objects to load.
 * @param {object} options - CLI options for build process.
 * @returns {Promise<Array<object>>} Array of loaded bundle objects.
 */
async function loadAll(files, options) {
  return await time(
    "Loaded source files",
    () => Promise.all(files.map(loadThemeAsBundle)),
    options.profile
  )
}

/**
 * Loads a single theme file and returns its bundle object.
 *
 * @param {FileObject} file - File object to load.
 * @returns {Promise<object>} Bundle object with file and source data.
 */
async function loadThemeAsBundle(file) {
  return {
    file,
    source: await File.loadDataFile(file)
  }
}

/**
 * Writes all theme bundles to disk in parallel.
 * Uses timing utility to measure write duration.
 *
 * @async
 * @param {Array<object>} bundles - Array of bundle objects to write.
 * @param {object} opts - CLI options for build process.
 * @param {DirectoryObject} cwd - Current working directory object.
 * @param {Map<string, string>} lastHash - Output hash cache.
 * @returns {Promise<void>} Resolves when all bundles are written.
 */
async function writeAll(bundles, opts, cwd, lastHash) {
  // Destination
  const dest = await assureDest(
    opts.outputDir ? new DirectoryObject(opts.outputDir) : cwd,
  )

  // Write (parallel).
  await time(
    "Generated theme JSON files",
    () => Promise.all(bundles.map(b => writeTheme(b, dest, opts, lastHash))),
    opts.profile
  )
}

/**
 * Compiles all theme bundles and writes output files.
 * Measures and logs timing for compile and write phases.
 *
 * @param {Array<object>} bundles - Array of bundle objects containing file and source data.
 * @param {object} opts - CLI options for build process.
 * @returns {Promise<void>} Resolves when all bundles are compiled and written.
 */
async function compileAll(bundles, opts) {
  // Compile (parallel; each task logs its own duration)
  await time("Compiled theme files",
    () => Promise.all(bundles.map(b => Compiler.compile(b))),
    opts.profile
  )
}

/**
 * Recompiles all theme bundles when a watched file changes.
 * Refreshes the file watcher, resets bundle results, and triggers a full compile.
 *
 * @param {FSWatcher} watcher - Chokidar watcher instance monitoring file changes.
 * @param {Array<object>} bundles - Array of bundle objects containing file and source data.
 * @param {DirectoryObject} cwd - Current working directory object.
 * @param {object} opts - CLI options for build process.
 * @param {Map<string, string>} lastHash - Cache of previous output hashes for change detection.
 * @param {string} changedPath - Path to the file that triggered recompilation.
 * @returns {Promise<void>} Resolves when recompilation is complete.
 */
async function recompile(watcher, bundles, cwd, opts, lastHash, changedPath) {
  info(`\n==[ '${changedPath}' changed. Recompiling. ]==\n`)

  // Refresh watched files: flatten chokidar's map back to absolute paths
  const watched = watcher.getWatched()
  const current = Object.keys(watched).reduce((acc, dir) => {
    const files = watched[dir].map(f => `${dir}/${f}`)
    return acc.concat(files)
  }, [])

  watcher.unwatch(current)
  watcher.add(getWatchedFiles(bundles))

  // Drop previous compile results so we re-evaluate
  bundles.forEach(resetBundle)

  await compileAll(bundles, opts)
}

/* =========================
   Write step
   ========================= */

/**
 * Writes a compiled theme bundle to disk if output has changed.
 * Skips writing if output is unchanged, supports dry-run mode.
 *
 * @param {object} bundle - Bundle object containing file and result data.
 * @param {DirectoryObject} destDir - Destination directory object.
 * @param {object} options - CLI options for build process.
 * @param {Map<string, string>} lastHash - Output hash cache.
 * @returns {Promise<string>} Path to written file or dry-run path.
 */
async function writeTheme(bundle, destDir, options, lastHash) {
  const fileName = `${bundle.file.module}.color-theme.json`
  const file = new FileObject(fileName, destDir)
  const output = JSON.stringify(bundle.result.output, null, 2)

  if(options.dryRun) {
    // Print the JSON and return
    console.log(output)
    return file.path ?? "(dry-run)"
  }

  // Seed previous hash from memory or disk (once)
  const nextHash = hashOf(output)
  let prevHash = lastHash.get(file.path)

  if(!prevHash) {
    const exists = await file.exists
    if(exists) {
      const curr = await File.readFile(file)
      prevHash = hashOf(curr)
      lastHash.set(file.path, prevHash)
    }
  }

  // Skip identical bytes
  if(prevHash === nextHash) {
    info(`${file.path} unchanged (compiled; skipped write)`)
    return file.path
  }

  // Real write (timed)
  await File.writeFile(file, output)
  lastHash.set(file.path, nextHash)
  info(`${file.path} written`)

  return file.path
}

/* =========================
   Helpers
   ========================= */

/**
 * Removes the result property from a bundle object to force recompilation.
 *
 * @param {object} bundle - Bundle object to reset.
 */
function resetBundle(bundle) {
  delete bundle.result
}

/**
 * Returns all theme and imported file paths from file maps.
 *
 * @param {Array<object>} fileMaps - Array of file map objects.
 * @returns {Array<string>} List of file paths.
 */
function getAllThemeFiles(fileMaps) {
  return fileMaps.flatMap(f => [
    f.file.path,
    ...f.result.importedFiles.map(imp => imp.path),
  ])
}

/**
 * Returns a deduplicated list of all theme and imported files to watch.
 *
 * @param {Array<object>} fileMaps - Array of file map objects.
 * @returns {Array<string>} List of watched file paths.
 */
function getWatchedFiles(fileMaps) {
  return [...new Set(getAllThemeFiles(fileMaps))]
}

/**
 * Logs informational messages to the console.
 *
 * @param {string} msg - Message to log.
 */
function info(msg) {
  console.log(msg)
}
/**
 * Logs warning or error messages to the console.
 *
 * @param {string} msg - Message to log.
 */
function warn(msg) {
  console.warn(msg)
}

/**
 * Generates a SHA-256 hash of the given string.
 *
 * @param {string} s - Input string to hash.
 * @returns {string} Hexadecimal hash string.
 */
function hashOf(s) {
  return createHash("sha256").update(s).digest("hex")
}

/**
 * Measures and logs the execution time of an async function.
 *
 * @param {string} label - Label for timing output.
 * @param {Function} fn - Async function to execute and time.
 * @param {boolean} profile - Whether to log timing info.
 * @returns {Promise<*>} Result of the async function.
 */
async function time(label, fn, profile) {
  const t0 = performance.now()
  const res = await fn()
  if(profile) info(`${label}: ${(performance.now() - t0).toFixed(1)}ms`)

  return res
}

/**
 * Composes a formatted message with a prefix and a list of items.
 *
 * @param {string} prefix - Message prefix.
 * @param {Array} items - List of items to format.
 * @param {Function} transform - Function to transform each item for display.
 * @returns {string} Formatted message string.
 */
function composeMessage(prefix, items, transform) {
  return `${prefix}\n${formatFiles(items, transform)}`
}

/**
 * Formats a list of items using a transform function for display.
 *
 * @param {Array} items - List of items to format.
 * @param {Function} transform - Function to transform each item.
 * @returns {string} Formatted string of items.
 */
function formatFiles(items, transform) {
  return items.map(x => ` => ${transform(x)}`).join("\n")
}

/**
 * Ensures the destination directory exists and is accessible.
 * Throws an error if the directory cannot be determined.
 *
 * @param {DirectoryObject} dirLike - Directory object to assure.
 * @returns {Promise<DirectoryObject>} The assured directory object.
 */
async function assureDest(dirLike) {
  await File.assureDirectory(dirLike)
  if(!(await dirLike.exists)) {
    throw new Error("Problems determining destination directory.")
  }

  return dirLike
}
