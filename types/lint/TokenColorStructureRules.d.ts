/**
 * @file TokenColorStructureRules.js
 *
 * Validates tokenColors array-level structure. Detects multiple scopeless
 * entries (global defaults) where only the last one takes effect.
 */
/**
 * Lint rules for tokenColors structural validation.
 */
export default class TokenColorStructureRules {
    static ISSUE_TYPES: Readonly<{
        MULTIPLE_GLOBAL_DEFAULTS: "tc-multiple-global-defaults";
    }>;
    /**
     * Runs all structure rules against the tokenColors array.
     *
     * @param {Array} tokenColors - The compiled tokenColors array
     * @returns {Array<object>} Array of issue objects
     */
    static run(tokenColors: any[]): Array<object>;
    /**
     * Detects multiple scopeless entries. In VS Code, a tokenColors entry
     * without a `scope` acts as a global default. When multiple exist,
     * only the last one takes effect — earlier ones are dead code.
     *
     * @param {Array} tokenColors - The compiled tokenColors array
     * @returns {Array<object>} Issues found
     * @private
     */
    private static "__#private@#checkMultipleGlobalDefaults";
}
//# sourceMappingURL=TokenColorStructureRules.d.ts.map