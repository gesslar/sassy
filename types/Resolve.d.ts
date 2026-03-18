/**
 * @file Resolve.js
 *
 * Engine class for theme token resolution and introspection.
 * Returns structured data about variable dependencies and resolution trails.
 * No CLI awareness — takes a compiled Theme and returns data.
 */
/**
 * @import {Theme} from "./Theme.js"
 */
/**
 * Engine class for resolving theme tokens and variables.
 * Returns structured resolution data with trails.
 * No CLI awareness — takes a compiled Theme and returns data.
 */
export default class Resolve {
    /** @type {RegExp} Matches a function call at the outer level */
    static "__#private@#funcCall": RegExp;
    /** @type {RegExp} Matches a variable reference */
    static "__#private@#varRef": RegExp;
    /** @type {RegExp} Matches a séance prior reference inside a variable or function */
    static "__#private@#priorRef": RegExp;
    /**
     * Classify a raw value string by its outermost form.
     *
     * @param {string} value - Raw token value
     * @returns {"expression"|"variable"|"literal"} The classification
     */
    static "__#private@#classifyValue"(value: string): "expression" | "variable" | "literal";
    /**
     * Classify a computed/intermediate result value.
     * Like #classifyValue but returns "resolved" instead of "literal"
     * for values that were derived (e.g. hex outputs from expressions).
     *
     * @param {string} value - Computed value
     * @returns {"expression"|"variable"|"resolved"} The classification
     */
    static "__#private@#classifyResult"(value: string): "expression" | "variable" | "resolved";
    /**
     * Converts internal `palette.__prior__` references in trail steps to
     * user-facing séance (`^`) notation.
     *
     * @param {Array<{value: string, type: string, depth: number}>} steps - Trail steps
     * @returns {Array<{value: string, type: string, depth: number}>} Cleaned steps
     * @private
     */
    private static "__#private@#cleanPriorRefs";
    /**
     * Resolves a colour token to its final value with trail.
     *
     * Automatically loads and builds the theme if not already compiled.
     *
     * @param {Theme} theme - The theme object
     * @param {string} colorName - The colour key to resolve
     * @returns {Promise<object>} `{ found, name, resolution?, trail? }`
     */
    color(theme: Theme, colorName: string): Promise<object>;
    /**
     * Resolves a tokenColors scope to its final value with trail.
     *
     * Automatically loads and builds the theme if not already compiled.
     *
     * @param {Theme} theme - The theme object
     * @param {string} scopeName - The scope to resolve
     * @returns {Promise<object>} Resolution data object
     */
    tokenColor(theme: Theme, scopeName: string): Promise<object>;
    /**
     * Resolves a semanticTokenColors scope to its final value with trail.
     *
     * Automatically loads and builds the theme if not already compiled.
     *
     * @param {Theme} theme - The theme object
     * @param {string} scopeName - The scope to resolve
     * @returns {Promise<object>} Resolution data object
     */
    semanticTokenColor(theme: Theme, scopeName: string): Promise<object>;
    #private;
}
//# sourceMappingURL=Resolve.d.ts.map