/**
 * Command handler for resolving theme tokens and variables to their final values.
 * Provides introspection into the theme resolution process and variable dependencies.
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
     * Resolves a specific color to its final value and displays the resolution trail.
     * Shows the complete dependency chain for the requested color.
     *
     * @param {object} theme - The compiled theme object with pool
     * @param {string} colorName - The color key to resolve
     * @returns {void}
     * @example
     * // Resolve a color variable from a compiled theme
     * await resolveCommand.resolveColor(theme, 'colors.primary');
     * // Output:
     * // colors.primary:
     * //   $(vars.accent)
     * //     → #3366cc
     * // Resolution: #3366cc
     */
    resolveColor(theme: object, colorName: string): void;
    /**
     * Resolves a specific tokenColors scope to its final value and displays the resolution trail.
     * Shows all matching scopes with disambiguation when multiple matches are found.
     *
     * @param {object} theme - The compiled theme object with output
     * @param {string} scopeName - The scope to resolve (e.g., "entity.name.class" or "entity.name.class.1")
     * @returns {void}
     */
    resolveTokenColor(theme: object, scopeName: string): void;
    /**
     * Resolves a specific semanticTokenColors scope to its final value.
     * Uses the same logic as tokenColors since they have identical structure.
     *
     * @param {object} theme - The compiled theme object with output
     * @param {string} scopeName - The scope to resolve (e.g., "keyword" or "keyword.1")
     * @returns {void}
     */
    resolveSemanticTokenColor(theme: object, scopeName: string): void;
    #private;
}
import Command from "./Command.js";
//# sourceMappingURL=ResolveCommand.d.ts.map