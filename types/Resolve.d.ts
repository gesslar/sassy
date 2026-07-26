/**
 * @file Resolve.js
 *
 * Engine class for theme token resolution and introspection.
 * Returns structured data about variable dependencies and resolution trails.
 * No CLI awareness — takes a compiled Theme and returns data.
 */
import type { Theme } from "./Theme.js";
/**
 * @import {Theme} from "./Theme.js"
 */
/**
 * Engine class for resolving theme tokens and variables.
 * Returns structured resolution data with trails.
 * No CLI awareness — takes a compiled Theme and returns data.
 */
export default class Resolve {
    #private;
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
    /**
     * Loads and builds the theme if not already prepared.
     *
     * @param {Theme} theme - The theme to prepare
     * @returns {Promise<void>}
     * @private
     */
    private #prepare;
    /**
     * Finds the best precedence match for a target scope that has no exact match.
     * Uses TextMate scope hierarchy rules: a broader scope (fewer segments) that
     * is a prefix of the target scope will match. Returns the most specific
     * (longest) broader scope.
     *
     * @param {Array} tokenColors - Array of tokenColors entries
     * @param {string} targetScope - The scope to find a precedence match for
     * @returns {{entry: object, matchedScope: string}|null} The best match or null
     * @private
     */
    private #findBestPrecedenceMatch;
    /**
     * Finds a broader scope that appears earlier in the tokenColors array
     * and would mask the given exact match entry.
     *
     * @param {Array} tokenColors - Array of tokenColors entries
     * @param {object} exactMatch - The exact match entry
     * @param {string} targetScope - The scope being resolved
     * @returns {{entry: object, matchedScope: string}|null} The masking entry or null
     * @private
     */
    private #findMaskingScope;
    /**
     * Returns structured resolution data for a scope match.
     *
     * @param {object} theme - The compiled theme object with pool
     * @param {object} match - The matching tokenColor entry
     * @param {string} displayName - The scope name for display
     * @param {{scope: string, relation: string}|null} resolvedVia - Resolution indirection
     * @returns {object} Resolution data
     * @private
     */
    private #resolveScopeMatchData;
    /**
     * Converts internal `palette.__prior__` references in trail steps to
     * user-facing séance (`^`) notation.
     *
     * @param {Array<{value: string, type: string, depth: number}>} steps - Trail steps
     * @returns {Array<{value: string, type: string, depth: number}>} Cleaned steps
     * @private
     */
    private static #cleanPriorRefs;
}
//# sourceMappingURL=Resolve.d.ts.map