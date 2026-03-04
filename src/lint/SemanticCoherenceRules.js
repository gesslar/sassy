/**
 * @file SemanticCoherenceRules.js
 *
 * Theme-level coherence checks for semantic token colours.
 * Validates that `semanticHighlighting` is enabled when rules exist,
 * and detects shadowed rules via specificity scoring.
 */

import {
  SELECTOR_PATTERN,
  parseSelector,
  computeSpecificity,
} from "./SemanticConstants.js"

/**
 * Lint rules for semantic token colour theme coherence.
 */
export default class SemanticCoherenceRules {
  static ISSUE_TYPES = Object.freeze({
    MISSING_SEMANTIC_HIGHLIGHTING: "missing-semantic-highlighting",
    SHADOWED_RULE: "shadowed-rule",
  })

  /**
   * Runs all coherence rules against the full compiled output.
   *
   * @param {object} output - The full compiled theme output
   * @returns {Array<object>} Array of issue objects
   */
  static run(output) {
    if(!output)
      return []

    const issues = []
    const stc = output.semanticTokenColors

    if(stc && typeof stc === "object" && Object.keys(stc).length > 0) {
      issues.push(...this.#checkSemanticHighlighting(output))
      issues.push(...this.#checkShadowedRules(stc))
    }

    return issues
  }

  /**
   * Checks that `semanticHighlighting` is enabled when semanticTokenColors
   * rules are defined.
   *
   * @param {object} output - Full compiled theme output
   * @returns {Array<object>} Issues found
   * @private
   */
  static #checkSemanticHighlighting(output) {
    if(output.semanticHighlighting === true)
      return []

    return [{
      type: this.ISSUE_TYPES.MISSING_SEMANTIC_HIGHLIGHTING,
      severity: "high",
      message: "semanticTokenColors rules are defined but semanticHighlighting is not enabled — rules will be ignored when the user's editor.semanticHighlighting.enabled is \"configuredByTheme\"",
    }]
  }

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
  static #checkShadowedRules(semanticTokenColors) {
    const issues = []
    const entries = []

    // Parse and score all valid selectors
    for(const [selector, value] of Object.entries(semanticTokenColors)) {
      if(!SELECTOR_PATTERN.test(selector))
        continue

      const parsed = parseSelector(selector)

      if(!parsed.type)
        continue

      const specificity = computeSpecificity(parsed)
      const properties = this.#extractProperties(value)

      entries.push({selector, parsed, specificity, properties})
    }

    // Sort by specificity descending for efficient comparison
    entries.sort((a, b) => b.specificity - a.specificity)

    // Check each rule against all higher-specificity rules
    for(let i = 0; i < entries.length; i++) {
      const lower = entries[i]

      for(let j = 0; j < i; j++) {
        const higher = entries[j]

        // Higher must match a subset of lower's tokens
        if(!this.#couldShadow(higher.parsed, lower.parsed))
          continue

        // Check if higher defines all properties that lower defines
        if(lower.properties.length > 0 &&
           lower.properties.every(p => higher.properties.includes(p))) {
          issues.push({
            type: this.ISSUE_TYPES.SHADOWED_RULE,
            severity: "low",
            selector: lower.selector,
            shadowedBy: higher.selector,
            properties: lower.properties,
            message: `'${lower.selector}' is shadowed by '${higher.selector}' for matching tokens (both define ${lower.properties.join(", ")})`,
          })

          break
        }
      }
    }

    return issues
  }

  /**
   * Extracts the list of style properties defined by a value.
   *
   * @param {*} value - The selector's value
   * @returns {string[]} Property names
   * @private
   */
  static #extractProperties(value) {
    if(typeof value === "string")
      return ["foreground"]

    if(typeof value === "object" && value !== null)
      return Object.keys(value)

    return []
  }

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
  static #couldShadow(higher, lower) {
    // Type compatibility
    if(lower.type !== "*" && higher.type !== lower.type) {
      // Check supertype relationship for known types
      if(!this.#isSubtype(higher.type, lower.type))
        return false
    }

    // Language: if lower has no language restriction but higher does,
    // higher only shadows lower for that specific language
    if(lower.language && higher.language !== lower.language)
      return false

    if(!lower.language && higher.language) {
      // Higher is language-scoped, lower is not — higher shadows lower
      // only for that language (partial shadow, still worth noting)
    }

    // Modifiers: higher must have all of lower's modifiers
    const lowerMods = new Set(lower.modifiers)

    for(const mod of lowerMods) {
      if(!higher.modifiers.includes(mod))
        return false
    }

    return true
  }

  /**
   * Checks if `type` is a subtype of `superType` using VS Code's
   * built-in type hierarchy.
   *
   * @param {string} type - Potential subtype
   * @param {string} superType - Potential supertype
   * @returns {boolean} True if type is a subtype of superType
   * @private
   */
  static #isSubtype(type, superType) {
    // VS Code's built-in type hierarchy (from tokenClassificationRegistry.ts)
    const hierarchy = {
      method: "function",
      macro: "function",
      enumMember: "variable",
      parameter: "variable",
      property: "variable",
    }

    let current = type

    while(hierarchy[current]) {
      current = hierarchy[current]

      if(current === superType)
        return true
    }

    return false
  }
}
