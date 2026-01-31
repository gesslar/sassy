/**
 * Evaluator class for resolving variables and colour tokens in theme objects.
 * Handles recursive substitution of token references in arrays of objects
 * with support for colour manipulation functions.
 */
export default class Evaluator {
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
    get pool(): ThemePool;
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
    #private;
}
import ThemePool from "./ThemePool.js";
//# sourceMappingURL=Evaluator.d.ts.map