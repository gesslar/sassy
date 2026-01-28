#!/usr/bin/env node

/**
 * @file Sassy theme compiler CLI.
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
import url from "node:url"
import c from "@gesslar/colours"

import {Cache, DirectoryObject, FileObject, Sass, Term} from "@gesslar/toolkit"
import BuildCommand from "./BuildCommand.js"
import LintCommand from "./LintCommand.js"
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
  const sassyOptions = {}

  setupAbortHandlers()

  try {
    // setup the colour aliases
    // Term status stuff
    c.alias.set("success", "{F070}")
    c.alias.set("success-bracket", "{F076}")
    c.alias.set("info", "{F038}")
    c.alias.set("info-bracket", "{F087}")
    c.alias.set("warn", "{F215}")
    c.alias.set("warn-bracket", "{F208}")
    c.alias.set("error", "{F196}")
    c.alias.set("error-bracket", "{F160}")
    c.alias.set("modified", "{F127}")
    c.alias.set("modified-bracket", "{F165}")
    c.alias.set("muted", "{F240}")
    c.alias.set("muted-bracket", "{F244}")

    // Lint command
    c.alias.set("context", "{F159}")
    c.alias.set("loc", "{F148}")

    // Resolve command
    c.alias.set("head", "{F220}")
    c.alias.set("leaf", "{F151}")
    c.alias.set("func", "{F111}")
    c.alias.set("parens", "{F098}")
    c.alias.set("line", "{F142}")
    c.alias.set("hex", "{F140}")
    c.alias.set("hash", "{F147}{<B}")
    c.alias.set("hexAlpha", "{F127}{<I}")
    c.alias.set("arrow", "{F033}")

    const cache = new Cache()
    const cwd = DirectoryObject.fromCwd()
    const packageJson = new FileObject(
      "package.json",
      url.fileURLToPath(new url.URL("..", import.meta.url))
    )
    const pkgJson = await packageJson.loadData()

    // These are available to all subcommands in addition to whatever they
    // provide.
    const alwaysAvailable = {
      "nerd": ["--nerd", "enable stack tracing for debug purposes when errors are thrown"]
    }

    program
      .name(pkgJson.name)
      .description(pkgJson.description)
      .version(pkgJson.version)

    const commands = [BuildCommand, ResolveCommand, LintCommand]

    for(const CommandClass of commands) {
      const command = new CommandClass({cwd, packageJson: pkgJson})

      command.setCache(cache)
      await command.buildCli(program)
      command.addCliOptions(alwaysAvailable, false)
    }

    // Let'er rip, bitches! VROOM VROOM, motherfucker!!
    await program.parseAsync()

  } catch(error) {
    Sass
      .from(error, "Starting Sassy.")
      .report(sassyOptions.nerd ?? false)

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
