/**
 * @import {DirectoryObject} from "@gesslar/toolkit"
 * @import {FileObject} from "@gesslar/toolkit"
 * @import {Cache} from "@gesslar/toolkit"
 */
/**
 * Base class for command-line interface commands.
 * Provides common functionality for CLI option handling and file resolution.
 */
export default class Command {
    /**
     * Creates a new Command instance.
     *
     * @param {DirectoryObject} config.cwd - Current working directory object
     * @param {object} config.packageJson - Package.json data
     */
    constructor({ cwd, packageJson }: DirectoryObject);
    /**
     * Gets the current working directory object.
     *
     * @returns {DirectoryObject} The current working directory
     */
    getCwd(): DirectoryObject;
    /**
     * Gets the package.json data.
     *
     * @returns {object} The package.json object
     */
    getPackageJson(): object;
    /**
     * Sets the cache instance for the command.
     *
     * @param {Cache} cache - The cache instance to set
     * @returns {this} Returns this instance for method chaining
     */
    setCache(cache: Cache): this;
    /**
     * Gets the cache instance.
     *
     * @returns {Cache|null} The cache instance or null if not set
     */
    getCache(): Cache | null;
    /**
     * Sets the CLI command string.
     *
     * @param {string} data - The CLI command string
     * @returns {this} Returns this instance for method chaining
     */
    setCliCommand(data: string): this;
    /**
     * Gets the CLI command string.
     *
     * @returns {string|null} The CLI command string
     */
    getCliCommand(): string | null;
    /**
     * Sets the CLI options object.
     *
     * @param {object} data - The CLI options configuration
     * @returns {this} Returns this instance for method chaining
     */
    setCliOptions(data: object): this;
    /**
     * Gets the CLI options object.
     *
     * @returns {object|null} The CLI options configuration
     */
    getCliOptions(): object | null;
    /**
     * Gets the array of CLI option names.
     *
     * @returns {Array<string>} Array of option names
     */
    getCliOptionNames(): Array<string>;
    /**
     * Checks if the command has a cache instance.
     *
     * @returns {boolean} True if cache is available
     */
    hasCache(): boolean;
    /**
     * Checks if the command has a CLI command string configured.
     *
     * @returns {boolean} True if CLI command is set
     */
    hasCliCommand(): boolean;
    /**
     * Checks if the command has CLI options configured.
     *
     * @returns {boolean} True if CLI options are set
     */
    hasCliOptions(): boolean;
    /**
     * Checks if the command is ready to be built.
     * Requires both CLI command and options to be set.
     *
     * @returns {boolean} True if command can be built
     */
    canBuild(): boolean;
    /**
     * Builds the CLI command interface using the commander.js program instance.
     * Initializes the command with its options and action handler.
     *
     * @param {object} program - The commander.js program instance
     * @returns {Promise<this>} Returns this instance for method chaining
     */
    buildCli(program: object): Promise<this>;
    /**
     * Adds a single CLI option to the command.
     *
     * @param {string} name - The option name
     * @param {Array<string>} options - Array containing option flag and description
     * @param {boolean} preserve - Whether to preserve this option name in the list
     * @returns {Promise<this>} Returns this instance for method chaining
     */
    addCliOption(name: string, options: Array<string>, preserve: boolean): Promise<this>;
    /**
     * Adds multiple CLI options to the command.
     *
     * @param {object} options - Object mapping option names to [flag, description] arrays
     * @param {boolean} preserve - Whether to preserve option names in the list
     * @returns {this} Returns this instance for method chaining
     */
    addCliOptions(options: object, preserve: boolean): this;
    /**
     * Resolves a theme file name to a FileObject and validates its existence.
     *
     * @param {string} fileName - The theme file name or path
     * @param {DirectoryObject} cwd - The current working directory object
     * @returns {Promise<FileObject>} The resolved and validated FileObject
     * @throws {Sass} If the file does not exist
     */
    resolveThemeFileName(fileName: string, cwd: DirectoryObject): Promise<FileObject>;
    #private;
}
import type { DirectoryObject } from "@gesslar/toolkit";
import type { Cache } from "@gesslar/toolkit";
import type { FileObject } from "@gesslar/toolkit";
//# sourceMappingURL=Command.d.ts.map