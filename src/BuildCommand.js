import AuntyCommand from "./components/AuntyCommand.js"
import Term from "./components/Term.js"
import Theme from "./components/Theme.js"

import process from "node:process"
import {EventEmitter} from "node:events"
import AuntySession from "./components/Session.js"

/**
 * Command handler for building VS Code themes from source files.
 * Handles compilation, watching for changes, and output generation.
 */
export default class BuildCommand extends AuntyCommand {
  /** @type {EventEmitter} Internal event emitter for watch mode coordination */
  emitter = new EventEmitter()

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

    const sessionResults = await Promise.allSettled(
      fileNames.map(async fileName => {
        const fileObject = await this.resolveThemeFileName(fileName, cwd)
        const theme = new Theme(fileObject, cwd, options)

        return new AuntySession(this, theme, options)
      })
    )

    if(sessionResults.some(theme => theme.status === "rejected")) {
      const rejected = sessionResults.filter(result => result.status === "rejected")

      rejected.forEach(item => Term.error(item.reason))
      process.exit(1)
    }

    if(options.watch) {
      options.watch && this.#introduceWatching(options)
      options.watch && this.#initialiseInputHandler()

      this.emitter.on("quit", async() =>
        await this.#handleQuit())
    }

    const sessions = sessionResults.map(result => result.value)
    const firstRun = await Promise.allSettled(
      sessions.map(async session => session.run())
    )
    const rejected = firstRun.filter(reject => reject.status === "rejected")
    if(rejected.length > 0) {

      rejected.forEach(reject => Term.error(reject.reason))

      if(firstRun.length === rejected.length)
        this.emitter.emit("quit")
    }
  }

  /**
   * Handles quitting the watch mode and cleans up watchers.
   *
   * @returns {Promise<void>}
   */
  async #handleQuit() {
    Term.info()
    Term.info("Exiting.")

    process.stdin.setRawMode(false)
    process.exit(0)
  }

  /**
   * Displays watch mode status and instructions.
   *
   * @param {object} options - Build options for silent mode check
   * @param {boolean} [options.silent] - Whether to suppress status output
   * @returns {boolean} Always returns true
   */
  #introduceWatching(options) {
    Term.status([
      ["info","Watch Mode"],
      ["info", "F5", ["<",">"]],
      "recompile/rewrite",
      ["info", "Ctrl-C", ["<",">"]],
      "quit",
      ["info", "Ctrl-S", ["<",">"]],
      "save snapshot",
      ["info", "Ctrl-Z", ["<",">"]],
      "undo to previous snapshot",
    ], options)
    Term.info()

    return true
  }

  /**
   * Initialises the input handler for watch mode (F5=recompile, q=quit).
   * Sets up raw mode input handling for interactive commands.
   *
   * @returns {void}
   */
  #initialiseInputHandler() {
    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.setEncoding("utf8")
    process.stdin.on("data", key => {
      if(key === "q" || key === "\u0003") {   // Ctrl+C
        this.emitter.emit("quit")
      } else if(key === "r" || key === "\x1b[15~") {  // F5
        this.emitter.emit("rebuild")
      } else if(key === "\u0013") {  // Ctrl+S
        this.emitter.emit("saveCheckpoint")
      } else if(key === "\u001a") {  // Ctrl+Z
        this.emitter.emit("revertCheckpoint")
      }
    })
  }
}
