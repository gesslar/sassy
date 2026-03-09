/**
 * Theme class: manages the lifecycle of a theme compilation unit.
 * See file-level docstring for responsibilities.
 */
export default class Theme {
    setThemeFile(file: any): this;
    setCwd(cwd: any): this;
    withOptions(options: any): this;
    /**
     * Looks up a source location for a dotted key path across all dependencies.
     * Returns the first match found (main theme file checked last since
     * dependencies are added before it in composition order).
     *
     * @param {string} dottedPath - Dot-separated key path (e.g. "vars.bg")
     * @param {"key"|"value"} [target="key"] - Whether to locate the key or value
     * @returns {string|null} Formatted "file:line:col" string or null
     */
    findSourceLocation(dottedPath: string, target?: "key" | "value"): string | null;
    /**
     * Resets the theme's compilation state, clearing output and lookup data.
     * Used when recompiling in watch mode or clearing previous state.
     */
    reset(): void;
    /**
     * Gets the current working directory.
     *
     * @returns {DirectoryObject} The current working directory
     */
    getCwd(): DirectoryObject;
    /**
     * Gets the compilation options.
     *
     * @returns {object} The compilation options object
     */
    getOptions(): object;
    /**
     * Gets a specific compilation option.
     *
     * @param {string} option - The option name to retrieve
     * @returns {unknown} The option value or undefined if not set
     */
    getOption(option: string): unknown;
    /**
     * Sets the cache instance, used for propagation to imported files.
     *
     * @param {Cache} cache - The cache instance
     * @returns {this} Returns this instance for method chaining
     */
    setCache(cache: Cache): this;
    /**
     * Gets the theme name.
     *
     * @returns {string} The theme name derived from the source file
     */
    getName(): string;
    /**
     * Gets the output file name for the compiled theme.
     *
     * @returns {string} The output file name with extension
     */
    getOutputFileName(): string;
    /**
     * Gets the output file object.
     *
     * @returns {FileObject|null} The output file object
     */
    getOutputFile(): FileObject | null;
    /**
     * Gets the source file object.
     *
     * @returns {FileObject} The source theme file
     */
    getSourceFile(): FileObject;
    /**
     * Gets the YAML source built from the main theme file during load().
     * Used by Compiler to add the main file as the last dependency after
     * all imports have been registered.
     *
     * @returns {import("./YamlSource.js").default|null} The YAML source or null
     */
    getMainYamlSource(): import("./YamlSource.js").default | null;
    /**
     * Sets the compiled theme output object and updates derived JSON and hash.
     *
     * @param {object} data - The compiled theme output object
     * @returns {this} Returns this instance for method chaining
     */
    setOutput(data: object): this;
    /**
     * Gets the compiled theme output object.
     *
     * @returns {object|null} The compiled theme output
     */
    getOutput(): object | null;
    /**
     * Checks if the source has colors defined.
     *
     * @returns {boolean} True if source has theme colors
     */
    sourceHasColors(): boolean;
    /**
     * Checks if the source has token colors defined.
     *
     * @returns {boolean} True if source has theme token colors
     */
    sourceHasTokenColors(): boolean;
    /**
     * Checks if the source has semantic token colors defined.
     *
     * @returns {boolean} True if source has theme semantic token colors
     */
    sourceHasSemanticTokenColors(): boolean;
    /**
     * Checks if the source has theme configuration.
     *
     * @returns {boolean} True if source has theme data
     */
    sourceHasTheme(): boolean;
    /**
     * Checks if the source has variables.
     *
     * @returns {boolean} True if source has vars section
     */
    sourceHasVars(): boolean;
    /**
     * Checks if the source has config section.
     *
     * @returns {boolean} True if source has config
     */
    sourceHasConfig(): boolean;
    /**
     * Gets the source colors data.
     *
     * @returns {object|null} The colors object or null if not defined
     */
    getSourceColors(): object | null;
    /**
     * Gets the source token colors data.
     *
     * @returns {Array|null} The token colors array or null if not defined
     */
    getSourceTokenColors(): any[] | null;
    /**
     * Gets the source semantic token colors data.
     *
     * @returns {object|null} The semantic token colors object or null if not defined
     */
    getSourceSemanticTokenColors(): object | null;
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
     * @param {object} source - The parsed source data from the file
     * @returns {this} Returns this instance for method chaining
     */
    addDependency(file: FileObject, source: object, yamlSource?: any): this;
    /**
     * Checks if the theme has any dependencies.
     *
     * @returns {boolean} True if theme has dependencies
     */
    hasDependencies(): boolean;
    /**
     * Gets the parsed source data from the theme file.
     *
     * @returns {object|null} The parsed source data
     */
    getSource(): object | null;
    /**
     * Gets the variable lookup data for theme compilation.
     *
     * @returns {object|null} The lookup data object
     */
    getLookup(): object | null;
    /**
     * Sets the variable lookup data for theme compilation.
     *
     * @param {object} data - The lookup data object
     * @returns {this} Returns this instance for method chaining
     */
    setLookup(data: object): this;
    /**
     * Gets the pool data for variable resolution tracking or null if one has
     * not been set.
     *
     * @returns {ThemePool|null} The pool for this theme.
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
     * Method to return true or false if this theme has a pool.
     *
     * @returns {boolean} True if a pool has been set, false otherwise.
     */
    hasPool(): boolean;
    /**
     * Checks if the theme has compiled output.
     *
     * @returns {boolean} True if theme has been compiled
     */
    hasOutput(): boolean;
    /**
     * Checks if the theme has loaded source data.
     *
     * @returns {boolean} True if source data is available
     */
    hasSource(): boolean;
    /**
     * Checks if the theme has lookup data.
     *
     * @returns {boolean} True if lookup data exists
     */
    hasLookup(): boolean;
    /**
     * Checks if the theme is ready to be compiled.
     * Requires source data to be available.
     *
     * @returns {boolean} True if theme can be compiled
     */
    isReady(): boolean;
    /**
     * Checks if the theme has been fully compiled.
     * Requires output, pool, and lookup data to be present.
     *
     * @returns {boolean} True if theme is fully compiled
     */
    isCompiled(): boolean;
    /**
     * Checks if the theme can be built/compiled.
     * Same as isReady() but with more semantic naming.
     *
     * @returns {boolean} True if build can proceed
     */
    canBuild(): boolean;
    /**
     * Checks if the theme can be written to output.
     * Requires the theme to be compiled.
     *
     * @returns {boolean} True if write can proceed
     */
    canWrite(): boolean;
    /**
     * Checks if the theme is in a valid state for operation.
     * Basic validation that core properties are set.
     *
     * @returns {boolean} True if theme state is valid
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
     * @param {boolean} [force] - Force a write. Used by the rebuild CLI option.
     * @returns {Promise<void>} Resolves when write operation is complete
     */
    write(force?: boolean): Promise<void>;
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
     * @returns {FileObject} The file object of this dependency.
     */
    getSourceFile(): FileObject;
    /**
     * Sets the source object for this dependency.
     *
     * @param {object} source - The parsed JSON from the file after loading.
     * @returns {this} This.
     */
    setSource(source: object): this;
    /**
     * Gets the parsed source data for this dependency.
     *
     * @returns {object|null} The parsed source data
     */
    getSource(): object | null;
    /**
     * Sets the YAML AST source for location tracking.
     *
     * @param {import("./YamlSource.js").default} yamlSource - The parsed YAML source
     * @returns {this} This.
     */
    setYamlSource(yamlSource: import("./YamlSource.js").default): this;
    /**
     * Gets the YAML AST source for location tracking.
     *
     * @returns {import("./YamlSource.js").default|null} The YAML source or null
     */
    getYamlSource(): import("./YamlSource.js").default | null;
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
    isComplete(): boolean;
    #private;
}
import { DirectoryObject } from "@gesslar/toolkit";
import type { Cache } from "@gesslar/toolkit";
import type { FileObject } from "@gesslar/toolkit";
import ThemePool from "./ThemePool.js";
//# sourceMappingURL=Theme.d.ts.map