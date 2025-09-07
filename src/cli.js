#!/usr/bin/env node

/**
 * @file Aunty Rose theme compiler CLI.
 *
 * Responsibilities:
 *  - Parse CLI arguments (supports JSON5 / YAML theme entries, globs resolved externally by the shell)
 *  - Create Theme instances for compilation units
 *  - Delegate compilation to Theme.build() which internally uses Compiler.compile()
 *  - Write (or print with --dry-run) the resulting VS Code colour theme JSON
 *  - Prevent unnecessary writes by hashing previous output
 *  - (Optional) Watch all participating source + imported files and recompile on change
 *
 * Key Concepts:
 *  Theme: {
 *    sourceFile: FileObject          // entry theme file
 *    source: object                  // raw parsed data (must contain `config`)
 *    output: object                  // final theme JSON object
 *    dependencies: FileObject[]      // secondary sources discovered during compile
 *    lookup: object                  // variable lookup data for compilation
 *    breadcrumbs: Map                // variable resolution tracking
 *  }
 *
 * The Theme class manages its complete lifecycle:
 *  - load() - loads and parses the source file
 *  - build() - compiles the theme via Compiler
 *  - write() - outputs the compiled theme to file or stdout
 *  - Internal watch mode support with chokidar integration
 *
 * NOTE: The --profile flag is currently parsed but not yet producing timing output.
 * Future enhancement could surface per-phase timings (load, compile, write, etc.).
 */

import {program} from "commander"
import process from "node:process"
import {fileURLToPath, URL} from "node:url"

import AuntyError from "./components/AuntyError.js"
import BuildCommand from "./BuildCommand.js"
import AuntyCache from "./components/AuntyCache.js"
import DirectoryObject from "./components/DirectoryObject.js"
import FileObject from "./components/FileObject.js"
import LintCommand from "./LintCommand.js"
import ResolveCommand from "./ResolveCommand.js"
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
  const auntyRoseOptions = {}

  setupAbortHandlers()

  try {
    const cache = new AuntyCache()
    const cr = new DirectoryObject(fileURLToPath(new URL("..", import.meta.url)))
    const cwd = new DirectoryObject(process.cwd())
    const packageJson = new FileObject("package.json", cr)
    const pkgJsonResult = await cache.loadCachedData(packageJson)
    const pkgJson = pkgJsonResult

    // These are available to all subcommands in addition to whatever they
    // provide.
    const alwaysAvailable = {
      "nerd": ["--nerd", "enable stack tracing for debug purposes when errors are thrown"]
    }

    program
      .name(pkgJson.name)
      .description(pkgJson.description)
      .version(pkgJson.version)

    // Add the build subcommand
    const buildCommand = new BuildCommand({cwd, packageJson: pkgJson})
    buildCommand.cache = cache

    void(await buildCommand.buildCli(program))
      .addCliOptions(alwaysAvailable, false)

    // Add the resolve subcommand
    const resolveCommand = new ResolveCommand({cwd, packageJson: pkgJson})
    resolveCommand.cache = cache

    void(await resolveCommand.buildCli(program))
      .addCliOptions(alwaysAvailable, false)

    // Add the lint subcommand
    const lintCommand = new LintCommand({cwd, packageJson: pkgJson})
    lintCommand.cache = cache

    void(await lintCommand.buildCli(program))
      .addCliOptions(alwaysAvailable, false)

    // Let'er rip, bitches! VROOM VROOM, motherfucker!!
    await program.parseAsync()

  } catch(error) {
    AuntyError.new("Starting Aunty Rose.", error)
      .report(auntyRoseOptions.nerd || true)

    process.exit(1)
  }

  /**
   * Creates handlers for various reasons that the application may crash.
   */
  function setupAbortHandlers() {
    void["SIGINT", "SIGTERM", "SIGHUP"].forEach(signal => {
      process.on(signal, async() => {
        Term.log(`Received ${signal}, performing graceful shutdown...`)
        await Term.resetTerminal()
        process.exit(0)
      })
    })
  }
})()
