/**
 * Lint rules for semanticTokenColors selector keys.
 */
export default class SemanticSelectorRules {
    static ISSUE_TYPES: Readonly<{
        INVALID_SELECTOR: "invalid-selector";
        UNRECOGNISED_TOKEN_TYPE: "unrecognised-token-type";
        UNRECOGNISED_MODIFIER: "unrecognised-modifier";
        DEPRECATED_TOKEN_TYPE: "deprecated-token-type";
        DUPLICATE_SELECTOR: "duplicate-selector";
    }>;
    /**
     * Runs all selector rules against the semanticTokenColors object.
     *
     * @param {object} semanticTokenColors - The compiled semanticTokenColors object
     * @returns {Array<object>} Array of issue objects
     */
    static run(semanticTokenColors: object): Array<object>;
    /**
     * Validates selector strings against VS Code's regex pattern.
     *
     * @param {string[]} selectors - Selector keys
     * @returns {Array<object>} Issues for malformed selectors
     * @private
     */
    private static "__#private@#checkSyntax";
    /**
     * Checks token types against the standard registry and deprecated list.
     *
     * @param {string[]} selectors - Selector keys
     * @returns {Array<object>} Issues for unrecognised or deprecated types
     * @private
     */
    private static "__#private@#checkTokenTypes";
    /**
     * Checks modifiers against the standard registry.
     *
     * @param {string[]} selectors - Selector keys
     * @returns {Array<object>} Issues for unrecognised modifiers
     * @private
     */
    private static "__#private@#checkModifiers";
    /**
     * Detects duplicate selectors after normalising modifier order.
     *
     * VS Code sorts modifiers alphabetically during ID generation, so
     * `variable.readonly.static` and `variable.static.readonly` are
     * identical.
     *
     * @param {string[]} selectors - Selector keys
     * @returns {Array<object>} Issues for duplicate selectors
     * @private
     */
    private static "__#private@#checkDuplicates";
}
//# sourceMappingURL=SemanticSelectorRules.d.ts.map