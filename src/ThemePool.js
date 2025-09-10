
/**
 * @file ThemePool.js
 *
 * Defines the ThemePool class, a collection of ThemeTokens for lookup and dependency tracking.
 * Manages resolved values, raw resolutions, and token relationships during theme compilation.
 */

import Sass from "./Sass.js"
import ThemeToken from "./ThemeToken.js"

/**
 * ThemePool represents a collection of ThemeTokens serving both as a
 * lookup of string>ThemeToken and dependencies.
 *
 * @class ThemePool
 */
export default class ThemePool {
  #tokens = new Map()
  #resolved = new Map()
  #rawResolved = new Map()

  /**
   * Returns the map of encoded theme token ids to their token object.
   *
   * @returns {Map<string, ThemeToken>} Map of tokens to their children.
   */
  get getTokens() {
    return this.#tokens
  }

  /**
   * Retrieves a resolved token by its name.
   *
   * @param {string} name - The token to look up.
   * @returns {string|undefined} The resolved token string or undefined.
   */
  lookup(name) {
    return this.#resolved.get(name)
  }

  /**
   * Sets a resolved value for a token key.
   *
   * @param {string} key - The token key.
   * @param {string} value - The resolved value.
   */
  resolve(key, value) {
    this.#resolved.set(key, value)
  }

  /**
   * Sets a raw resolved value for a token key.
   *
   * @param {string} key - The token key.
   * @param {string} value - The raw resolved value.
   */
  rawResolve(key, value) {
    this.#rawResolved.set(key, value)
  }

  /**
   * Checks if a token name exists in resolved map.
   *
   * @param {string} name - The token name to check.
   * @returns {boolean} True if the token exists.
   */
  has(name) {
    return this.#resolved.has(name)
  }

  /**
   * Checks if a token exists by its name.
   *
   * @param {ThemeToken} token - The token to check.
   * @returns {boolean} True if the token exists.
   */
  hasToken(token) {
    return this.has(token.name)
  }

  /**
   * Retrieves a token's dependency.
   *
   * @param {ThemeToken} token - The token to look up.
   * @returns {ThemeToken?} The dependent token with the given token, or undefined.
   */
  reverseLookup(token) {
    return this.#tokens.get(token.getValue()) || null
  }

  /**
   * Adds a token to the pool, optionally setting up dependencies if required.
   *
   * @param {ThemeToken} token - The token to add.
   * @param {ThemeToken} [dependency] - The dependent token.
   * @returns {ThemeToken} The token that was added.
   */
  addToken(token, dependency=null) {
    if(!(token instanceof ThemeToken))
      throw Sass.new("Token must be of type ThemeToken.")

    if(!(dependency === null || dependency instanceof ThemeToken))
      throw Sass.new("Token must be null or of type ThemeToken.")

    this.#tokens.set(token.getName(), token)

    return token
  }

  /**
   * Finds a token by its value.
   *
   * @param {string} value - The value to search for.
   * @returns {ThemeToken|undefined} The found token or undefined.
   */
  findToken(value) {
    return [...this.#tokens.entries()].find(arg => arg[0] === value)?.[1]
  }

  /**
   * Checks if one token is an ancestor of another using reverse lookup.
   *
   * @param {ThemeToken} candidate - Potential ancestor token.
   * @param {ThemeToken} token - Potential descendant token.
   * @returns {boolean} True if candidate is an ancestor of token.
   */
  isAncestorOf(candidate, token) {

    do

      if(candidate === token)
        return true

    while((token = this.reverseLookup(token)))

    return false
  }
}
