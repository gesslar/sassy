/**
 * ThemeToken represents a single token in a theme tree, encapsulating theme
 * token data and relationships.
 *
 * Provides property management, factory methods, tree integration, and
 * serialization.
 *
 * @class ThemeToken
 */
export default class ThemeToken {
    /**
     * Constructs a ThemeToken with a given token name.
     *
     * @param {string} name - The token name for this token.
     */
    constructor(name: string);
    /**
     * Adds this token to a ThemePool with optional dependency.
     *
     * @param {ThemePool} pool - The pool to add to.
     * @param {ThemeToken} [dependency] - Optional dependency token.
     * @returns {ThemeToken} This token instance.
     */
    addToPool(pool?: ThemePool, dependency?: ThemeToken): ThemeToken;
    /**
     * Sets the name of this token (only if not already set).
     *
     * @param {string} name - The token name.
     * @returns {ThemeToken} This token instance.
     */
    setName(name: string): ThemeToken;
    /**
     * Gets the name of this token.
     *
     * @returns {string} The token name.
     */
    getName(): string;
    /**
     * Sets the kind of this token (only if not already set).
     *
     * @param {string} kind - The token kind.
     * @returns {ThemeToken} This token instance.
     */
    setKind(kind: string): ThemeToken;
    /**
     * Gets the kind of this token.
     *
     * @returns {string} The token kind.
     */
    getKind(): string;
    /**
     * Sets the value of this token.
     *
     * @param {string} value - The token value.
     * @returns {ThemeToken} This token instance.
     */
    setValue(value: string): ThemeToken;
    /**
     * Gets the value of this token.
     *
     * @returns {string} The token value.
     */
    getValue(): string;
    /**
     * Sets the raw value of this token (only if not already set).
     *
     * @param {string} raw - The raw token value.
     * @returns {ThemeToken} This token instance.
     */
    setRawValue(raw: string): ThemeToken;
    /**
     * Gets the raw value of this token.
     *
     * @returns {string} The raw token value.
     */
    getRawValue(): string;
    /**
     * Sets the dependency of this token (only if not already set).
     *
     * @param {ThemeToken} dependency - The dependency token.
     * @returns {ThemeToken} This token instance.
     */
    setDependency(dependency: ThemeToken): ThemeToken;
    /**
     * Gets the dependency of this token.
     *
     * @returns {ThemeToken|null} The dependency token or null.
     */
    getDependency(): ThemeToken | null;
    /**
     * Sets the parent token key.
     *
     * @param {string} tokenKey - The parent token key.
     * @returns {ThemeToken} This token instance.
     */
    setParentTokenKey(tokenKey: string): ThemeToken;
    /**
     * Gets the parent token key.
     *
     * @returns {string|null} The parent token key or null.
     */
    getParentTokenKey(): string | null;
    /**
     * Adds a trail of tokens to this token's trail array.
     *
     * @param {Array<ThemeToken>} trail - Array of tokens to add.
     * @returns {ThemeToken} This token instance.
     */
    addTrail(trail: Array<ThemeToken>): ThemeToken;
    /**
     * Gets the trail array of this token.
     *
     * @returns {Array<ThemeToken>} The trail array.
     */
    getTrail(): Array<ThemeToken>;
    /**
     * Sets the parsed color object for this token.
     *
     * @param {object} parsedColor - The parsed Culori color object
     * @returns {ThemeToken} This token instance.
     */
    setParsedColor(parsedColor: object): ThemeToken;
    /**
     * Gets the parsed color object of this token.
     *
     * @returns {object|null} The parsed Culori color object or null.
     */
    getParsedColor(): object | null;
    /**
     * Sets the direct result of a colour function evaluation, before
     * substitution back into the enclosing expression.
     *
     * @param {string} result - The direct function output.
     * @returns {ThemeToken} This token instance.
     */
    setFunctionResult(result: string): ThemeToken;
    /**
     * Gets the direct result of a colour function evaluation.
     *
     * @returns {string|null} The direct function output or null.
     */
    getFunctionResult(): string | null;
    /**
     * Checks if this token has an ancestor with the given token name.
     *
     * @param {string} name - The name of the ancestor token to check for.
     * @returns {boolean} True if ancestor exists.
     */
    hasDependency(name: string): boolean;
    /**
     * Gets the ThemePool associated with this token.
     *
     * @returns {ThemePool} The associated pool.
     */
    getPool(): ThemePool;
    /**
     * Returns a JSON representation of the ThemeToken.
     *
     * @returns {object} JSON representation of the ThemeToken
     */
    toJSON(): object;
    #private;
}
import ThemePool from "./ThemePool.js";
//# sourceMappingURL=ThemeToken.d.ts.map