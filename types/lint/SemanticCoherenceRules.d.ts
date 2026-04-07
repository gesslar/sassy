/**
 * Lint rules for semantic token colour theme coherence.
 */
export default class SemanticCoherenceRules {
    static ISSUE_TYPES: Readonly<{
        MISSING_SEMANTIC_HIGHLIGHTING: "missing-semantic-highlighting";
        SHADOWED_RULE: "shadowed-rule";
    }>;
    /**
     * Runs all coherence rules against the full compiled output.
     *
     * @param {object} output - The full compiled theme output
     * @returns {Array<object>} Array of issue objects
     */
    static run(output: object): Array<object>;
    /**
     * Checks that `semanticHighlighting` is enabled when semanticTokenColors
     * rules are defined.
     *
     * @param {object} output - Full compiled theme output
     * @returns {Array<object>} Issues found
     * @private
     */
    private static #checkSemanticHighlighting;
    /**
     * Detects rules that are completely shadowed by higher-specificity rules
     * defining the same style properties.
     *
     * A rule is shadowed when a more specific selector matches a subset of
     * the same tokens and defines all the same properties, making the less
     * specific rule's properties unreachable for those tokens.
     *
     * @param {object} semanticTokenColors - The semanticTokenColors object
     * @returns {Array<object>} Issues found
     * @private
     */
    private static #checkShadowedRules;
    /**
     * Extracts the list of style properties defined by a value.
     *
     * @param {*} value - The selector's value
     * @returns {string[]} Property names
     * @private
     */
    private static #extractProperties;
    /**
     * Determines whether `higher` could shadow `lower` — i.e., whether
     * tokens matching `lower` would also match `higher`.
     *
     * For shadowing: higher must have the same type (or lower is wildcard),
     * higher's modifiers must be a superset of lower's modifiers, and
     * language scoping must be compatible.
     *
     * @param {{ type: string, modifiers: string[], language: string|null }} higher - Higher specificity selector
     * @param {{ type: string, modifiers: string[], language: string|null }} lower - Lower specificity selector
     * @returns {boolean} True if higher could shadow lower
     * @private
     */
    private static #couldShadow;
    /**
     * Checks if `type` is a subtype of `superType` using VS Code's
     * built-in type hierarchy.
     *
     * @param {string} type - Potential subtype
     * @param {string} superType - Potential supertype
     * @returns {boolean} True if type is a subtype of superType
     * @private
     */
    private static #isSubtype;
}
//# sourceMappingURL=SemanticCoherenceRules.d.ts.map