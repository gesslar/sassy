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

const outputFileExtension = "color-theme.json"
const obviouslyASentinelYouCantMissSoShutUpAboutIt = "kakadoodoo"

// Symbol enums for magic values
const WriteStatus = {
  DRY_RUN: Symbol("dry-run"),
  SKIPPED: Symbol("skipped"),
  WRITTEN: Symbol("written")
}

const PropertyKey = {
  CONFIG: Symbol("config")
}

/**
 * Theme class: manages the lifecycle of a theme compilation unit.
 * See file-level docstring for responsibilities.
 */
export default class Theme {
  #sourceFile = null
  #source = null
  #options = null
  /**
   * The dependencies of this theme.
   *
   * @type {Set<Dependency>}
   * @private
   */
  #dependencies = new Set()
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
    this.#outputFileName = `${this.#name}.${outputFileExtension}`
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

  /**
   * Gets the current working directory.
   *
   * @returns {DirectoryObject} The current working directory
   */
  getCwd() {
    return this.#cwd
  }

  /**
   * Gets the compilation options.
   *
   * @returns {object} The compilation options object
   */
  getOptions() {
    return this.#options
  }

  /**
   * Gets a specific compilation option.
   *
   * @param {string} option - The option name to retrieve
   * @returns {*} The option value or undefined if not set
   */
  getOption(option) {
    return this.#options?.[option] ?? undefined
  }

