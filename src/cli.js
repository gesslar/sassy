#!/usr/bin/env node

/**
 * @file Aunty Rose theme compiler CLI.
 *
 * Responsibilities:
 *  - Parse CLI arguments (supports JSON5 / YAML theme entries, globs resolved externally by the shell)
 *  - Create Theme instances for compilation units
 *  - Delegate compilation to Theme.build() which internally uses Compiler.compile()
 *  - Write (or print with --dry-run) the resulting VS Code color theme JSON
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
import {fileURLToPath,URL} from "node:url"

import * as File from "./components/File.js"
import FileObject from "./components/FileObject.js"
import DirectoryObject from "./components/DirectoryObject.js"
import AuntyError from "./components/AuntyError.js"
import BuildCommand from "./BuildCommand.js"
import ResolveCommand from "./ResolveCommand.js"

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

  try {
    const cr = new DirectoryObject(fileURLToPath(new URL("..", import.meta.url)))
    const cwd = new DirectoryObject(process.cwd())
    const packageJson = new FileObject("package.json", cr)
    const pkgJson = await File.loadDataFile(packageJson)

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

    void(await buildCommand.buildCli(program))
      .addCliOptions(alwaysAvailable, false)

    // Add the resolve subcommand
    const resolvecommand = new ResolveCommand({cwd, packageJson: pkgJson})

    void(await resolvecommand.buildCli(program))
      .addCliOptions(alwaysAvailable, false)


    // Let'er rip, bitches! VROOM VROOM, motherfucker!!
    program.parse()
  } catch(e) {
    e instanceof AuntyError
      ? e.report(auntyRoseOptions.nerd)
      : AuntyError.from(e, "Starting Aunty Rose").report(auntyRoseOptions.nerd || true)


    process.exit(1)
  }
})()
