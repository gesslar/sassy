/**
 * Lint rules for semanticTokenColors values.
 */
export default class SemanticValueRules {
    static ISSUE_TYPES: Readonly<{
        INVALID_VALUE: "invalid-value";
        INVALID_HEX_COLOUR: "invalid-hex-colour";
        INVALID_FONTSTYLE: "invalid-fontstyle";
        FONTSTYLE_CONFLICT: "fontstyle-conflict";
        DEPRECATED_PROPERTY: "deprecated-property";
        EMPTY_RULE: "empty-rule";
    }>;
    /** @type {Set<string>} Known valid properties in a style object. */
    static #VALID_PROPERTIES: Set<string>;
    /**
     * Runs all value rules against the semanticTokenColors object.
     *
     * @param {object} semanticTokenColors - The compiled semanticTokenColors object
     * @returns {Array<object>} Array of issue objects
     */
    static run(semanticTokenColors: object): Array<object>;
    /**
     * Validates a single value (string or object).
     *
     * @param {string} selector - The selector key
     * @param {*} value - The value to validate
     * @returns {Array<object>} Issues found
     * @private
     */
    private static #checkValue;
    /**
     * Validates a hex colour string.
     *
     * @param {string} selector - The selector key
     * @param {string} colour - The colour string
     * @param {string} property - Which property this colour is from (for reporting)
     * @returns {Array<object>} Issues found
     * @private
     */
    private static #checkHexColour;
    /**
     * Validates a style object value.
     *
     * @param {string} selector - The selector key
     * @param {object} obj - The style object
     * @returns {Array<object>} Issues found
     * @private
     */
    private static #checkStyleObject;
}
//# sourceMappingURL=SemanticValueRules.d.ts.map