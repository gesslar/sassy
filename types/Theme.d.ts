/**
 * @typedef {object} RuntimeConfigurationOptions
 * @property {string} [outputDir="."] - The directory to output this theme's result.
 * @property {boolean} [dryRun=false] - Whether this is a dry-run (output to stdout)
 */
export const WriteStatus: Readonly<{
    DRY_RUN: "dry-run";
    SKIPPED: "skipped";
    WRITTEN: "written";
}>;
/**
 * Theme class: manages the lifecycle of a theme compilation unit.
 * See file-level docstring for responsibilities.
 */
export default class Theme {
    /**
     * Sets the theme source file and derives the theme name from it.
     * Recomputes the output path after updating.
     *
     * @param {FileObject} file - The theme source file
     * @returns {Theme} Returns this instance for method chaining
     */
    setThemeFile(file: FileObject): Theme;
    /**
     * Sets the current working directory for relative path resolution.
     * Recomputes the output path after updating.
     *
     * @param {DirectoryObject} cwd - The current working directory
     * @returns {Theme} Returns this instance for method chaining
     */
    setCwd(cwd: DirectoryObject): Theme;
    /**
     * Attach options to the theme processing... err process.
     *
     * @param {RuntimeConfigurationOptions} options - Options for processing this theme
     * @returns {Theme} This instance, for chaining
     */
    setOptions(options?: RuntimeConfigurationOptions): Theme;
    /**
     * Looks up a source location for a dotted key path across all dependencies.
     * Returns the first match found (main theme file checked last since
     * dependencies are added before it in composition order).
     *
     * @param {string} dottedPath - Dot-separated key path (e.g. "vars.bg")
     * @param {"key"|"value"} [target="key"] - Whether to locate the key or value
     * @returns {string?} Formatted "file:line:col" string or null
     */
    findSourceLocation(dottedPath: string, target?: "key" | "value"): string | null;
    /**
     * Resets the theme's compilation state, clearing output and lookup data.
     * Used when recompiling in watch mode or clearing previous state.
     */
    reset(): void;
    /**
     * Sets the compiled theme output object and updates derived JSON and hash.
     *
     * @param {object} data - The compiled theme output object
     * @returns {this} Returns this instance for method chaining
     */
    setOutput(data: object): this;
    /**
     * Sets the cache instance and propagates it to the source file and all
     * existing dependencies. If a cache is already set, it does not overwrite it.
     *
     * @param {Cache} cache - The cache instance
     * @returns {Theme} Returns this instance for method chaining
     */
    setCache(cache: Cache): Theme;
    /**
     * Gets the current working directory.
     *
     * @returns {DirectoryObject?} The current working directory
     */
    getCwd(): DirectoryObject | null;
    /**
     * Gets the compilation options.
     *
     * @returns {RuntimeConfigurationOptions?} The compilation options object
     */
    getOptions(): RuntimeConfigurationOptions | null;
    /**
     * Gets a specific compilation option.
     *
     * @param {string} option - The option name to retrieve
     * @returns {unknown} The option value or undefined if not set
     */
    getOption(option: string): unknown;
    /**
     * Gets the theme name.
     *
     * @returns {string?} The theme name derived from the source file
     */
    getName(): string | null;
    /**
     * Gets the output file name for the compiled theme.
     *
     * @returns {string?} The output file name with extension
     */
    getOutputFileName(): string | null;
    /**
     * Gets the output file object.
     *
     * @returns {FileObject?} The output file object
     */
    getOutputFile(): FileObject | null;
    /**
     * Gets the source file object.
     *
     * @returns {FileObject?} The source theme file
     */
    getSourceFile(): FileObject | null;
    /**
     * Gets the YAML source built from the main theme file during load().
     * Used by Compiler to add the main file as the last dependency after
     * all imports have been registered.
     *
     * @returns {YamlSource?} The YAML source or null
     */
    getMainYamlSource(): YamlSource | null;
    /**
     * Gets the compiled theme output object.
     *
     * @returns {unknown?} The compiled theme output
     */
    getOutput(): unknown | null;
    /**
     * Gets a section of the parsed source data by dotted path.
     * Supports top-level keys and nested theme sections.
     *
     * @param {string} section - Dot-separated path (e.g. "config",
     *   "vars", "theme.colors", "theme.tokenColors")
     * @returns {unknown} The section data or undefined if not present
     */
    getSourceSection(section: string): unknown;
    /**
     * Gets the set of file dependencies.
     *
     * @returns {Set<Dependency>} Set of dependency files
     */
    getDependencies(): Set<Dependency>;
    /**
     * Adds a dependency to the theme with its source data.
     *
     * @param {FileObject} file - The dependency file object
     * @param {unknown} source - The parsed source data from the file
     * @returns {this} Returns this instance for method chaining
     */
    addDependency(file: FileObject, source: unknown, yamlSource?: any): this;
    /**
     * Checks if the theme has any dependencies.
     *
     * @returns {boolean} True if theme has dependencies
     */
    hasDependencies(): boolean;
    /**
     * Gets the parsed source data from the theme file.
     *
     * @returns {unknown?} The parsed source data
     */
    getSource(): unknown | null;
    /**
     * Gets the variable lookup data for theme compilation.
     *
     * @returns {unknown?} The lookup data object
     */
    getLookup(): unknown | null;
    /**
     * Sets the variable lookup data for theme compilation.
     *
     * @param {unknown} data - The lookup data object
     * @returns {this} Returns this instance for method chaining
     */
    setLookup(data: unknown): this;
    /**
     * Gets the pool data for variable resolution tracking or null if one has
     * not been set.
     *
     * @returns {ThemePool?} The pool for this theme.
     */
    getPool(): ThemePool | null;
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
    setPool(pool: ThemePool): this;
    /**
     * Stores the composed, unevaluated proof object on this theme.
     * Set during compilation so that subsequent proof requests can
     * return the cached result without recomposing.
     *
     * @param {object} proof - The composed proof object
     * @returns {this} Returns this instance for method chaining
     */
    setProof(proof: object): this;
    /**
     * Gets the cached proof (composed, unevaluated theme document).
     *
     * @param {boolean} [asObject=false] - When true, returns the proof
     *   as a plain object. When false (default), returns a YAML string.
     * @returns {object|string|null} The proof, or null if not cached
     */
    getProof(asObject?: boolean): object | string | null;
    /**
     * Whether a cached proof exists on this theme.
     *
     * @returns {boolean} True if a proof has been stored
     */
    hasProof(): boolean;
    /**
     * Whether the theme has compiled output data available.
     * True after a successful `build()`.
     *
     * @returns {boolean} True if `setOutput()` has been called
     */
    hasOutput(): boolean;
    /**
     * Whether the theme has loaded and parsed its source file.
     * True after a successful `load()`.
     *
     * @returns {boolean} True if source data is available
     */
    hasSource(): boolean;
    /**
     * Whether the full compilation pipeline has completed.
     * Checks that output, variable pool, and lookup table are
     * all present — all three are set together by `Compiler.compile()`.
     *
     * @returns {boolean} True if output, pool, and lookup exist
     */
    isCompiled(): boolean;
    /**
     * Whether the theme has enough state to enter the build pipeline.
     * Requires source data from `load()`.
     *
     * @returns {boolean} True if `load()` has succeeded
     */
    canBuild(): boolean;
    /**
     * Whether the theme has compiled output ready for writing.
     * Requires at least a successful `build()`.
     *
     * @returns {boolean} True if output data exists
     */
    canWrite(): boolean;
    /**
     * Whether the theme has the minimum configuration to operate:
     * a source file and a derived name. True after `setThemeFile()`
     * has been called.
     *
     * @returns {boolean} True if source file and name are set
     */
    isValid(): boolean;
    /**
     * Loads and parses the theme source file.
     * Validates that the source contains required configuration.
     * Uses cache when available, otherwise reads the file directly.
     *
     * @returns {Promise<this>} Returns this instance for method chaining
     * @throws {Sass} If source file lacks required 'config' property
     */
    load(): Promise<this>;
    /**
     * Builds the theme by compiling source data into final output.
     * Main entry point for theme compilation process.
     *
     * @returns {Promise<this>} Returns this instance for method chaining
     */
    build(): Promise<this>;
    /**
     * Writes the compiled theme output to a file or stdout.
     * Handles dry-run mode, output directory creation, and duplicate write prevention.
     *
     * @param {boolean} [force=false] - Force a write. Used by the rebuild CLI option.
     * @returns {Promise<undefined>} Resolves when write operation is complete
     */
    write(force?: boolean): Promise<undefined>;
    #private;
}
/**
 * Dependency class represents a theme file dependency.
 * Manages the relationship between a file reference and its parsed source data.
 */
