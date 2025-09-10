import {EventEmitter} from "node:events"
import process from "node:process"

import Command from "./Command.js"
import Sass from "./Sass.js"
import Session from "./Session.js"
import Term from "./Term.js"
import Theme from "./Theme.js"

/**
 * Command handler for building VS Code themes from source files.
 * Handles compilation, watching for changes, and output generation.
 */
export default class BuildCommand extends Command {
  /** @type {EventEmitter} Internal event emitter for watch mode coordination */
  emitter = new EventEmitter()

  #hasPrompt = false
  #building = 0

  /**
   * Creates a new BuildCommand instance.
   *
   * @param {object} base - Base configuration object
   * @param {string} base.cwd - Current working directory path
   * @param {object} base.packageJson - Package.json configuration data
   */
  constructor(base) {
    super(base)

    this.cliCommand = "build <file...>"
    this.cliOptions = {
      "watch": ["-w, --watch", "watch for changes"],
      "output-dir": ["-o, --output-dir <dir>", "specify an output directory"],
      "dry-run": ["-n, --dry-run", "print theme JSON to stdout; do not write files"],
      "silent": ["-s, --silent", "silent mode. only print errors or dry-run"],
    }
  }

  /**
   * Executes the build command for the provided theme files.
   * Processes each file in parallel, optionally watching for changes.
   *
   * @param {string[]} fileNames - Array of theme file paths to process
   * @param {object} options - Build options
   * @param {boolean} [options.watch] - Enable watch mode for file changes
   * @param {string} [options.output-dir] - Custom output directory path
   * @param {boolean} [options.dry-run] - Print JSON to stdout without writing files
   * @param {boolean} [options.silent] - Silent mode, only show errors or dry-run output
   * @returns {Promise<void>} Resolves when all files are processed
   * @throws {Error} When theme compilation fails
   */
  async execute(fileNames, options) {
    const {cwd} = this

    if(options.watch) {
      options.watch && this.#initialiseInputHandler()

      this.emitter.on("quit", async() =>
        await this.#handleQuit())

      this.emitter.on("building", async() => await this.#startBuilding())
      this.emitter.on("finishedBuilding", () => this.#finishBuilding())
      this.emitter.on("erasePrompt", async() => await this.#erasePrompt())
      this.emitter.on("printPrompt", () => this.#printPrompt())
    }

    const sessionResults = await Promise.allSettled(
      fileNames.map(async fileName => {
        const fileObject = await this.resolveThemeFileName(fileName, cwd)
        const theme = new Theme(fileObject, cwd, options)
        theme.cache = this.cache

        return new Session(this, theme, options)
      })
    )

    if(sessionResults.some(theme => theme.status === "rejected")) {
      const rejected = sessionResults.filter(result => result.status === "rejected")

      rejected.forEach(item => Term.error(item.reason))
      process.exit(1)
    }

    const sessions = sessionResults.map(result => result.value)
    const firstRun = await Promise.allSettled(
      sessions.map(async session => await session.run())
    )
    const rejected = firstRun.filter(reject => reject.status === "rejected")
    if(rejected.length > 0) {

      rejected.forEach(reject => Term.error(reject.reason))

      if(firstRun.length === rejected.length)
        await this.asyncEmit("quit")
    }
  }

  /**
   * Handles quitting the watch mode and cleans up watchers.
   *
   * @returns {Promise<void>}
   */
  async #handleQuit() {
    await this.asyncEmit("closeSession")

    await Term.directWrite("\x1b[?25h")

    Term.info()
    Term.info("Exiting.")

    process.stdin.setRawMode(false)
    process.exit(0)
  }

  /**
   * Initialises the input handler for watch mode (F5=recompile, q=quit).
   * Sets up raw mode input handling for interactive commands.
   *
   * @returns {void}
   */
  async #initialiseInputHandler() {
    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.setEncoding("utf8")

    process.stdin.on("data", async key => {
      try {
        if(key === "q" || key === "\u0003") {   // Ctrl+C
          await this.asyncEmit("quit")
        } else if(key === "r" || key === "\x1b[15~") {  // F5
          await this.asyncEmit("rebuild")
        } else if(key === "\u0013") {  // Ctrl+S
          await this.asyncEmit("saveCheckpoint")
        } else if(key === "\u001a") {  // Ctrl+Z
          await this.asyncEmit("revertCheckpoint")
        }
      } catch(error) {
        Sass.new("Processing input.", error)
          .report(true)
      }
    })

    await Term.directWrite("\x1b[?25l")
  }

  async #printPrompt() {
    if(this.#hasPrompt && this.#building > 0)
      return

    await Term.directWrite("\n")

    await Term.directWrite(Term.terminalMessage([
      ["info", "F5", ["<",">"]],
      "rebuild all,",
      ["info", "Ctrl-C", ["<",">"]],
      "quit",
    ]))

    this.#hasPrompt = true
  }

  async #erasePrompt() {
    if(!this.#hasPrompt)
      return

    this.#hasPrompt = false

    await Term.clearLines(1)
  }

  async #startBuilding() {
    await this.#erasePrompt()
    this.#building++
  }

  #finishBuilding() {
    this.#building = Math.max(0, this.#building-1)

    if(this.#building === 0)
      this.#printPrompt()
  }
}
