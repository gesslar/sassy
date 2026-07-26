/**
 * @file ResolveCommand.js
 *
 * CLI adapter for the Resolve engine. Handles file resolution, option
 * validation, terminal formatting with colour swatches, and delegates
 * all data work to Resolve.
 */
import Command from "./Command.js";
import Theme from "./Theme.js";
export { default as Resolve } from "./Resolve.js";
/**
 * Command handler for resolving theme tokens and variables to their final values.
 * CLI adapter that delegates data resolution to Resolve and handles terminal display.
 */
export default class ResolveCommand extends Command {
    #private;
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
    /**
     * Displays structured scope resolution data in the terminal.
     *
     * @param {object} data - Resolution data from a Resolve method
     * @private
     */
    private #displayResolvedScope;
    /**
     * Creates a truecolor swatch glyph from a hex value.
     *
     * @private
     * @param {string} hex - A 6- or 8-digit hex colour.
     * @returns {string} A truecolor `■` character.
     */
    private #swatch;
    /**
     * Creates a colour swatch or fallback arrow indicator for a hex value.
     *
     * @private
     * @param {string} hex - The hex colour value.
     * @param {string|null} bg - Optional background hex for alpha compositing.
     * @returns {string} Swatch indicator(s) or styled arrow.
     */
    private #makeIndicator;
}
//# sourceMappingURL=ResolveCommand.d.ts.map