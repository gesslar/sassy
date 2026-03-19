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
import {Collection, DirectoryObject, FileSystem as FS, Sass, Term, Util} from "@gesslar/toolkit"
import {stringify} from "yaml"
import path from "node:path"
import Compiler from "./Compiler.js"
import ThemePool from "./ThemePool.js"
import YamlSource from "./YamlSource.js"

/**
 * @import {Cache} from "@gesslar/toolkit"
 * @import {DirectoryObject} from "@gesslar/toolkit"
 * @import {FileObject} from "@gesslar/toolkit"
 */

const outputFileExtension = "color-theme.json"
const obviouslyASentinelYouCantMissSoShutUpAboutIt = "kakadoodoo"

/**
 * @typedef {object} RuntimeConfigurationOptions
 * @property {string} [outputDir="."] - The directory to output this theme's result.
 * @property {boolean} [dryRun=false] - Whether this is a dry-run (output to stdout)
 */

// Symbol enums for magic values
export const WriteStatus = Object.freeze({
  DRY_RUN: "dry-run",
  SKIPPED: "skipped",
  WRITTEN: "written",
})

const PropertyKey = Object.freeze({
  CONFIG: "config"
})

/**
 * Theme class: manages the lifecycle of a theme compilation unit.
 * See file-level docstring for responsibilities.
 */
export default class Theme {
  #sourceFile = null
  #source = null
  /** Run time options for this theme. @type {RuntimeConfigurationOptions} */
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
  /** @type {YamlSource?} */
  #mainYamlSource = null
  #proof = null

  // Write-related properties
  #output = null
  #outputJson = null
  #outputFileName = null
  #outputHash = null
  #outputFile = null
  #outputDir = null

  #cwd = null

