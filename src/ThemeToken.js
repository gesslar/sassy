
/**
 * @file ThemeToken.js
 *
 * Defines the ThemeToken class, representing a single token in a theme tree.
 * Encapsulates token data, relationships, and provides methods for property
 * management, pool integration, and serialization during theme compilation.
 */

import Sass from "./Sass.js"
import ThemePool from "./ThemePool.js"

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
  #pool

  #name = null
  #kind = null
  #rawValue = null
  #value = null
  #dependency = null
  #parentTokenKey = null
  #trail = new Array()
  #parsedColor = null

  /**
   * Constructs a ThemeToken with a given token name.
   *
   * @param {string} name - The token name for this token.
   */
  constructor(name) {
    if(typeof name !== "string")
      throw Sass.new("Token name must be a bare string.")

    this.setName(name)
  }

  /**
   * Adds this token to a ThemePool with optional dependency.
   *
   * @param {ThemePool} pool - The pool to add to.
   * @param {ThemeToken} [dependency] - Optional dependency token.
   * @returns {ThemeToken} This token instance.
   */
  addToPool(pool=null, dependency) {
    if(!(pool instanceof ThemePool))
      throw Sass.new("Pool must be a ThemePool instance.")

    if(this.#pool)
      return this

    if(!(dependency == null || dependency instanceof ThemeToken))
      throw Sass.new("Dependency must be null or of type ThemeToken.")

    this.#pool = pool

    return pool.addToken(this, dependency)
  }

  /**
   * Sets the name of this token (only if not already set).
   *
   * @param {string} name - The token name.
   * @returns {ThemeToken} This token instance.
   */
  setName(name) {
    if(!this.#name)
      this.#name = name

    return this
  }

  /**
   * Gets the name of this token.
   *
   * @returns {string} The token name.
   */
  getName() {
    return this.#name
  }

  /**
   * Sets the kind of this token (only if not already set).
   *
   * @param {string} kind - The token kind.
   * @returns {ThemeToken} This token instance.
   */
  setKind(kind) {
    if(!this.#kind)
      this.#kind = kind

    return this
  }

  /**
   * Gets the kind of this token.
   *
   * @returns {string} The token kind.
   */
  getKind() {
    return this.#kind
  }

  /**
   * Sets the value of this token.
   *
   * @param {string} value - The token value.
   * @returns {ThemeToken} This token instance.
   */
  setValue(value) {
    this.#value = value

    return this
  }

  /**
   * Gets the value of this token.
   *
   * @returns {string} The token value.
   */
  getValue() {
    return this.#value
  }

  /**
   * Sets the raw value of this token (only if not already set).
   *
   * @param {string} raw - The raw token value.
   * @returns {ThemeToken} This token instance.
   */
  setRawValue(raw) {
    if(!this.#rawValue)
      this.#rawValue = raw

    return this
  }

  /**
   * Gets the raw value of this token.
   *
   * @returns {string} The raw token value.
   */
  getRawValue() {
    return this.#rawValue
  }

  /**
   * Sets the dependency of this token (only if not already set).
   *
   * @param {ThemeToken} dependency - The dependency token.
   * @returns {ThemeToken} This token instance.
   */
  setDependency(dependency) {
    if(!this.#dependency)
      this.#dependency = dependency

    return this
  }

  /**
   * Gets the dependency of this token.
   *
   * @returns {ThemeToken|null} The dependency token or null.
   */
  getDependency() {
    return this.#dependency || null
  }

  /**
   * Sets the parent token key.
   *
   * @param {string} tokenKey - The parent token key.
   * @returns {ThemeToken} This token instance.
   */
  setParentTokenKey(tokenKey) {
    this.#parentTokenKey = tokenKey

    return this
  }

  /**
   * Gets the parent token key.
   *
   * @returns {string|null} The parent token key or null.
   */
  getParentTokenKey() {
    return this.#parentTokenKey || null
  }

  /**
   * Adds a trail of tokens to this token's trail array.
   *
   * @param {Array<ThemeToken>} trail - Array of tokens to add.
   * @returns {ThemeToken} This token instance.
   */
  addTrail(trail) {
    const current = this.#trail

    trail.forEach(value => {
      if(!current.includes(value))
        current.push(value)
    })

    return this
  }

  /**
   * Gets the trail array of this token.
   *
   * @returns {Array<ThemeToken>} The trail array.
   */
  getTrail() {
    return this.#trail
  }

  /**
   * Sets the parsed color object for this token.
   *
   * @param {object} parsedColor - The parsed Culori color object
   * @returns {ThemeToken} This token instance.
   */
  setParsedColor(parsedColor) {
    this.#parsedColor = parsedColor

    return this
  }

  /**
   * Gets the parsed color object of this token.
   *
   * @returns {object|null} The parsed Culori color object or null.
   */
  getParsedColor() {
    return this.#parsedColor
  }

  /**
   * Checks if this token has an ancestor with the given token name.
   *
   * @param {string} name - The name of the ancestor token to check for.
   * @returns {boolean} True if ancestor exists.
   */
  hasDependency(name) {
    return this.#dependency && this.#dependency.getName() === name
  }

  /**
   * Gets the ThemePool associated with this token.
   *
   * @returns {ThemePool} The associated pool.
   */
  getPool() {
    return this.#pool
  }

  /**
   * Returns a JSON representation of the ThemeToken.
   *
   * @returns {object} JSON representation of the ThemeToken
   */
  toJSON() {
    return {
      name: this.#name,
      kind: this.#kind,
      rawValue: this.#rawValue,
      value: this.#value,
      dependency: this.#dependency?.toJSON() ?? null,
      parentTokenKey: this.#parentTokenKey,
      trail: this.#trail,
      parsedColor: this.#parsedColor
    }
  }
}
