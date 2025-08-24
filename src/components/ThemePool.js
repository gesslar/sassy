
/**
 * ThemePool represents a collection of ThemeTokens serving both as a
 * lookup of string>ThemeToken and dependencies.
 *
 * @class ThemePool
 */

import AuntyError from "./AuntyError.js"
import Term from "./Term.js"
import ThemeToken from "./ThemeToken.js"

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
   * @returns {string|undefined} The the resolved token string or undefined.
   */
  lookup(name) {
    return this.#resolved.get(name)
  }

  resolve(key, value) {
    // Term.debug("[#resolved]", key, value)
    this.#resolved.set(key, value)
  }

  rawResolve(key, value) {
    // Term.debug("[#rawResolved]", key, value)
    this.#rawResolved.set(key, value)
  }

  has(name) {
    return this.#resolved.has(name)
  }

  hasToken(token) {
    return this.has(token.name)
  }

  /**
   * Retrieves a token's depdendency.
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
      throw AuntyError.new("Token must be of type ThemeToken.")

    if(!(dependency === null || dependency instanceof ThemeToken))
      throw AuntyError.new("Token must be null or of type ThemeToken.")

    // Term.debug("[addToken]", token.getName(), token)
    this.#tokens.set(token.getName(), token)

    return token
  }

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