  /**
   * Sets the theme source file and derives the theme name from it.
   * Recomputes the output path after updating.
   *
   * @param {FileObject} file - The theme source file
   * @returns {Theme} Returns this instance for method chaining
   */
  setThemeFile(file) {
    this.#sourceFile = file

    if(this.#cache && !file.cached)
      file.withCache(this.#cache)

    const {name} = /^(?<name>.*?)(?:\.sassy)?$/.exec(file.module)?.groups ?? {}
    this.#name = name ?? file.module
    this.#computeOutputPath()

    return this
  }

  /**
   * Sets the current working directory for relative path resolution.
   * Recomputes the output path after updating.
   *
   * @param {DirectoryObject} cwd - The current working directory
   * @returns {Theme} Returns this instance for method chaining
   */
  setCwd(cwd) {
    this.#cwd = cwd
    this.#computeOutputPath()

    return this
  }

  /**
   * Attach options to the theme processing... err process.
   *
   * @param {RuntimeConfigurationOptions} options - Options for processing this theme
   * @returns {Theme} This instance, for chaining
   */
  setOptions(options={}) {
    this.#options = Object.assign(
      this.#options ?? {},
      {
        dryRun: false,
        outputDir: ".",
      },
      options
    )

    this.#computeOutputPath()

    return this
  }

  /**
   * Recomputes the derived output path properties from current state.
   * Called whenever cwd, themeFile, or options change so derived
   * state remains consistent regardless of setter call order.
   *
   * @private
   */
  #computeOutputPath() {
    if(!this.#name || !this.#options)
      return

    const {outputDir = "."} = this.#options

    this.#outputFileName = `${this.#name}.${outputFileExtension}`

    if(path.isAbsolute(outputDir)) {
      this.#outputDir = new DirectoryObject(outputDir)
    } else {
      if(this.#cwd) {
        if(outputDir === ".") {
          this.#outputDir = this.#cwd
        } else {
          this.#outputDir = this.#cwd.getDirectory(outputDir)
        }
      } else {
        const parentPath = this.#sourceFile.parentPath
        const resolved = FS.resolvePath(parentPath, outputDir)

        this.#outputDir = new DirectoryObject(resolved)
      }
    }

    this.#outputFile = this.#outputDir?.getFile(this.#outputFileName) ?? null
  }

  /**
   * Looks up a source location for a dotted key path across all dependencies.
   * Searches in reverse dependency order so the effective definition is found
   * first — the main theme file overrides imports, and later imports override
   * earlier ones.
   *
   * @param {string} dottedPath - Dot-separated key path (e.g. "vars.bg")
   * @param {"key"|"value"} [target="key"] - Whether to locate the key or value
   * @returns {string?} Formatted "file:line:col" string or null
   */
  findSourceLocation(dottedPath, target = "key") {
    const deps = [...this.#dependencies]

    for(let i = deps.length - 1; i >= 0; i--) {
      const yamlSource = deps[i].getYamlSource()

      if(!yamlSource)
        continue

      const formatted = yamlSource.formatLocation(dottedPath, target)

      if(formatted)
        return formatted
    }

    return null
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
    this.#proof = null
    this.#dependencies = new Set()
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
   * Sets the cache instance and propagates it to the source file and all
   * existing dependencies. If a cache is already set, it does not overwrite it.
   *
   * @param {Cache} cache - The cache instance
   * @returns {Theme} Returns this instance for method chaining
   */
  setCache(cache) {
    if(!this.#cache)
      this.#cache = cache

    if(this.#sourceFile && !this.#sourceFile.cached)
      this.#sourceFile.withCache(cache)

    for(const dep of this.#dependencies) {
      const file = dep.getSourceFile()

      if(file && !file.cached)
        file.withCache(cache)
    }

    return this
  }

  /**
   * Gets the current working directory.
   *
   * @returns {DirectoryObject?} The current working directory
   */
  getCwd() {
    return this.#cwd
  }

  /**
   * Gets the compilation options.
   *
   * @returns {RuntimeConfigurationOptions?} The compilation options object
   */
  getOptions() {
    return this.#options
      ? Collection.deepFreezeObject(this.#options)
      : this.#options
  }

  /**
   * Gets a specific compilation option.
   *
   * @param {string} option - The option name to retrieve
   * @returns {unknown} The option value or undefined if not set
   */
  getOption(option) {
    return this.#options?.[option] ?? undefined
  }

  /**
   * Gets the theme name.
   *
   * @returns {string?} The theme name derived from the source file
   */
  getName() {
    return this.#name
  }

  /**
   * Gets the output file name for the compiled theme.
   *
   * @returns {string?} The output file name with extension
   */
  getOutputFileName() {
    return this.#outputFileName
  }

  /**
   * Gets the output file object.
   *
   * @returns {FileObject?} The output file object
   */
  getOutputFile() {
    return this.#outputFile
  }

  /**
   * Gets the source file object.
   *
   * @returns {FileObject?} The source theme file
   */
  getSourceFile() {
    return this.#sourceFile
  }

  /**
   * Gets the YAML source built from the main theme file during load().
   * Used by Compiler to add the main file as the last dependency after
   * all imports have been registered.
   *
   * @returns {YamlSource?} The YAML source or null
   */
  getMainYamlSource() {
    return this.#mainYamlSource
  }

  /**
   * Gets the compiled theme output object.
   *
   * @returns {unknown?} The compiled theme output
   */
  getOutput() {
    return this.#output
  }

  /**
   * Gets a section of the parsed source data by dotted path.
   * Supports top-level keys and nested theme sections.
   *
   * @param {string} section - Dot-separated path (e.g. "config",
   *   "vars", "theme.colors", "theme.tokenColors")
   * @returns {unknown} The section data or undefined if not present
   */
  getSourceSection(section) {
    const keys = section.split(".")
    let current = this.#source

    for(const key of keys) {
      if(current == null)
        return undefined

      current = current[key]
    }

    return current
  }

  /**
   * Gets the set of file dependencies.
   *
   * @returns {Set<Dependency>} Set of dependency files
   */
  getDependencies() {
    return this.#dependencies
  }

  /**
   * Adds a dependency to the theme with its source data.
   *
   * @param {FileObject} file - The dependency file object
   * @param {unknown} source - The parsed source data from the file
   * @returns {this} Returns this instance for method chaining
   */
  addDependency(file, source, yamlSource = null) {
    const dep = new Dependency()
      .setSourceFile(file)
      .setSource(source)

    if(yamlSource)
      dep.setYamlSource(yamlSource)

    this.#dependencies.add(dep)

    return this
  }

  /**
   * Checks if the theme has any dependencies.
   *
   * @returns {boolean} True if theme has dependencies
   */
  hasDependencies() {
    return this.#dependencies.size > 0
  }

  /**
   * Gets the parsed source data from the theme file.
   *
   * @returns {unknown?} The parsed source data
   */
  getSource() {
    return this.#source
  }

  /**
   * Gets the variable lookup data for theme compilation.
   *
   * @returns {unknown?} The lookup data object
   */
  getLookup() {
    return this.#lookup
  }

  /**
   * Sets the variable lookup data for theme compilation.
   *
   * @param {unknown} data - The lookup data object
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
   * @returns {ThemePool?} The pool for this theme.
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
   * Stores the composed, unevaluated proof object on this theme.
   * Set during compilation so that subsequent proof requests can
   * return the cached result without recomposing.
   *
   * @param {object} proof - The composed proof object
   * @returns {this} Returns this instance for method chaining
   */
  setProof(proof) {
    this.#proof = proof

    return this
  }

  /**
   * Gets the cached proof (composed, unevaluated theme document).
   *
   * @param {boolean} [asObject=false] - When true, returns the proof
   *   as a plain object. When false (default), returns a YAML string.
   * @returns {object|string|null} The proof, or null if not cached
   */
  getProof(asObject=false) {
    if(this.#proof === null)
      return null

    if(asObject)
      return this.#proof

    return stringify(this.#proof, {lineWidth: 0})
  }

  /**
   * Whether a cached proof exists on this theme.
   *
   * @returns {boolean} True if a proof has been stored
   */
  hasProof() {
    return this.#proof !== null
  }

  /**
   * Whether the theme has compiled output data available.
   * True after a successful `build()`.
   *
   * @returns {boolean} True if `setOutput()` has been called
   */
  hasOutput() {
    return this.#output !== null
  }

  /**
   * Whether the theme has loaded and parsed its source file.
   * True after a successful `load()`.
   *
   * @returns {boolean} True if source data is available
   */
  hasSource() {
    return this.#source !== null
  }

  /**
   * Whether the full compilation pipeline has completed.
   * Checks that output, variable pool, and lookup table are
   * all present — all three are set together by `Compiler.compile()`.
   *
   * @returns {boolean} True if output, pool, and lookup exist
   */
  isCompiled() {
    return this.hasOutput()
      && this.#pool instanceof ThemePool
      && this.#lookup !== null
  }

  /**
   * Whether the theme has enough state to enter the build pipeline.
   * Requires source data from `load()`.
   *
   * @returns {boolean} True if `load()` has succeeded
   */
  canBuild() {
    return this.hasSource()
  }

  /**
   * Whether the theme has compiled output ready for writing.
   * Requires at least a successful `build()`.
   *
   * @returns {boolean} True if output data exists
   */
  canWrite() {
    return this.hasOutput()
  }

  /**
   * Whether the theme has the minimum configuration to operate:
   * a source file and a derived name. True after `setThemeFile()`
   * has been called.
   *
   * @returns {boolean} True if source file and name are set
   */
  isValid() {
    return this.#sourceFile !== null && this.#name !== null
  }

  /**
   * Loads and parses the theme source file.
   * Validates that the source contains required configuration.
   * Uses cache when available, otherwise reads the file directly.
   *
   * @returns {Promise<this>} Returns this instance for method chaining
   * @throws {Sass} If source file lacks required 'config' property
   */
  async load() {
    this.#proof = null
    const source = await this.#sourceFile.loadData()

    if(!source?.[PropertyKey.CONFIG]) {
      const label = this.#cwd
        ? this.#sourceFile.relativeTo(this.#cwd)
        : this.#sourceFile.path

      throw Sass.new(
        `'${label}' does not contain '${PropertyKey.CONFIG}' property.`
      )
    }

    this.#source = source

    // Build YAML AST for source-location tracking; deferred to after imports
    // are added by Compiler so dependency order matches composition order.
    this.#mainYamlSource =
      await YamlSource.fromFile(this.#sourceFile, this.#cwd)

    return this
  }

  /**
   * Builds the theme by compiling source data into final output.
   * Main entry point for theme compilation process.
   *
   * @returns {Promise<this>} Returns this instance for method chaining
   */
  async build() {
    const compiler = new Compiler({cache: this.#cache})
    await compiler.compile(this)

    return this
  }

  /**
   * Writes the compiled theme output to a file or stdout.
   * Handles dry-run mode, output directory creation, and duplicate write prevention.
   *
   * @param {boolean} [force=false] - Force a write. Used by the rebuild CLI option.
   * @returns {Promise<undefined>} Resolves when write operation is complete
   */
  async write(force=false) {
    const file = this.#outputFile

    if(!file)
      throw Sass.new(`No output file configured.`)

    const output = this.#outputJson

    if(this.#options?.dryRun) {
      Term.log(this.#outputJson)

      return {status: WriteStatus.DRY_RUN, file}
    }

    // Skip identical bytes
    if(!force && !await this.wouldWrite())
      return {status: WriteStatus.SKIPPED, file}

    // Real write (timed)
    if(this.#outputDir && !await this.#outputDir.exists)
      await this.#outputDir.assureExists()

    await file.write(output)

    return {status: WriteStatus.WRITTEN, bytes: output.length, file}
  }

  /**
   * Checks whether the compiled output differs from the existing file on disk.
   * Compares the sha256 hash of the current output against the file contents.
   *
   * @returns {Promise<boolean>} True when the output would produce a new write
   */
  async wouldWrite() {
    const file = this.#outputFile

    if(!file)
      throw Sass.new(`No output file configured.`)

    if(!this.canWrite())
      throw Sass.new(`No compiled output available. Call build() first.`)

    const nextHash = this.#outputHash
    const lastHash = await file.exists
      ? Util.hashOf(await file.read())
      : obviouslyASentinelYouCantMissSoShutUpAboutIt

    return lastHash !== nextHash
  }
}

/**
 * Dependency class represents a theme file dependency.
 * Manages the relationship between a file reference and its parsed source data.
 */
export class Dependency {
  #sourceFile = null
  #source = null
  /** @type {YamlSource?} */
  #yamlSource = null

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
   * @returns {FileObject?} The file object of this dependency.
   */
  getSourceFile() {
    return this.#sourceFile
  }

  /**
   * Sets the source object for this dependency.
   *
   * @param {unknown} source - The parsed JSON from the file after loading.
   * @returns {this} This.
   */
  setSource(source) {
    if(!this.#source)
      this.#source = source

    return this
  }

  /**
   * Gets the parsed source data for this dependency.
   *
   * @returns {object?} The parsed source data
   */
  getSource() {
    return this.#source
  }

  /**
   * Sets the YAML AST source for location tracking.
   *
   * @param {YamlSource} yamlSource - The parsed YAML source
   * @returns {this} This.
   */
  setYamlSource(yamlSource) {
    if(!this.#yamlSource)
      this.#yamlSource = yamlSource

    return this
  }

  /**
   * Gets the YAML AST source for location tracking.
   *
   * @returns {YamlSource?} The YAML source or null
   */
  getYamlSource() {
    return this.#yamlSource
  }

  /**
   * Checks if the dependency has a YAML source.
   *
   * @returns {boolean} True if YAML source is available
   */
  hasYamlSource() {
    return this.#yamlSource !== null
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
  isReady() {
    return this.hasSourceFile() && this.hasSource()
  }
}
