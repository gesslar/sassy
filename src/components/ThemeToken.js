
/**
 * ThemeToken represents a single token in a theme tree, encapsulating theme
 * token data and relationships.
 *
 * Provides property management, factory methods, tree integration, and
 * serialization.
 *
 * @class ThemeToken
 */
import AuntyError from "./AuntyError.js"
import Term from "./Term.js"
import ThemePool from "./ThemePool.js"

/**
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

  /**
   * Constructs a ThemeToken with a given token name.
   *
   * @param {string} name - The token name for this token.
   */
  constructor(name) {
    // Term.debug("[ThemeToken:constructor]", name)
    if(typeof name !== "string")
      throw AuntyError.new("Token name must be a bare string.")

    this.setName(name)
  }

  addToPool(pool=null, dependency) {
    if(!(pool instanceof ThemePool))
      throw AuntyError.new("Pool must be a ThemePool instance.")

    if(this.#pool)
      return this

    if(!(dependency == null || dependency instanceof ThemeToken))
      throw AuntyError.new("Dependency must be null or of type ThemeToken.")

    this.#pool = pool

    return pool.addToken(this, dependency)
  }

  setName(name) {
    if(!this.#name)
      this.#name = name

    return this
  }

  getName() {
    return this.#name
  }

  setKind(kind) {
    if(!this.#kind)
      this.#kind = kind

    return this
  }

  getKind() {
    return this.#kind
  }

  setValue(value) {
    this.#value = value

    return this
  }

  getValue() {
    return this.#value
  }

  setRawValue(raw) {
    if(!this.#rawValue)
      this.#rawValue= raw

    return this
  }

  getRawValue() {
    return this.#rawValue
  }

  setDependency(dependency) {
    if(!this.#dependency)
      this.#dependency = dependency

    return this
  }

  getDependency() {
    return this.#dependency || null
  }

  setParentTokenKey(tokenKey) {
    this.#parentTokenKey = tokenKey

    return this
  }

  getParentTokenKey() {
    return this.#parentTokenKey || null
  }

  addTrail(trail) {
    // Term.debug("[addTrail]", "Adding Trail", trail.map(e => e.getName()), "to", this.getName())

    const current = this.#trail

    trail.forEach(value => {
      if(!current.includes(value))
        current.push(value)
    })

    return this
  }

  getTrail() {
    return this.#trail
  }

  /**
   * Checks if this token has an ancestor with the given token name.
   *
   * @param {string} name - The name of the ancestor token to check for.
   * @returns {boolean} True if ancestor exists.
   */
  hasDependency(name) {
    return this.#dependency && this.#dependency.name === name
  }

  getPool() {
    return this.#pool
  }
}
