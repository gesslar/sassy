import {EventEmitter} from "node:events"
import process from "node:process"

import {Promised, Sass, Term, Util} from "@gesslar/toolkit"
import Command from "./Command.js"
import Session from "./Session.js"
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

    this.setCliCommand("build <file...>")
    this.setCliOptions({
      "watch": ["-w, --watch", "watch for changes"],
      "output-dir": ["-o, --output-dir <dir>", "specify an output directory"],
      "dry-run": ["-n, --dry-run", "print theme JSON to stdout; do not write files"],
      "silent": ["-s, --silent", "silent mode. only print errors or dry-run"],
    })
  }

  /**
   * Emits an event asynchronously using the internal emitter.
   * This method wraps Util.asyncEmit for convenience.
   *
   * @param {string} event - The event name to emit
   * @param {...any} args - Arguments to pass to the event handlers
   * @returns {Promise<void>} Resolves when all event handlers have completed
   */
  async asyncEmit(event, ...args) {
    return await Util.asyncEmit(this.emitter, event, ...args)
  }

  /**
   * @typedef {object} BuildCommandOptions
   * @property {boolean} [watch] - Enable watch mode for file changes
   * @property {string} [outputDir] - Custom output directory path
   * @property {boolean} [dryRun] - Print JSON to stdout without writing files
   * @property {boolean} [silent] - Silent mode, only show errors or dry-run output
   */

  /**
   * Executes the build command for the provided theme files.
   * Processes each file in parallel, optionally watching for changes.
   *
   * @param {Array<string>} fileNames - Array of theme file paths to process
   * @param {BuildCommandOptions} options - {@link BuildCommandOptions}
   * @returns {Promise<void>} Resolves when all files are processed
   * @throws {Error} When theme compilation fails
   */
  async execute(fileNames, options) {
    const cwd = this.getCwd()

    if(options.watch) {
      options.watch && this.#initialiseInputHandler()

      this.emitter.on("quit", async() => await this.#handleQuit())
      this.emitter.on("building", () => this.#startBuilding())
      this.emitter.on("finishedBuilding", () => this.#finishBuilding())
      this.emitter.on("erasePrompt", () => this.#erasePrompt())
      this.emitter.on("printPrompt", () => this.#printPrompt())
    }

    const sessionResults = await Promised.settle(
      fileNames.map(async fileName => {
        const fileObject = await this.resolveThemeFileName(fileName, cwd)
        const theme = new Theme(fileObject, cwd, options)
          .setCache(this.getCache())

        return new Session(this, theme, options)
      })
    )

    if(Promised.hasRejected(sessionResults))
      Promised.throw("Creating sessions.", sessionResults)

    const sessions = Promised.values(sessionResults)
    const firstRun = await Promised.settle(sessions.map(
      async session => await session.run()))

    if(Promised.hasRejected(firstRun))
      Promised.throw("Executing sessions.", firstRun)
  }

  /**
   * Handles quitting the watch mode and cleans up watchers.
   *
   * @returns {Promise<void>}
   */
  async #handleQuit() {
    await this.asyncEmit("closeSession")

    Term.write("\x1b[?25h")

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

    Term.write("\x1b[?25l")
  }

  #printPrompt() {
    if(this.#hasPrompt && this.#building > 0)
      return

    Term.write("\n")

    Term.write(Term.terminalMessage([
      ["info", "F5", ["<",">"]],
      "rebuild all,",
      ["info", "Ctrl-C", ["<",">"]],
      "quit",
    ]))

    this.#hasPrompt = true
  }

  #erasePrompt() {
    if(!this.#hasPrompt)
      return

    this.#hasPrompt = false

    Term.clearLine().moveStart()
  }

  #startBuilding() {
    this.#erasePrompt()

    this.#building++
  }

  #finishBuilding() {
    this.#building = Math.max(0, this.#building-1)

    if(this.#building === 0)
      this.#printPrompt()
  }
}
