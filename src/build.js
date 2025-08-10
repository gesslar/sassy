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

import * as File from "./components/File.js"
import Compiler from "./components/Compiler.js"
import FileObject from "./components/FileObject.js"
import DirectoryObject from "./components/DirectoryObject.js"

/**
 * Main application entry point.
 * Sets up command line interface, validates input files, and handles compilation.
 * Supports watch mode for automatic recompilation when files change.
 */

;(async() => {
  try {
    const cr = new DirectoryObject(fileURLToPath(new URL("..", import.meta.url)))
    const cwd = new DirectoryObject(process.cwd())
    const packageJson = new FileObject("package.json", cr)
    const packageJsonData = await File.loadDataFile(packageJson)

    /**
     * Composes a filename with the current working directory.
     * Used by commander.js to process file arguments.
     *
     * @param {string} file - The input filename
     * @param {Array} acc - Accumulator array for collecting composed filenames
     * @returns {Array} Array of composed filenames
     */
    program
      .name(packageJsonData.name)
      .description(packageJsonData.description)
      .version(packageJsonData.version)
      .option("-w, --watch", "watch for changes")
      .option("-o <dir>, --output-dir <dir>", "specify an output directory")
      .argument("<file...>", "one or more JSON5 or YAML files to compile (supports glob patterns)")
      .parse()

    const options = program.opts()
    const processedArgs = program.processedArgs[0]

    // Transform pipeline. A bit declarative, but it's all right because it
    // makes it cleaner to read and visually process.
    const files = processedArgs.map(f => new FileObject(f, cwd))

    const invalidFilenames = (await Promise.all(files
      .map(async file => ({file, exists: await file.exists}))))
      .filter(result => !(result.exists && result.file.isFile))
      .map(result => result.file.path)

    if(invalidFilenames.length > 0) {
      throw new Error(composeMessage(
        "One or more files could not be found:\n",
        invalidFilenames,
        f => f
      ))
    }

    const bundles = await Promise.all(files.map(async file => {
      return {file, source: await File.loadDataFile(file)}
    }))

    const invalidContent = bundles.filter(bundle => !("config" in bundle.source))

    if(invalidContent.length > 0) {
      throw new Error(composeMessage(
        "Missing config property from one more more files:\n",
        invalidContent,
        bundle => bundle.file.path
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
    await compile(bundles)

    if(options.watch !== true)
      return

    if(options.watch === true) {
      const startWatching = getWatchedFiles(bundles)
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

      const destDir = options.o
        ? new DirectoryObject(options.o)
        : cwd

      await File.assureDirectory(destDir)

      if(!(await destDir.exists))
        throw new Error("Problems determining destination directory.")

      await Promise.all(files.map(theme => writeTheme(theme, destDir)))
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
      watcher.add(getWatchedFiles(bundles))

      bundles.map(resetFileMap)

      await compile(bundles)
    }

    /**
     * Writes a compiled theme to a JSON file.
     * Creates a VS Code color theme file with proper formatting.
     *
     * @param {object} theme - The compiled theme object containing result data
     * @param {DirectoryObject} destDir - The destination directory
     * @returns {Promise<void>}
     */
    async function writeTheme(theme, destDir) {
      const fileName = `${theme.file.module}.color-theme.json`
      const file = new FileObject(fileName, destDir)
      const output = `${JSON.stringify(theme.result.output, null, 2)}\n`
      await File.writeFile(file, output)

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
          f.file.path,
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
