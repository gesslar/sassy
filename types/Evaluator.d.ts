/**
 * @file Evaluator.js
 *
 * Defines the Evaluator class, responsible for variable and token resolution
 * during theme compilation.
 *
 * Handles recursive substitution of variable references and colour function
 * calls within theme configuration objects.
 *
 * Ensures deterministic scoping and supports extension for new colour
 * functions.
 */
import ThemePool from "./ThemePool.js";
/**
 * Evaluator class for resolving variables and colour tokens in theme objects.
 * Handles recursive substitution of token references in arrays of objects
 * with support for colour manipulation functions.
 */
export default class Evaluator {
    #private;
    /**
     * Regular expression used to locate variable substitution tokens. Supports:
     *  - POSIX-ish:    $(variable.path)
     *  - Legacy:       $variable.path
     *  - Braced:       ${variable.path}
     *
     * Capturing groups allow extraction of the inner path variant irrespective
     * of wrapping style. The pattern captures (entireMatch, posix, legacy,
     * braced).
     *
     * @type {RegExp}
     */
    static sub: RegExp;
    /**
     * Regular expression for matching colour / transformation function calls
     * within token strings, e.g. `darken($(std.accent), 10)`.
     *
     * @type {RegExp}
     */
    static func: RegExp;
    /**
     * Extracts a variable name from a string containing variable syntax.
     * Supports $(var), $var, and ${var} patterns.
     *
     * @param {string} [str] - String that may contain a variable reference
     * @returns {string|null} The variable name or null if none found
     */
    static extractVariableName(str?: string): string | null;
    /**
     * Extracts function name and arguments from a string containing function syntax.
     * Supports functionName(args) patterns.
     *
     * @param {string} [str] - String that may contain a function call
     * @returns {{func:string, args:string}|null} Object with {func, args} or null if none found
     */
    static extractFunctionCall(str?: string): {
        func: string;
        args: string;
    } | null;
    get pool(): ThemePool;
    /**
     * Sets the theme reference for source-location lookups in error messages.
     *
     * @param {import("./Theme.js").default|null} theme - The theme being evaluated, or null to clear the reference
     * @returns {this} This instance for chaining
     */
    setTheme(theme: import("./Theme.js").default | null): this;
    /**
     * Regular expression for expanding palette alias syntax. The `$` prefix
     * inside variable references is shorthand for `palette.`:
     *  - `$$name`    → `$palette.name`
     *  - `$($name)`  → `$(palette.name)`
     *  - `${$name}`  → `${palette.name}`
     *
     * @type {RegExp}
     */
    static paletteAlias: RegExp;
    /**
     * Expands palette alias references in a string value.
     * Converts `$$name`, `$($name)`, and `${$name}` to their
     * full `palette.` equivalents before variable resolution.
     *
     * @param {string} value - The string potentially containing palette aliases
     * @returns {string} The string with palette aliases expanded
     */
    static expandPaletteAliases(value: string): string;
    /**
     * Resolve variables and theme token entries in two distinct passes to ensure
     * deterministic scoping and to prevent partially-resolved values from
     * leaking between stages:
     *
     *  1. Variable pass: each variable is resolved only with access to the
     *     variable set itself (no theme values yet). This ensures variables are
     *     self-contained building blocks.
     *  2. Theme pass: theme entries are then resolved against the union of the
     *     fully-resolved variables plus (progressively) the theme entries. This
     *     allows theme keys to reference variables and other theme keys.
     *
     * Implementation details:
     *  - The internal lookup map persists for the lifetime of this instance; new
     *    entries overwrite prior values (last write wins) so previously resolved
     *    data can seed later evaluations without a rebuild.
     *  - Input array is mutated in-place (`value` fields change).
     *  - No return value. Evident by the absence of a return statement.
     *
     * @param {Array<{flatPath:string,value:unknown}>} decomposed - Variable entries to resolve.
     * @example
     * // Example decomposed input with variables and theme references
     * const evaluator = new Evaluator();
     * const decomposed = [
     *   { flatPath: 'vars.primary', value: '#3366cc' },
     *   { flatPath: 'theme.colors.background', value: '$(vars.primary)' },
     *   { flatPath: 'theme.colors.accent', value: 'lighten($(vars.primary), 20)' }
     * ];
     * evaluator.evaluate(decomposed);
     * // After evaluation, values are resolved:
     * // decomposed[1].value === '#3366cc'
     * // decomposed[2].value === '#5588dd' (lightened color)
     */
    evaluate(decomposed: Array<{
        flatPath: string;
        value: unknown;
    }>): void;
    /**
     * Resolve a variable or function token inside a string value; else return
     * the passed value.
     *
     * @private
     * @param {Array<ThemeToken>} trail - Array to track resolution chain.
     * @param {string} parentTokenKeyString - Key string for parent token.
     * @param {string} value - Raw tokenised string to resolve.
     * @returns {string?} Fully resolved string.
     * @throws {Sass} If we've reached maximum iterations.
     */
    private #evaluateValue;
    /**
     * Resolve a literal value to a ThemeToken.
     *
     * @private
     * @param {string} value - The literal value.
     * @returns {ThemeToken} The resolved token.
     */
    private #resolveLiteral;
    /**
     * Resolve a hex colour value to a ThemeToken.
     *
     * @private
     * @param {string} value - The hex colour value.
     * @returns {ThemeToken} The resolved token.
     */
    private #resolveHex;
    /**
     * Resolve a variable token to its value.
     *
     * @private
     * @param {string} value - The variable token string.
     * @returns {ThemeToken|null} The resolved token or null.
     */
    private #resolveVariable;
    /**
     * Resolve a function token to its value.
     *
     * @private
     * @param {string} value - The function token string.
     * @param {string} [parentKey] - Parent token key for location lookups.
     * @returns {ThemeToken|null} The resolved token or null.
     */
    private #resolveFunction;
    /**
     * Execute a supported colour transformation helper.
     *
     * @private
     * @param {string} func - Function name (lighten|darken|fade|alpha|mix|...)
     * @param {Array<string>} args - Raw argument strings (numbers still as text).
     * @param {string} raw - The raw input from the source file.
     * @param {Array<ThemeToken>} sourceTokens - The tokens to apply to.
     * @param {string} [captured] - The matched function call string (may be a nested inner call).
     * @returns {object} Object with result and colorSpace info.
     */
    private #colourFunction;
    /**
     * Determine whether further resolution passes are required for a scope.
     *
     * @private
     * @param {Array<object>} arr - Scope entries to inspect.
     * @returns {boolean} True if any unresolved tokens remain.
     */
    private #hasUnresolvedTokens;
    /**
     * Enriches an error message with source-location information when available.
     *
     * @private
     * @param {string} message - The base error message
     * @param {string} [flatPath] - The dotted path to look up in source
     * @returns {string} Message with location appended, or the original message
     */
    private #enrichMessage;
    /**
     * Predicate: does this item's value still contain variable or function tokens?
     *
     * @private
     * @param {{value:unknown}} item - Entry to test.
     * @returns {boolean} True if token patterns present.
     */
    private #tokenCheck;
}
//# sourceMappingURL=Evaluator.d.ts.map