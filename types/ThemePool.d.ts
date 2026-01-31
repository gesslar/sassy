/**
 * ThemePool represents a collection of ThemeTokens serving both as a
 * lookup of string>ThemeToken and dependencies.
 *
 * @class ThemePool
 */
export default class ThemePool {
    /**
     * Returns the map of encoded theme token ids to their token object.
     *
     * @returns {Map<string, ThemeToken>} Map of tokens to their children.
     */
    getTokens(): Map<string, ThemeToken>;
    /**
     * Retrieves a resolved token by its name.
     *
     * @param {string} name - The token to look up.
     * @returns {string|undefined} The resolved token string or undefined.
     */
    lookup(name: string): string | undefined;
    /**
     * Sets a resolved value for a token key.
     *
     * @param {string} key - The token key.
     * @param {string} value - The resolved value.
     */
    resolve(key: string, value: string): void;
    /**
     * Sets a raw resolved value for a token key.
     *
     * @param {string} key - The token key.
     * @param {string} value - The raw resolved value.
     */
    rawResolve(key: string, value: string): void;
    /**
     * Checks if a token name exists in resolved map.
     *
     * @param {string} name - The token name to check.
     * @returns {boolean} True if the token exists.
     */
    has(name: string): boolean;
    /**
     * Checks if a token exists by its name.
     *
     * @param {ThemeToken} token - The token to check.
     * @returns {boolean} True if the token exists.
     */
    hasToken(token: ThemeToken): boolean;
    /**
     * Retrieves a token's dependency.
     *
     * @param {ThemeToken} token - The token to look up.
     * @returns {ThemeToken?} The dependent token with the given token, or undefined.
     */
    reverseLookup(token: ThemeToken): ThemeToken | null;
    /**
     * Adds a token to the pool, optionally setting up dependencies if required.
     *
     * @param {ThemeToken} token - The token to add.
     * @param {ThemeToken} [dependency] - The dependent token.
     * @returns {ThemeToken} The token that was added.
     */
    addToken(token: ThemeToken, dependency?: ThemeToken): ThemeToken;
    /**
     * Finds a token by its value.
     *
     * @param {string} value - The value to search for.
     * @returns {ThemeToken|undefined} The found token or undefined.
     */
    findToken(value: string): ThemeToken | undefined;
    /**
     * Checks if one token is an ancestor of another using reverse lookup.
     *
     * @param {ThemeToken} candidate - Potential ancestor token.
     * @param {ThemeToken} token - Potential descendant token.
     * @returns {boolean} True if candidate is an ancestor of token.
     */
    isAncestorOf(candidate: ThemeToken, token: ThemeToken): boolean;
    #private;
}
import ThemeToken from "./ThemeToken.js";
//# sourceMappingURL=ThemePool.d.ts.map