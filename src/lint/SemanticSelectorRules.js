/**
 * @file SemanticSelectorRules.js
 *
 * Validates semanticTokenColors selector keys against VS Code's parser
 * rules. Detects invalid syntax, unrecognised token types and modifiers,
 * deprecated types, and duplicate selectors (after modifier normalisation).
 */

import {
  SELECTOR_PATTERN,
  STANDARD_TOKEN_TYPES,
  STANDARD_MODIFIERS,
  DEPRECATED_TOKEN_TYPES,
  parseSelector,
  normaliseSelector,
} from "./SemanticConstants.js"

/**
 * Lint rules for semanticTokenColors selector keys.
 */
export default class SemanticSelectorRules {
  static ISSUE_TYPES = Object.freeze({
    INVALID_SELECTOR: "invalid-selector",
    UNRECOGNISED_TOKEN_TYPE: "unrecognised-token-type",
    UNRECOGNISED_MODIFIER: "unrecognised-modifier",
    DEPRECATED_TOKEN_TYPE: "deprecated-token-type",
    DUPLICATE_SELECTOR: "duplicate-selector",
  })

  /**
   * Runs all selector rules against the semanticTokenColors object.
   *
   * @param {object} semanticTokenColors - The compiled semanticTokenColors object
   * @returns {Array<object>} Array of issue objects
   */
  static run(semanticTokenColors) {
    if(!semanticTokenColors || typeof semanticTokenColors !== "object")
      return []

    const selectors = Object.keys(semanticTokenColors)
    const issues = []

    issues.push(...this.#checkSyntax(selectors))
    issues.push(...this.#checkTokenTypes(selectors))
    issues.push(...this.#checkModifiers(selectors))
    issues.push(...this.#checkDuplicates(selectors))

    return issues
  }

  /**
   * Validates selector strings against VS Code's regex pattern.
   *
   * @param {string[]} selectors - Selector keys
   * @returns {Array<object>} Issues for malformed selectors
   * @private
   */
  static #checkSyntax(selectors) {
    const issues = []

    for(const selector of selectors) {
      if(!SELECTOR_PATTERN.test(selector)) {
        issues.push({
          type: this.ISSUE_TYPES.INVALID_SELECTOR,
          severity: "high",
          selector,
          message: `Selector '${selector}' does not match VS Code's expected pattern`,
        })

        continue
      }

      // Check for empty type (parsing produces empty string)
      const parsed = parseSelector(selector)

      if(!parsed.type) {
        issues.push({
          type: this.ISSUE_TYPES.INVALID_SELECTOR,
          severity: "high",
          selector,
          message: `Selector '${selector}' has an empty token type`,
        })
      }
    }

    return issues
  }

  /**
   * Checks token types against the standard registry and deprecated list.
   *
   * @param {string[]} selectors - Selector keys
   * @returns {Array<object>} Issues for unrecognised or deprecated types
   * @private
   */
  static #checkTokenTypes(selectors) {
    const issues = []

    for(const selector of selectors) {
      if(!SELECTOR_PATTERN.test(selector))
        continue

      const {type} = parseSelector(selector)

      if(!type || type === "*")
        continue

      if(DEPRECATED_TOKEN_TYPES[type]) {
        issues.push({
          type: this.ISSUE_TYPES.DEPRECATED_TOKEN_TYPE,
          severity: "medium",
          selector,
          tokenType: type,
          replacement: DEPRECATED_TOKEN_TYPES[type],
          message: `Token type '${type}' is deprecated, use '${DEPRECATED_TOKEN_TYPES[type]}' instead`,
        })
      } else if(!STANDARD_TOKEN_TYPES.has(type)) {
        issues.push({
          type: this.ISSUE_TYPES.UNRECOGNISED_TOKEN_TYPE,
          severity: "low",
          selector,
          tokenType: type,
          message: `Token type '${type}' is not a standard VS Code token type (may require an extension)`,
        })
      }
    }

    return issues
  }

  /**
   * Checks modifiers against the standard registry.
   *
   * @param {string[]} selectors - Selector keys
   * @returns {Array<object>} Issues for unrecognised modifiers
   * @private
   */
  static #checkModifiers(selectors) {
    const issues = []

    for(const selector of selectors) {
      if(!SELECTOR_PATTERN.test(selector))
        continue

      const {modifiers} = parseSelector(selector)

      for(const modifier of modifiers) {
        if(!STANDARD_MODIFIERS.has(modifier)) {
          issues.push({
            type: this.ISSUE_TYPES.UNRECOGNISED_MODIFIER,
            severity: "low",
            selector,
            modifier,
            message: `Modifier '${modifier}' is not a standard VS Code modifier (may require an extension)`,
          })
        }
      }
    }

    return issues
  }

  /**
   * Detects duplicate selectors after normalising modifier order.
   *
   * VS Code sorts modifiers alphabetically during ID generation, so
   * `variable.readonly.static` and `variable.static.readonly` are
   * identical.
   *
   * @param {string[]} selectors - Selector keys
   * @returns {Array<object>} Issues for duplicate selectors
   * @private
   */
  static #checkDuplicates(selectors) {
    const issues = []
    const seen = new Map()

    for(const selector of selectors) {
      if(!SELECTOR_PATTERN.test(selector))
        continue

      const {type, modifiers, language} = parseSelector(selector)

      if(!type)
        continue

      const normalised = normaliseSelector(type, modifiers, language)

      if(seen.has(normalised)) {
        issues.push({
          type: this.ISSUE_TYPES.DUPLICATE_SELECTOR,
          severity: "medium",
          selector,
          duplicateOf: seen.get(normalised),
          message: `Selector '${selector}' is a duplicate of '${seen.get(normalised)}' (modifier order is irrelevant)`,
        })
      } else {
        seen.set(normalised, selector)
      }
    }

    return issues
  }
}
