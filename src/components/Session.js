import Util from "../Util.js"
import Term from "./Term.js"
import * as File from "./File.js"

import chokidar from "chokidar"
import AuntyError from "./AuntyError.js"

export default class AuntySession {
  #theme = null
  #command = null
  #options = null
  #watcher = null
  #history = []
  #stats = Object.seal({builds: 0, successes: 0, failures: 0})
  #building = false

  get theme() {
    return this.#theme
  }

  constructor(command, theme, options) {
    this.#command = command
    this.#theme = theme
    this.#options = options
  }

  async run() {
    this.#building = true
    this.#command.asyncEmit("building")

    await this.#buildPipeline()

    if(this.#options.watch) {
      this.#command.emitter.on("closeSession", async() =>
        await this.#handleCloseSession())
      this.#command.emitter.on("rebuild", async() =>
        await this.#handleRebuild())
      this.#command.emitter.on("resetWatcher", async() =>
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
    if(!this.#building)
      return

    this.#theme.reset()

    const buildStart = Date.now()
    let loadCost, buildCost, writeCost

    try {
      /**
       * ****************************************************************
       * Have the theme load itself.
       * ****************************************************************
       */

      loadCost = (await Util.time(() => this.#theme.load())).cost
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

      buildCost = (await Util.time(() => this.#theme.build())).cost

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
        throw new Error("Compilation failed")
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

      const writeResult = await Util.time(() => this.#theme.write(forceWrite))
      writeCost = writeResult.cost
      const result = writeResult.result
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

      // Track successful build
      this.#stats.builds++
      this.#stats.successes++
      this.#history.push({
        timestamp: buildStart,
        loadTime: loadCost,
        buildTime: buildCost,
        writeTime: writeCost,
        success: true
      })

    } catch(error) {
      // Track failed build
      this.#stats.builds++
      this.#stats.failures++
      this.#history.push({
        timestamp: buildStart,
        loadTime: loadCost || 0,
        buildTime: buildCost || 0,
        writeTime: writeCost || 0,
        success: false,
        error: error.message
      })

      if(error instanceof AuntyError)
        error.report(this.#options.nerd)
    } finally {
      this.#building = false
      this.#command.asyncEmit("finishedBuilding")
    }
  }

  /**
   * Handles a file change event and triggers a rebuild for the theme.
   *
   * @param {string} changed - Path to the changed file
   * @returns {Promise<void>}
   */
  async #handleFileChange(changed) {
    try {
      if(this.#building)
        return

      this.#building = true
      this.#command.asyncEmit("building")

      const changedFile = this.#theme.dependencies.find(dep => dep.path === changed)

      if(!changedFile)
        return

      const fileName = File.relativeOrAbsolutePath(this.#command.cwd, changedFile)

      const message = [
        ["info", "REBUILDING", ["[","]"]],
        this.#theme.sourceFile.module,
      ]

      if(this.#options.nerd)
        message.push(["muted", fileName])

      Term.status(message)

      await this.#resetWatcher()
      await this.#buildPipeline()
    } finally {
      this.#building = false
    }
  }

  showSummary() {
    const {builds, successes, failures} = this.#stats
    const successRate = builds > 0 ? ((successes / builds) * 100).toFixed(1) : "0.0"

    Term.info()

    Term.status([
      [builds > 0 ? "success" : "error", "SESSION SUMMARY"],
      [builds > 0 ? "info" : "error", this.#theme.sourceFile.module, ["[", "]"]]
    ], this.#options)

    Term.status([
      [builds > 0 ? "success" : "error", "Builds", ["[", "]"]],
      builds.toLocaleString(),
      [successes > 0 ? "success" : "error", "Successes", ["(", ")"]],
      successes.toLocaleString(),
      [failures > 0 ? "error" : "error", "Failures", ["(", ")"]],
      failures.toLocaleString(),
      [builds > 0 ? "info" : "error", `${successRate}%`, ["(", ")"]]
    ], this.#options)

    if(this.#history.length > 0) {
      const lastBuild = this.#history[this.#history.length - 1]
      const totalTime = lastBuild.loadTime + lastBuild.buildTime + lastBuild.writeTime

      Term.status([
        [builds > 0 ? "info" : "muted", "Last Build", ["[", "]"]],
        [builds > 0 ? "success" : "muted", `${totalTime.toLocaleString()}ms total`, ["(", ")"]]
      ], this.#options)
    }
  }

  /**
   * Handles a rebuild event, resetting and rebuilding all watched themes.
   *
   * @returns {Promise<void>}
   */
  async #handleRebuild() {
    if(this.#building)
      return

    try {
      this.#building = true
      await this.#resetWatcher()
      this.#command.asyncEmit("building")
      await this.#buildPipeline(true)
    } catch(_) {
      void _
    } finally {
      this.#building = false
    }
  }

  /**
   * Resets the file watcher for a theme, setting up new dependencies.
   *
   * @returns {Promise<void>}
   */
  async #resetWatcher() {
    if(this.#watcher)
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

    this.#watcher.on("change", this.#handleFileChange.bind(this))
  }

  /**
   * Handles quitting the watch mode and cleans up watchers.
   *
   * @returns {Promise<void>}
   */
  async #handleCloseSession() {
    this.showSummary()

    if(this.#watcher) {
      try {
        await this.#watcher.close()
      } catch(_) {
        void _
      }
    }
  }
}