  /**
   * Sets the cache instance for theme compilation.
   *
   * @param {Cache} cache - The cache instance to use for file operations
   * @returns {this} Returns this instance for method chaining
   */
  setCache(cache) {
    if(!this.#cache)
      this.#cache=cache

    return this
  }

  /**
   * Gets the cache instance.
   *
   * @returns {Cache|null} The cache instance or null if not set
   */
  getCache() {
    return this.#cache
  }

  /**
   * Gets the theme name.
   *
   * @returns {string} The theme name derived from the source file
   */
  getName() {
    return this.#name
  }

  /**
   * Gets the output file name for the compiled theme.
   *
   * @returns {string} The output file name with extension
   */
  getOutputFileName() {
    return this.#outputFileName
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
   * Sets the compiled theme output object and updates derived JSON and hash.
   *
   * @param {object} data - The compiled theme output object
   * @returns {this} Returns this instance for method chaining
   */
  setOutput(data) {
    this.#output = data
    this.#outputJson = JSON.stringify(data, null, 2) + "\n"
    this.#outputHash = Util.hashOf(this.#outputJson)

    return this
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
   * Checks if the source has colors defined.
   *
   * @returns {boolean} True if source has theme colors
   */
  sourceHasColors() {
    return !!this.#source?.theme?.colors
  }

  /**
   * Checks if the source has token colors defined.
   *
   * @returns {boolean} True if source has theme token colors
   */
  sourceHasTokenColors() {
    return !!this.#source?.theme?.tokenColors
  }

  /**
   * Checks if the source has semantic token colors defined.
   *
   * @returns {boolean} True if source has theme semantic token colors
   */
  sourceHasSemanticTokenColors() {
    return !!this.#source?.theme?.semanticTokenColors
  }

  /**
   * Checks if the source has theme configuration.
   *
   * @returns {boolean} True if source has theme data
   */
  sourceHasTheme() {
    return !!this.#source?.theme
  }

  /**
   * Checks if the source has variables.
   *
   * @returns {boolean} True if source has vars section
   */
  sourceHasVars() {
    return !!this.#source?.vars
  }

  /**
   * Checks if the source has config section.
   *
   * @returns {boolean} True if source has config
   */
  sourceHasConfig() {
    return !!this.#source?.config
  }

  /**
   * Gets the source colors data.
   *
   * @returns {object|null} The colors object or null if not defined
   */
  getSourceColors() {
    if(!this.sourceHasColors())
      return null

    return this.#source.theme.colors
  }

  /**
   * Gets the source token colors data.
   *
   * @returns {Array|null} The token colors array or null if not defined
   */
  getSourceTokenColors() {
    if(!this.sourceHasTokenColors())
      return null

    return this.#source.theme.tokenColors
  }

  /**
   * Gets the source semantic token colors data.
   *
   * @returns {object|null} The semantic token colors object or null if not defined
   */
  getSourceSemanticTokenColors() {
    if(!this.sourceHasSemanticTokenColors())
      return null

    return this.#source.theme.semanticTokenColors
  }

  /**
   * Gets the array of file dependencies.
   *
   * @returns {Set<Dependency>} Array of dependency files
   */
  getDependencies() {
    return this.#dependencies
  }

  /**
   * Adds a dependency to the theme with its source data.
   *
   * @param {FileObject} file - The dependency file object
   * @param {object} source - The parsed source data from the file
   * @returns {this} Returns this instance for method chaining
   */
  addDependency(file, source) {
    this.#dependencies.add(
      new Dependency()
        .setSourceFile(file)
        .setSource(source))

    return this
  }

  hasDependencies() {
    return this.#dependencies.size > 0
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
   * @returns {this} Returns this instance for method chaining
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
   * @throws {Error} If there is already a pool.
   * @returns {this} Returns this instance for method chaining
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
   * Checks if the theme has compiled output.
   *
   * @returns {boolean} True if theme has been compiled
   */
  hasOutput() {
    return this.#output !== null
  }

  /**
   * Checks if the theme has loaded source data.
   *
   * @returns {boolean} True if source data is available
   */
  hasSource() {
    return this.#source !== null
  }

  /**
   * Checks if the theme has a cache instance.
   *
   * @returns {boolean} True if cache is available
   */
  hasCache() {
    return this.#cache !== null
  }

  /**
   * Checks if the theme has lookup data.
   *
   * @returns {boolean} True if lookup data exists
   */
  hasLookup() {
    return this.#lookup !== null
  }

  /**
   * Checks if the theme is ready to be compiled.
   * Requires source data and cache to be available.
   *
   * @returns {boolean} True if theme can be compiled
   */
  isReady() {
    return this.hasSource() && this.hasCache()
  }

  /**
   * Checks if the theme has been fully compiled.
   * Requires output, pool, and lookup data to be present.
   *
   * @returns {boolean} True if theme is fully compiled
   */
  isCompiled() {
    return this.hasOutput() && this.hasPool() && this.hasLookup()
  }

  /**
   * Checks if the theme can be built/compiled.
   * Same as isReady() but with more semantic naming.
   *
   * @returns {boolean} True if build can proceed
   */
  canBuild() {
    return this.isReady()
  }

  /**
   * Checks if the theme can be written to output.
   * Requires the theme to be compiled.
   *
   * @returns {boolean} True if write can proceed
   */
  canWrite() {
    return this.hasOutput()
  }

  /**
   * Checks if the theme is in a valid state for operation.
   * Basic validation that core properties are set.
   *
   * @returns {boolean} True if theme state is valid
   */
  isValid() {
    return this.#sourceFile !== null && this.#name !== null
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

    this.addDependency(this.#sourceFile, this.#source)

    return this
  }

  /**
   * Builds the theme by compiling source data into final output.
   * Main entry point for theme compilation process.
   *
   * @returns {Promise<this>} Returns this instance for method chaining
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
        : obviouslyASentinelYouCantMissSoShutUpAboutIt

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

export class Dependency {
  #sourceFile = null
  #source = null

  /**
   * Sets the file object for this dependency.
   *
   * @param {FileObject} file - The file object of this dependency.
   * @returns {this} This.
   */
  setSourceFile(file) {
    if(!this.#sourceFile)
      this.#sourceFile = file

    return this
  }

  /**
   * Get the file object for this depenency.
   *
   * @returns {FileObject} The file object of this dependency.
   */
  getSourceFile() {
    return this.#sourceFile
  }

  /**
   * Sets the source object for this dependency.
   *
   * @param {object} source - The parsed JSON from the file after loading.
   * @returns {this} This.
   */
  setSource(source) {
    if(!this.#source)
      this.#source = source

    return this
  }

  getSource() {
    return this.#source
  }

  /**
   * Checks if the dependency has a source file.
   *
   * @returns {boolean} True if source file is set
   */
  hasSourceFile() {
    return this.#sourceFile !== null
  }

  /**
   * Checks if the dependency has parsed source data.
   *
   * @returns {boolean} True if source data is available
   */
  hasSource() {
    return this.#source !== null
  }

  /**
   * Checks if the dependency is fully initialized.
   *
   * @returns {boolean} True if both file and source are set
   */
  isComplete() {
    return this.hasSourceFile() && this.hasSource()
  }
}
