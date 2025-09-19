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
import Sass from "./Sass.js"
import Compiler from "./Compiler.js"
import DirectoryObject from "./DirectoryObject.js"
import File from "./File.js"
import FileObject from "./FileObject.js"
import Term from "./Term.js"
import ThemePool from "./ThemePool.js"
import Util from "./Util.js"

// Symbol enums for magic values
const WriteStatus = {
  DRY_RUN: Symbol("dry-run"),
  SKIPPED: Symbol("skipped"),
  WRITTEN: Symbol("written")
}

const FileExtension = {
  COLOR_THEME: Symbol(".color-theme.json")
}

const PropertyKey = {
  CONFIG: Symbol("config")
}

const HashFallback = {
  DEFAULT: Symbol("kakadoodoo")
}

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
  #cache = null
  #name = null

  // Write-related properties
  #output = null
  #outputJson = null
  #outputFileName = null
  #outputHash = null

  #cwd = null

  /**
   * Creates a new Theme instance.
   *
   * @param {FileObject} themeFile - The source theme file object
   * @param {DirectoryObject} cwd - The project's directory.
   * @param {object} options - Compilation options
   */
  constructor(themeFile, cwd, options) {
    this.#sourceFile = themeFile
    this.#name = themeFile.module
    this.#outputFileName = `${this.#name}${FileExtension.COLOR_THEME.description}`
    this.#options = options
    this.#cwd = cwd
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
  }

  getCwd() {
    return this.#cwd
  }

  getOptions() {
    return this.#options
  }

  setCache(cache) {
    if(!this.#cache)
      this.#cache=cache

    return this
  }

  getCache() {
    return this.#cache
  }

  getName() {
    return this.#name
  }

  /**
   * Gets the source file object.
   *
   * @returns {FileObject} The source theme file
   */
  getSourceFile() {
    return this.#sourceFile
  }

  /**
   * Gets the compiled theme output object.
   *
   * @returns {object|null} The compiled theme output
   */
  getOutput() {
    return this.#output
  }

  /**
   * Sets the compiled theme output object and updates derived JSON and hash.
   *
   * @param {object} data - The compiled theme output object
   */
  setOutput(data) {
    this.#output = data
    this.#outputJson = JSON.stringify(data, null, 2) + "\n"
    this.#outputHash = Util.hashOf(this.#outputJson)

    return this
  }

  /**
   * Gets the array of file dependencies.
   *
   * @returns {FileObject[]} Array of dependency files
   */
  getDependencies() {
    return this.#dependencies
  }

  /**
   * Sets the array of file dependencies.
   *
   * @param {FileObject[]} data - Array of dependency files
   */
  setDependencies(data) {
    this.#dependencies = data

    if(!this.#dependencies.includes(this.#sourceFile))
      this.#dependencies.unshift(this.#sourceFile)

    return this
  }

  /**
   * Gets the parsed source data from the theme file.
   *
   * @returns {object|null} The parsed source data
   */
  getSource() {
    return this.#source
  }

  /**
   * Gets the variable lookup data for theme compilation.
   *
   * @returns {object|null} The lookup data object
   */
  getLookup() {
    return this.#lookup
  }

  /**
   * Sets the variable lookup data for theme compilation.
   *
   * @param {object} data - The lookup data object
   */
  setLookup(data) {
    this.#lookup = data

    return this
  }

  /**
   * Gets the pool data for variable resolution tracking or null if one has
   * not been set.
   *
   * @returns {ThemePool|null} The pool for this theme.
   */
  getPool() {
    return this.#pool
  }

  /**
   * Sets the pool data for variable resolution tracking. May not be over-
   * written publicly. May only be reset
   *
   * @see reset
   *
   * @param {ThemePool} pool - The pool to assign to this theme
   * @throws If there is already a pool.
   */
  setPool(pool) {
    if(!this.#pool)
      this.#pool = pool

    return this
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
   * Skips loading if no cache is available (extension use case).
   *
   * @returns {Promise<this>} Returns this instance for method chaining
   * @throws {Sass} If source file lacks required 'config' property
   */
  async load() {
    // Skip loading if no cache (extension use case)
    if(!this.#cache)
      return this

    const source = await this.#cache.loadCachedData(this.#sourceFile)

    if(!source[PropertyKey.CONFIG.description])
      throw Sass.new(
        `Source file does not contain '${PropertyKey.CONFIG.description}' property: ${this.#sourceFile.path}`
      )

    this.#source = source

    return this
  }

  /**
   * Adds a file dependency to the theme.
   *
   * @param {FileObject} file - The file to add as a dependency
   * @returns {this} Returns this instance for method chaining
   * @throws {Sass} If the file parameter is not a valid file
   */
  addDependency(file) {
    if(!file.isFile)
      throw Sass.new("File must be a dependency.")

    this.#dependencies.push(file)

    return this
  }

  /**
   * Builds the theme by compiling source data into final output.
   * Main entry point for theme compilation process.
   *
   * @returns {Promise<void>} Resolves when build is complete.
   */
  async build() {
    const compiler = new Compiler()

    await compiler.compile(this)

    return this
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

      return {status: WriteStatus.DRY_RUN, file}
    }

    // Skip identical bytes
    if(!force) {
      const nextHash = this.#outputHash
      const lastHash = await file.exists
        ? Util.hashOf(await File.readFile(file))
        : HashFallback.DEFAULT.description

      if(lastHash === nextHash)
        return {status: WriteStatus.SKIPPED, file}
    }

    // Real write (timed)
    if(!await outputDir.exists)
      await File.assureDirectory(outputDir, {recursive: true})

    await File.writeFile(file, output)

    return {status: WriteStatus.WRITTEN, bytes: output.length, file}
  }
}
