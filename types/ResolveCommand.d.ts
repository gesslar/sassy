/**
 * Engine class for resolving theme tokens and variables.
 * Returns structured resolution data with trails.
 * No CLI awareness — takes a compiled Theme and returns data.
 */
export class Resolve {
    /**
     * Resolves a colour token to its final value with trail.
     *
     * @param {Theme} theme - The compiled theme object with pool
     * @param {string} colorName - The colour key to resolve
     * @returns {Promise<object>} `{ found, name, resolution?, trail? }`
     */
    color(theme: Theme, colorName: string): Promise<object>;
    /**
     * Resolves a tokenColors scope to its final value with trail.
     *
     * @param {Theme} theme - The compiled theme object with output
     * @param {string} scopeName - The scope to resolve
     * @returns {Promise<object>} Resolution data object
     */
    tokenColor(theme: Theme, scopeName: string): Promise<object>;
    /**
     * Resolves a semanticTokenColors scope to its final value with trail.
     *
     * @param {Theme} theme - The compiled theme object with output
     * @param {string} scopeName - The scope to resolve
     * @returns {Promise<object>} Resolution data object
     */
    semanticTokenColor(theme: Theme, scopeName: string): Promise<object>;
    #private;
}
/**
 * Command handler for resolving theme tokens and variables to their final values.
 * CLI adapter that delegates data resolution to Resolve and handles terminal display.
 */
export default class ResolveCommand extends Command {
    /**
     * Creates a new ResolveCommand instance.
     *
     * @param {object} base - Base configuration containing cwd and packageJson
     */
    constructor(base: object);
    /**
     * Builds the CLI command, adding extra options that are not mutually exclusive.
     *
     * @param {object} program - The commander.js program instance
     * @returns {Promise<this>} Returns this instance for method chaining
     */
    buildCli(program: object): Promise<this>;
    /**
     * Executes the resolve command for a given theme file and option.
     * Validates mutual exclusivity of options and delegates to appropriate resolver.
     *
     * @param {string} inputArg - Path to the theme file to resolve
     * @param {object} options - Resolution options (token, etc.)
     * @returns {Promise<void>} Resolves when resolution is complete
     */
    execute(inputArg: string, options?: object): Promise<void>;
    /**
     * Public method to resolve a theme token or variable and return structured
     * data for external consumption. Delegates to the Resolve engine.
     *
     * @param {Theme} theme - The compiled theme object
     * @param {object} options - Resolution options (color, tokenColor, or semanticTokenColor)
     * @returns {Promise<object>} Object containing structured resolution data
     */
    resolve(theme: Theme, options?: object): Promise<object>;
    /**
     * Resolves a specific color to its final value and displays the resolution trail.
     *
     * @param {object} theme - The compiled theme object with pool
     * @param {string} colorName - The color key to resolve
     * @returns {void}
     */
    resolveColor(theme: object, colorName: string): void;
    /**
     * Resolves a specific tokenColors scope to its final value and displays the resolution trail.
     *
     * @param {object} theme - The compiled theme object with output
     * @param {string} scopeName - The scope to resolve
     * @returns {void}
     */
    resolveTokenColor(theme: object, scopeName: string): void;
    /**
     * Resolves a specific semanticTokenColors scope to its final value.
     *
     * @param {object} theme - The compiled theme object with output
     * @param {string} scopeName - The scope to resolve
     * @returns {void}
     */
    resolveSemanticTokenColor(theme: object, scopeName: string): void;
    #private;
}
import Theme from "./Theme.js";
import Command from "./Command.js";
//# sourceMappingURL=ResolveCommand.d.ts.map