export class Dependency {
    /**
     * Sets the file object for this dependency.
     *
     * @param {FileObject} file - The file object of this dependency.
     * @returns {this} This.
     */
    setSourceFile(file: FileObject): this;
    /**
     * Get the file object for this depenency.
     *
     * @returns {FileObject?} The file object of this dependency.
     */
    getSourceFile(): FileObject | null;
    /**
     * Sets the source object for this dependency.
     *
     * @param {unknown} source - The parsed JSON from the file after loading.
     * @returns {this} This.
     */
    setSource(source: unknown): this;
    /**
     * Gets the parsed source data for this dependency.
     *
     * @returns {object?} The parsed source data
     */
    getSource(): object | null;
    /**
     * Sets the YAML AST source for location tracking.
     *
     * @param {YamlSource} yamlSource - The parsed YAML source
     * @returns {this} This.
     */
    setYamlSource(yamlSource: YamlSource): this;
    /**
     * Gets the YAML AST source for location tracking.
     *
     * @returns {YamlSource?} The YAML source or null
     */
    getYamlSource(): YamlSource | null;
    /**
     * Checks if the dependency has a YAML source.
     *
     * @returns {boolean} True if YAML source is available
     */
    hasYamlSource(): boolean;
    /**
     * Checks if the dependency has a source file.
     *
     * @returns {boolean} True if source file is set
     */
    hasSourceFile(): boolean;
    /**
     * Checks if the dependency has parsed source data.
     *
     * @returns {boolean} True if source data is available
     */
    hasSource(): boolean;
    /**
     * Checks if the dependency is fully initialized.
     *
     * @returns {boolean} True if both file and source are set
     */
    isReady(): boolean;
    #private;
}
export type RuntimeConfigurationOptions = {
    /**
     * - The directory to output this theme's result.
     */
    outputDir?: string;
    /**
     * - Whether this is a dry-run (output to stdout)
     */
    dryRun?: boolean;
};
import type { FileObject } from "@gesslar/toolkit";
import { DirectoryObject } from "@gesslar/toolkit";
import type { Cache } from "@gesslar/toolkit";
import YamlSource from "./YamlSource.js";
import ThemePool from "./ThemePool.js";
//# sourceMappingURL=Theme.d.ts.map