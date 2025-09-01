import Util from "../Util.js"
import Term from "./Term.js"
import * as File from "./File.js"
import FileObject from "./FileObject.js"

import {EventEmitter} from "node:events"

import chokidar from "chokidar"

export default class AuntySession {
  #theme = null
  #command = null
  #options = null
  #watcher = null
  #emitter = new EventEmitter()
  #history = []
  #runs = {}
  #stats = Object.seal({builds: 0, successes: 0, failures: 0})

  constructor(command, theme, options) {
    this.#command = command
    this.#theme = theme
    this.#options = options
  }

  async run() {
    await this.#buildPipeline()

    if(this.#options.watch) {
      this.#emitter.on("fileChanged", async changed =>
        await this.#handleFileChange(changed))
      this.#emitter.on("quit", async() =>
        await this.#handleQuit())
      this.#emitter.on("rebuild", async() =>
        await this.#handleRebuild())
      this.#emitter.on("resetWatcher", async() =>
        await this.#resetWatcher())

      await this.#resetWatcher()
    }
  }

  /**
   * Runs the build pipeline for a theme: load, build, and write.
   *
   * @param {boolean} [forceWrite] - Forces a write of the theme, used by rebuild option (defaults to false)
   * @returns {Promise<void>} Nuttin', honey.
   */
  async #buildPipeline(forceWrite=false) {
    this.#theme.reset()

    /**
     * ****************************************************************
     * Have the theme load itself.
     * ****************************************************************
     */

    const {cost: loadCost} = await Util.time(() => this.#theme.load())
    const bytes = await File.fileSize(this.#theme.sourceFile)
    Term.status([
      ["success", Util.rightAlignText(`${loadCost.toLocaleString()}ms`, 10), ["[","]"]],
      `${this.#theme.sourceFile.module} loaded`,
      ["info", `${bytes} bytes`, ["[","]"]]
    ], this.#options)

    /**
     * ****************************************************************
     * Have the theme build itself.
     * ****************************************************************
     */

    const {cost: buildCost} = await Util.time(() => this.#theme.build())

    const compileResult =
      await Promise.allSettled(this.#theme.dependencies.map(async dep => {

        return await (async fileObject => {
          const fileName = File.relativeOrAbsolutePath(this.#command.cwd, fileObject)
          const fileSize = await File.fileSize(fileObject)
          return [fileName, fileSize]
        })(dep)

      }))

    const rejected = compileResult.filter(result => result.status === "rejected")
    if(rejected.length > 0) {
      rejected.forEach(reject => Term.error(reject.reason))

      return
    }

    const dependencies = compileResult.slice(1).map(dep => dep.value)
    const totalBytes = compileResult.reduce((acc,curr) => acc + curr.value[1], 0)

    Term.status([
      ["success", Util.rightAlignText(`${buildCost.toLocaleString()}ms`, 10), ["[","]"]],
      `${this.#theme.sourceFile.module} compiled`,
      ["success", `${compileResult[0].value[1].toLocaleString()} bytes`, ["[","]"]],
      ["info", `${totalBytes.toLocaleString()} total bytes`, ["(",")"]],
    ], this.#options)

    if(this.#options.nerd) {
      dependencies.forEach(f => {
        const [fileName,fileSize] = f

        Term.status([
          `${" ".repeat(13)}`,
          ["muted", fileName],
          ["muted", `${fileSize.toLocaleString()} bytes`, ["{","}"]]
        ], this.#options)

      })
    }

    /**
     * ****************************************************************
     * Lastly. Tom Riddle that shit into the IO! I would say just "O",
     * but that wouldn't be very inclusive language. *I see you!*
     * ****************************************************************
     */

    const {cost: writeCost, result} =
      await Util.time(() => this.#theme.write(forceWrite))
    const {
      status: writeStatus,
      file: outputFile,
      bytes: writeBytes
    } = result

    const outputFilename = File.relativeOrAbsolutePath(this.#command.cwd, outputFile)
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

    Term.status(status, this.#options)
  }

  /**
   * Handles a file change event and triggers a rebuild for the theme.
   *
   * @param {string} changed - Path to the changed file
   * @returns {Promise<void>}
   */
  async #handleFileChange(changed) {
    const changedFile = new FileObject(changed)
    const fileName = File.relativeOrAbsolutePath(this.cwd, changedFile)

    Term.status([
      ["info", "REBUILDING", ["[","]"]],
      fileName
    ], this.#options)

    await this.#buildPipeline()
  }

  showSummary() {
    // All your accumulated context from the entire session
  }

  /**
   * Handles a rebuild event, resetting and rebuilding all watched themes.
   *
   * @returns {Promise<void>}
   */
  async #handleRebuild() {
    try {
      await this.#resetWatcher()
      await this.#buildPipeline(true)
    } catch(_) {
      void _
    }
  }

  /**
   * Resets the file watcher for a theme, setting up new dependencies.
   *
   * @returns {Promise<void>}
   */
  async #resetWatcher() {
    if(!this.#watcher)
      return

    await this.#watcher.close()

    const dependencies = this.#theme.dependencies.map(d => d.path)
    this.#watcher = chokidar.watch(dependencies, {
      // Prevent watching own output files
      ignored: [this.#theme.outputFileName],
      // Add some stability options
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50
      }
    })

    this.#watcher.on("change", changed => this.#emitter.emit("fileChanged", changed))
  }

  /**
   * Handles quitting the watch mode and cleans up watchers.
   *
   * @returns {Promise<void>}
   */
  async #handleQuit() {
    if(this.#watcher) {
      try {
        await this.#watcher.close()
      } catch(_) {
        void _
      }
    }
  }
}
