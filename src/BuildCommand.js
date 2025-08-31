import AuntyCommand from "./components/AuntyCommand.js"
import Term from "./components/Term.js"
import Theme from "./components/Theme.js"
import Util from "./Util.js"
import FileObject from "./components/FileObject.js"
import * as File from "./components/File.js"

import chokidar from "chokidar"
import process from "node:process"
import {EventEmitter} from "node:events"

/**
 * Command handler for building VS Code themes from source files.
 * Handles compilation, watching for changes, and output generation.
 */
export default class BuildCommand extends AuntyCommand {
  /** @type {EventEmitter} Internal event emitter for watch mode coordination */
  #emitter = new EventEmitter()

  /** @type {Map<Theme, object>} Map of themes to their file watchers */
  #watchers = new Map()

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

    options.watch && this.#introduceWatching(options)

    const themes = await Promise.allSettled(
      fileNames.map(async fileName =>
        await this.#buildTheme({fileName, cwd, options}))
    )

    if(themes.some(theme => theme.status === "rejected")) {
      const rejected = themes.filter(theme => theme.status === "rejected")

      rejected.forEach(item => Term.error(item.reason))
    }

    if(options.watch) {
      this.#initialiseInputHandler()

      this.#emitter.on("fileChanged", async({theme,changed}) =>
        await this.#handleFileChange({theme,changed,options}))
      this.#emitter.on("quit", async() =>
        await this.#handleQuit())
      this.#emitter.on("rebuild", async() =>
        await this.#handleRebuild(options))
      this.#emitter.on("resetWatcher", async theme =>
        await this.#resetWatcher(theme, options))

      for(const element of themes) {
        const theme = element.value
        if(theme instanceof Theme)
          await this.#resetWatcher(theme, options)
      }
    }
  }

  /**
   * Builds a theme from the given file name and options.
   *
   * @param {object} params - Parameters for building the theme
   * @param {string} params.fileName - The theme file name
   * @param {string} params.cwd - Current working directory
   * @param {object} params.options - Build options
   * @returns {Promise<Theme>} The built Theme instance
   */
  async #buildTheme({fileName, cwd, options}) {
    const fileObject = await this.resolveThemeFileName(fileName, cwd)
    const theme = new Theme(fileObject, cwd, options)

