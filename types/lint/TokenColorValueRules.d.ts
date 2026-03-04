/**
 * Lint rules for tokenColors settings values.
 */
export default class TokenColorValueRules {
    static ISSUE_TYPES: Readonly<{
        MISSING_SETTINGS: "tc-missing-settings";
        EMPTY_SETTINGS: "tc-empty-settings";
        INVALID_HEX_COLOUR: "tc-invalid-hex-colour";
        INVALID_FONTSTYLE: "tc-invalid-fontstyle";
        DEPRECATED_BACKGROUND: "tc-deprecated-background";
        UNKNOWN_SETTINGS_PROPERTY: "tc-unknown-settings-property";
    }>;
    /** @type {Set<string>} Valid properties in a tokenColors settings object. */
    static "__#private@#VALID_PROPERTIES": Set<string>;
    /**
     * Runs all value rules against the tokenColors array.
     *
     * @param {Array} tokenColors - The compiled tokenColors array
     * @returns {Array<object>} Array of issue objects
     */
    static run(tokenColors: any[]): Array<object>;
    /**
     * Validates a single tokenColors entry's settings.
     *
     * @param {object} entry - The tokenColors entry
     * @param {string} name - Entry name for reporting
     * @returns {Array<object>} Issues found
     * @private
     */
    private static "__#private@#checkEntry";
    /**
     * Validates a hex colour string.
     *
     * @param {string} name - Entry name for reporting
     * @param {string} colour - The colour string
     * @param {string} property - Which property (foreground/background)
     * @returns {Array<object>} Issues found
     * @private
     */
    private static "__#private@#checkHexColour";
}
//# sourceMappingURL=TokenColorValueRules.d.ts.map