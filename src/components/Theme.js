import path from "node:path"

import Compiler from "./Compiler.js"
import AuntyError from "./AuntyError.js"
import * as File from "./File.js"
import Term from "./Term.js"
import Util from "../Util.js"
import FileObject from "./FileObject.js"
import DirectoryObject from "./DirectoryObject.js"
import process from "node:process"

/**
 * Represents a theme compilation unit with source file, compilation state,
 * and output management. Handles the complete lifecycle from source loading
 * to compilation, writing, and optional file watching.
 */
export default class Theme {
  #sourceFile = null
  #source = null
  #cwd = null
  #options = null
  #dependencies = []
  #lookup = null
  #breadcrumbs = null

  // Write-related properties
  #output = null
  #outputJson = null
  #outputFileName = null
  #outputHash = null

  // Watch-related properties
  #watcher = null

  /**
   * Creates a new Theme instance.
   *
   * @param {FileObject} themeFile - The source theme file object
   * @param {DirectoryObject} cwd - Current working directory object
   * @param {object} options - Compilation options
   */
  constructor(themeFile, cwd, options) {
    this.#sourceFile = themeFile
    this.#outputFileName = `${themeFile.module}.color-theme.json`
    this.#cwd = process.cwd()
    this.#options = options
  }

  /**
   * Resets the theme's compilation state, clearing output and lookup data.
   * Used when recompiling in watch mode or clearing previous state.
   */
  reset() {
    this.#output = null
    this.#outputJson = null
    this.#outputHash = null
    this.#lookup = null
    this.#breadcrumbs = null
  }

  /**
   * Gets the source file object.
   *
   * @returns {FileObject} The source theme file
   */
  get sourceFile() {
    return this.#sourceFile
  }

  /**
   * Gets the compiled theme output object.
   *
   * @returns {object|null} The compiled theme output
   */
  get output() {
    return this.#output
  }

  /**
   * Sets the compiled theme output object and updates derived JSON and hash.
   *
   * @param {object} data - The compiled theme output object
   */
  set output(data) {
    this.#output = data
    this.#outputJson = JSON.stringify(data, null, 2) + "\n"
    this.#outputHash = Util.hashOf(this.#outputJson)
  }

  /**
   * Gets the array of file dependencies.
   *
   * @returns {FileObject[]} Array of dependency files
   */
  get dependencies() {
    return this.#dependencies
  }

