/**
 * Engine class for resolving theme tokens and variables.
 * Returns structured resolution data with trails.
 * No CLI awareness — takes a compiled Theme and returns data.
 */
export default class Resolve {
    /**
     * Classify a raw value string as "expression" (function call) or "variable".
     *
     * @param {string} value - Raw token value
     * @returns {"expression"|"variable"} The classification
     */
    static "__#private@#classifyValue"(value: string): "expression" | "variable";
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