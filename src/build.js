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

import * as fd from "./components/File.js"
import Compiler from "./components/Compiler.js"

/**
 * Main application entry point.
 * Sets up command line interface, validates input files, and handles compilation.
 * Supports watch mode for automatic recompilation when files change.
 */

;(async() => {
  try {
    const cr = await fd.resolveDirectory(fileURLToPath(new URL("..", import.meta.url)))
    const cwd = await fd.resolveDirectory(process.cwd())
    const packageJson = await fd.loadDataFile(await fd.resolveFilename("package.json", cr))

    /**
     * Composes a filename with the current working directory.
     * Used by commander.js to process file arguments.
     *
     * @param {string} file - The input filename
     * @param {Array} acc - Accumulator array for collecting composed filenames
     * @returns {Array} Array of composed filenames
     */
    const compose = (file, acc = []) => [...acc, fd.composeFilename(file, cwd)]

    program
      .name(packageJson.name)
      .description(packageJson.description)
      .version(packageJson.version)
      .option("-w, --watch", "watch for changes")
      .option("-o <dir>, --output-dir <dir>", "specify an output directory")
      .argument("<file...>", "one or more JSON5 or YAML files to compile (supports glob patterns)", compose)
      .parse()

    const options = program.opts()
    const files = program.processedArgs[0]

    const invalidFilenames =
      (await Promise.all(
        files.map(async f => Object.assign(f, {exists: await fd.fileExists(f)}))
      ))
        .filter(f => !f.exists)

    if(invalidFilenames.length > 0) {
      throw new Error(composeMessage(
        "One or more files could not be found:\n",
        invalidFilenames,
        f => f.path
      ))
    }

    await Promise.all(files.map(async file =>
      Object.assign(file, {source: await fd.loadDataFile(file)})
    ))

    const invalidSources = files.filter(file => !("config" in file.source))
    if(invalidSources.length > 0) {
      throw new Error(composeMessage(
        "Missing config property from one more more files:\n",
        invalidSources,
        f => f.path
      ))
    }

    /* ************************************************************************
     * If you are new here, this simple-looking call, all cute and just sitting
     * here all minimal-looking and innocuous? It's the fucking engine that
     * drives the entire process.
     *
     * You don't want to miss the show. If you ignore everything else, this
     * is the meat. Unless you're a vegan. In which, I have nfi ... uhh this
     * is... the uhm ... pulpy.. fibrous centre? (Nailed it!)
     *
     * So yea, enjoy the show. Have fun. Drive safe. Don't taunt Happy Fun
     * Ball.
     */
    await compile(files)

    if(options.watch !== true)
      return

    if(options.watch === true) {
      const startWatching = getWatchedFiles(files)
      const watcher = chokidar.watch(startWatching)

      watcher.on("change", recompile.bind(null, watcher))
    }

    /**
     * Compiles theme files and writes the resulting theme files to disk.
     *
     * @param {Array<object>} files - Array of file objects containing source data and metadata
     * @returns {Promise<void>}
     */
    async function compile(files) {
      await Promise.all(files.map(Compiler.compile))
      await Promise.all(files.map(writeTheme))
    }

    /**
     * Recompiles theme files when changes are detected in watch mode.
     * Updates file watchers to include any newly imported files.
     *
     * @param {object} watcher - The chokidar file system watcher instance
     * @param {string} file - Path to the file that changed
     * @returns {Promise<void>}
     */
    async function recompile(watcher, file) {
      console.info(`\n==[ '${file} changed. Recompiling. ]==\n`)

      const oldWatching = watcher.getWatched()
      const composed = Object.keys(oldWatching).reduce((acc, curr) => {
        const recomposed = oldWatching[curr].map(f => `${curr}/${f}`)

        return [...acc, ...recomposed]
      }, [])

      watcher.unwatch(composed)
      watcher.add(getWatchedFiles(files))

      files.map(resetFileMap)

      await compile(files)
    }

    /**
     * Writes a compiled theme to a JSON file.
     * Creates a VS Code color theme file with proper formatting.
     *
     * @param {object} theme - The compiled theme object containing result data
     * @returns {Promise<void>}
     */
    async function writeTheme(theme) {
      const destDir = options.o
        ? fd.composeDirectory(options.o)
        : cwd

      if(!destDir?.absolutePath)
        throw new Error("Problems determining destination directory.")

      await fd.assureDirectory(destDir.absolutePath)
      const fileName = `${theme.module}.color-theme.json`
      const file = fd.composeFilename(fileName, destDir)
      const output = `${JSON.stringify(theme.result.output, null, 2)}\n`
      await fd.writeFile(file, output)

      console.info(`${file.path} written.`)
    }

    /**
     * Resets the compilation result data from a file map object.
     * Removes cached compilation results to force recompilation.
     *
     * @param {object} fileMap - The file map object to reset
     * @returns {void}
     */
    function resetFileMap(fileMap) {
      delete fileMap.result
    }

    /**
     * Collects all theme files including imported dependencies.
     * Returns a flat array of all files that are part of the theme compilation.
     *
     * @param {Array<object>} fileMaps - Array of file map objects containing theme data
     * @returns {Array<string>} Array of file paths
     */
    function getAllThemeFiles(fileMaps) {
      return fileMaps
        .flatMap(f => [
          f.path,
          ...f.result.importedFiles.map(imported => imported.path)
        ])
    }

    /**
     * Gets a unique list of files to watch for changes.
     * Deduplicates file paths from all theme files and their dependencies.
     *
     * @param {Array<object>} fileMaps - Array of file map objects containing theme data
     * @returns {Array<string>} Array of unique file paths to watch
     */
    function getWatchedFiles(fileMaps) {
      return [...new Set(getAllThemeFiles(fileMaps))].flatMap(e => e)
    }

    /**
     * Composes an error message with formatted file list.
     * Combines a message prefix with a formatted list of files.
     *
     * @param {string} message - The message prefix to display
     * @param {Array<object>} fileMaps - Array of file map objects to format
     * @param {Function} trans - Transform function to extract display value from file objects
     * @returns {string} The formatted error message
     */
    function composeMessage(message, fileMaps, trans) {
      return `${message}\n${formatFiles(fileMaps,trans)}`
    }

    /**
     * Formats an array of file objects into a readable list.
     * Transforms each file object using the provided function and formats as a list.
     *
     * @param {Array<object>} fileMaps - Array of file map objects to format
     * @param {Function} trans - Transform function to extract display value from file objects
     * @returns {string} The formatted file list
     */
    function formatFiles(fileMaps, trans) {
      return fileMaps.map(f => ` => ${trans(f)}`).join("\n")
    }
  } catch(err) {
    console.error(`\n${err.stack}`)
    process.exit(1)
  }
})()