  /**
   * Sets the array of file dependencies.
   *
   * @param {FileObject[]} data - Array of dependency files
   */
  set dependencies(data) {
    this.#dependencies = data

    if(!this.#dependencies.includes(this.#sourceFile))
      this.#dependencies.unshift(this.#sourceFile)
  }

  /**
   * Gets the parsed source data from the theme file.
   *
   * @returns {object|null} The parsed source data
   */
  get source() {
    return this.#source
  }

  /**
   * Gets the variable lookup data for theme compilation.
   *
   * @returns {object|null} The lookup data object
   */
  get lookup() {
    return this.#lookup
  }

  /**
   * Sets the variable lookup data for theme compilation.
   *
   * @param {object} data - The lookup data object
   */
  set lookup(data) {
    this.#lookup = data
  }

  /**
   * Gets the breadcrumbs data for variable resolution tracking.
   *
   * @returns {Map|null} The breadcrumbs map for tracking variable resolution
   */
  get breadcrumbs() {
    return this.#breadcrumbs
  }

  /**
   * Sets the breadcrumbs data for variable resolution tracking.
   *
   * @param {Map} data - The breadcrumbs map for tracking variable resolution
   */
  set breadcrumbs(data) {
    this.#breadcrumbs = data
  }

  /**
   * Loads and parses the theme source file.
   * Validates that the source contains required configuration.
   *
   * @returns {Promise<this>} Returns this instance for method chaining
   * @throws {AuntyError} If source file lacks required 'config' property
   */
  async load() {
    const source = await File.loadDataFile(this.#sourceFile)

    if(!source.config)
      throw AuntyError.new(
        `Source file does not contain 'config' property: ${this.#sourceFile.path}`
      )

    this.#source = source
  }

  /**
   * Adds a file dependency to the theme.
   *
   * @param {FileObject} file - The file to add as a dependency
   * @returns {this} Returns this instance for method chaining
   * @throws {AuntyError} If the file parameter is not a valid file
   */
  addDependency(file) {
    if(!file.isFile)
      throw AuntyError.new("File must be a dependency.")

    this.#dependencies.push(file)

    return this
  }

  /**
   * Builds the theme by compiling source data into final output.
   * Main entry point for theme compilation process.
   *
   * @param {object} [buildOptions] - Optional build configuration options
   * @returns {Promise<void>} Resolves when build is complete
   */
  async build(buildOptions) {
    const compiler = new Compiler()
    await compiler.compile(this, buildOptions)
    // await this.#compileTheme(this.#options, buildOptions)
  }

  /**
   * Internal method to compile the theme with the given options.
   * Handles the compilation process including dependency management,
   * compiler instantiation, and watch mode setup.
   *
   * @param {object} options - Compilation options
   * @param {object} [buildOptions] - Optional build configuration
   * @returns {Promise<void>} Resolves when compilation is complete
   * @private
   */
  async #compileTheme(options) {
    // First, we pause because writing themes will trigger it again!
    if(this.#watcher) {
      await this.#watcher.close()
      this.#watcher = null
    }

    // Get rid of any artefacts, in case we're watching, or just set them
    // to default. It doesn't super matter why. Why are you asking questions?
    // Just reset already. Ok, fine.
    this.reset()

    // Watch mode
    if(options.watch) {
      const dependencies = this.#dependencies

      this.#watcher = chokidar.watch(dependencies, {
        // Prevent watching own output files
        ignored: [this.#outputFileName],
        // Add some stability options
        awaitWriteFinish: {
          stabilityThreshold: 100,
          pollInterval: 50
        }
      })

      this.#watcher.on("change", async changed => {
        const relative = path.relative(this.#cwd, changed)
        const _changedPath = relative.startsWith("..")
          ? changed
          : relative

        if(changed === this.#sourceFile.path)
          await this.load()

        // Term.status([
        //   ["modified", rightAlignText("CHANGED", 10)],
        //   changedPath,
        //   ["modified", bundle.file.module]
        // ], options)

        // TODO: bundle stuff here - commented bundle reload logic
        // if(changed === this.#sourceFile.path) {
        //   const {cost: reloadCost, result: tempBundle} =
        //       await time(async() => loadThemeAsBundle(bundle.file))
        //   const reloadedBytes = await File.fileSize(bundle.file)

        // Term.status([
        //   ["success", rightAlignText(`${reloadCost.toLocaleString()}ms`, 10)],
        //   `${bundle.file.module} loaded`,
        //   ["info", `${reloadedBytes} bytes`],
        // ], options)
        // }

        this.#compileTheme()
      })
    }
  }

  /**
   * Writes the compiled theme output to a file or stdout.
   * Handles dry-run mode, output directory creation, and duplicate write prevention.
   *
   * @returns {Promise<void>} Resolves when write operation is complete
   */
  async write() {
    const output = this.#outputJson
    const outputDir = new DirectoryObject(this.#options.outputDir)
    const file = new FileObject(this.#outputFileName, outputDir)
    const nextHash = this.#outputHash
    const lastHash = await file.exists
      ? Util.hashOf(await File.readFile(file))
      : "kakadoodoo"

    if(this.#options.dryRun) {
      Term.log(this.#outputJson)

      return {status: "dry-run", file}
    }

    // Skip identical bytes
    if(lastHash === nextHash)
      return {status: "skipped", file}

    // return {state: "skipped", bytes: output.length, fileName}

    // Real write (timed)
    if(!await outputDir.exists)
      await File.assureDirectory(outputDir, {recursive: true})

    await File.writeFile(file, output)

    return {status: "written", bytes: output.length, file}
  }
}
