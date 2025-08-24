/**
 * @file Theme.js
 *
 * Defines the Theme class, representing a single theme compilation unit.
 * Handles the complete lifecycle: loading source files, managing dependencies,
 * compiling via Compiler, writing output, and supporting watch mode for live development.
 * Maintains state for output, variable lookup, and resolution tracking.
 *
 * Responsibilities:
 * - Load and validate theme source files
 * - Track dependencies and variable resolution
 * - Compile theme data into VS Code-compatible output
 * - Write output files, supporting dry-run and hash-based skip
 * - Support watch mode for live theme development
 */
import Compiler from "./Compiler.js"
import AuntyError from "./AuntyError.js"
import * as File from "./File.js"
import Term from "./Term.js"
import Util from "../Util.js"
import FileObject from "./FileObject.js"
import DirectoryObject from "./DirectoryObject.js"
import ThemePool from "./ThemePool.js"
import ThemePool from "./ThemePool.js"

/**
 * Theme class: manages the lifecycle of a theme compilation unit.
 * See file-level docstring for responsibilities.
 */
export default class Theme {
  #sourceFile = null
  #source = null
  #options = null
  #dependencies = []
  #lookup = null
  #pool = null
  #pool = null

  // Write-related properties
  #output = null
  #outputJson = null
  #outputFileName = null
  #outputHash = null

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
    this.#pool = null
    this.#pool = null
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
   * Gets the pool data for variable resolution tracking or null if one has
   * not been set.
   * Gets the pool data for variable resolution tracking or null if one has
   * not been set.
   *
   * @returns {ThemePool|null} The pool for this theme.
   * @returns {ThemePool|null} The pool for this theme.
   */
  get pool() {
    return this.#pool
  get pool() {
    return this.#pool
  }

  /**
   * Sets the pool data for variable resolution tracking. May not be over-
   * written publicly. May only be reset
   *
   * @see reset
   * Sets the pool data for variable resolution tracking. May not be over-
   * written publicly. May only be reset
   *
   * @see reset
   *
   * @param {ThemePool} pool - The pool to assign to this theme
   * @throws If there is already a pool.
   */
  set pool(pool) {
    if(this.#pool)
      throw AuntyError.new("Cannot override existing pool.")

    this.#pool = pool
  }

  /**
   * Method to return true or false if this theme has a pool.
   *
   * @returns {boolean} True if a pool has been set, false otherwise.
   */
  hasPool() {
    return this.#pool instanceof ThemePool
   * @param {ThemePool} pool - The pool to assign to this theme
   * @throws If there is already a pool.
   */
  set pool(pool) {
    if(this.#pool)
      throw AuntyError.new("Cannot override existing pool.")

    this.#pool = pool
  }

  /**
   * Method to return true or false if this theme has a pool.
   *
   * @returns {boolean} True if a pool has been set, false otherwise.
   */
  hasPool() {
    return this.#pool instanceof ThemePool
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
  }

  /**
   * Writes the compiled theme output to a file or stdout.
   * Handles dry-run mode, output directory creation, and duplicate write prevention.
   *
   * @param {boolean} [force] - Force a write. Used by the rebuild CLI option.
   * @returns {Promise<void>} Resolves when write operation is complete
   */
  async write(force=false) {
    const output = this.#outputJson
    const outputDir = new DirectoryObject(this.#options.outputDir)
    const file = new FileObject(this.#outputFileName, outputDir)

    if(this.#options.dryRun) {
      Term.log(this.#outputJson)

      return {status: "dry-run", file}
    }

    // Skip identical bytes
    if(!force) {
      const nextHash = this.#outputHash
      const lastHash = await file.exists
        ? Util.hashOf(await File.readFile(file))
        : "kakadoodoo"

      if(lastHash === nextHash)
        return {status: "skipped", file}
    }

    // Real write (timed)
    if(!await outputDir.exists)
      await File.assureDirectory(outputDir, {recursive: true})

    await File.writeFile(file, output)

    return {status: "written", bytes: output.length, file}
  }
}