    return this.#buildPipeline({theme, options})
  }

  /**
   * Runs the build pipeline for a theme: load, build, and write.
   *
   * @param {object} params - Parameters for the build pipeline
   * @param {Theme} params.theme - The theme instance
   * @param {object} params.options - Build options
   * @param {boolean} [forceWrite] - Forces a write of the theme, used by rebuild option (defaults to false)
   * @returns {Promise<Theme>} The same Theme instance passed in, after processing
   */
  async #buildPipeline({theme, options}, forceWrite=false) {
    theme.reset()

    /**
     * ****************************************************************
     * Have the theme load itself.
     * ****************************************************************
     */

    const {cost: loadCost} = await Util.time(() => theme.load())
    const bytes = await File.fileSize(theme.sourceFile)
    Term.status([
      ["success", Util.rightAlignText(`${loadCost.toLocaleString()}ms`, 10), ["[","]"]],
      `${theme.sourceFile.module} loaded`,
      ["info", `${bytes} bytes`, ["[","]"]]
    ], options)

    /**
     * ****************************************************************
     * Have the theme build itself.
     * ****************************************************************
     */

    const {cost: buildCost} = await Util.time(() => theme.build())
    // const bytesCompiled = await theme.dependencies.reduce(
    //   async(accPromise, item) => {
    //     const acc = await accPromise
    //     const processed = await File.fileSize(item)

    //     return acc + processed
    //   }, Promise.resolve(0)
    // )

    const filesCompiled =
      await Promise.allSettled(theme.dependencies.map(async dep => {

        return await (async fileObject => {
          const fileName = File.relativeOrAbsolutePath(this.cwd, fileObject)
          const fileSize = await File.fileSize(fileObject)
          return [fileName, fileSize]
        })(dep)

      }))

    const dependencies = filesCompiled.slice(1).map(dep => dep.value)
    const totalBytes = filesCompiled.reduce((acc,curr) => acc + curr.value[1], 0)

    Term.status([
      ["success", Util.rightAlignText(`${buildCost.toLocaleString()}ms`, 10), ["[","]"]],
      `${theme.sourceFile.module} compiled`,
      ["success", `${filesCompiled[0].value[1].toLocaleString()} bytes`, ["[","]"]],
      ["info", `${totalBytes.toLocaleString()} total bytes`, ["(",")"]],
    ], options)

    if(options.nerd) {
      dependencies.forEach(f => {
        const [fileName,fileSize] = f

        Term.status([
          `${" ".repeat(13)}`,
          ["muted", fileName],
          ["muted", `${fileSize.toLocaleString()} bytes`, ["{","}"]]
        ], options)

      })
    }

    /**
     * ****************************************************************
     * Lastly. Tom Riddle that shit into the IO! I would say just "O",
     * but that wouldn't be very inclusive language. *I see you!*
     * ****************************************************************
     */

    const {cost: writeCost, result} =
      await Util.time(() => theme.write(forceWrite))
    const {
      status: writeStatus,
      file: outputFile,
      bytes: writeBytes
    } = result

    const outputFilename = File.relativeOrAbsolutePath(this.cwd, outputFile)
    const status = [
      ["success", Util.rightAlignText(`${writeCost.toLocaleString()}ms`, 10), ["[","]"]],
    ]

    if(writeStatus === "written") {
      status.push(
        `${outputFilename} written`,
        ["success", `${writeBytes.toLocaleString()} bytes`, ["[","]"]]
      )
    } else {
      status.push(
        `${outputFilename}`,
        ["warn", writeStatus.toLocaleUpperCase(), ["[","]"]]
      )
    }

    Term.status(status, options)

    return theme
  }

  /**
   * Handles a file change event and triggers a rebuild for the theme.
   *
   * @param {object} params - Parameters for the file change
   * @param {Theme} params.theme - The theme instance
   * @param {string} params.changed - Path to the changed file
   * @param {object} params.options - Build options
   * @returns {Promise<void>}
   */
  async #handleFileChange({theme, changed, options}) {
    const changedFile = new FileObject(changed)
    const fileName = File.relativeOrAbsolutePath(this.cwd, changedFile)

    Term.status([
      ["info", "REBUILDING", ["[","]"]],
      fileName
    ], options)

    await this.#buildPipeline({theme,options})
  }

  /**
   * Handles quitting the watch mode and cleans up watchers.
   *
   * @returns {Promise<void>}
   */
  async #handleQuit() {
    for(const watcher of this.#watchers.values())
      await watcher.close()

    Term.info()
    Term.info("Exiting.")

    process.stdin.setRawMode(false)
    process.exit(0)
  }

  /**
   * Handles a rebuild event, resetting and rebuilding all watched themes.
   *
   * @param {object} options - Build options
   * @returns {Promise<void>}
   */
  async #handleRebuild(options) {
    const themes = Array.from(this.#watchers.keys())

    await Promise.allSettled(themes.map(async theme => {
      await (async() => {
        await this.#resetWatcher(theme, options)
        await this.#buildPipeline({theme, options}, true)
      })()
    }))
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
      ["info", "WATCH MODE", ["[","]"]],
      "F5=recompile (forces write), q=quit"
    ], options)
    Term.info()

    return true
  }

  /**
   * Resets the file watcher for a theme, setting up new dependencies.
   *
   * @param {Theme} theme - The theme instance
   * @param {object} options - Build options
   * @returns {Promise<void>}
   */
  async #resetWatcher(theme, options) {
    if(options.watch) {
      if(this.#watchers.has(theme)) {
        let watcher = this.#watchers.get(theme)
        await watcher.close()
        this.#watchers.delete(theme)
      }

      const dependencies = theme.dependencies.map(d => d.path)
      const watcher = chokidar.watch(dependencies, {
        // Prevent watching own output files
        ignored: [theme.outputFileName],
        // Add some stability options
        awaitWriteFinish: {
          stabilityThreshold: 100,
          pollInterval: 50
        }
      })

      watcher.on("change", changed => this.#emitter.emit("fileChanged", {theme, changed}))

      this.#watchers.set(theme, watcher)
    }
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

      if(key === "q" || key === "\u0003") {
        this.#emitter.emit("quit")
      } else if(key === "r" || key === "\x1b[15~") {
        this.#emitter.emit("rebuild")
      }
    })
  }
}
