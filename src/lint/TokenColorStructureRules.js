/**
 * @file TokenColorStructureRules.js
 *
 * Validates tokenColors array-level structure. Detects multiple scopeless
 * entries (global defaults) where only the last one takes effect.
 */

/**
 * Lint rules for tokenColors structural validation.
 */
export default class TokenColorStructureRules {
  static ISSUE_TYPES = Object.freeze({
    MULTIPLE_GLOBAL_DEFAULTS: "tc-multiple-global-defaults",
  })

  /**
   * Runs all structure rules against the tokenColors array.
   *
   * @param {Array} tokenColors - The compiled tokenColors array
   * @returns {Array<object>} Array of issue objects
   */
  static run(tokenColors) {
    if(!Array.isArray(tokenColors))
      return []

    return this.#checkMultipleGlobalDefaults(tokenColors)
  }

  /**
   * Detects multiple scopeless entries. In VS Code, a tokenColors entry
   * without a `scope` acts as a global default. When multiple exist,
   * only the last one takes effect — earlier ones are dead code.
   *
   * @param {Array} tokenColors - The compiled tokenColors array
   * @returns {Array<object>} Issues found
   * @private
   */
  static #checkMultipleGlobalDefaults(tokenColors) {
    const scopeless = []

    for(let i = 0; i < tokenColors.length; i++) {
      const entry = tokenColors[i]

      if(!entry.scope && entry.settings)
        scopeless.push({
          index: i + 1,
          name: entry.name || `Entry ${i + 1}`,
        })
    }

    if(scopeless.length <= 1)
      return []

    const issues = []

    // Flag all but the last scopeless entry as dead code
    for(let i = 0; i < scopeless.length - 1; i++) {
      const entry = scopeless[i]

      issues.push({
        type: this.ISSUE_TYPES.MULTIPLE_GLOBAL_DEFAULTS,
        severity: "medium",
        rule: entry.name,
        index: entry.index,
        message: `'${entry.name}' has no scope and is overridden by a later scopeless entry — only the last global default takes effect`,
      })
    }

    return issues
  }
}
