/**
 * @file SemanticValueRules.js
 *
 * Validates semanticTokenColors values. Checks hex colour formats, style
 * object properties, fontStyle keyword validity, the fontStyle-vs-boolean
 * conflict, deprecated `background` usage, and empty rules.
 */

import {
  HEX_COLOUR_PATTERN,
  VALID_FONTSTYLE_KEYWORDS,
  BOOLEAN_STYLE_PROPS,
} from "./SemanticConstants.js"

/**
 * Lint rules for semanticTokenColors values.
 */
export default class SemanticValueRules {
  static ISSUE_TYPES = Object.freeze({
    INVALID_VALUE: "invalid-value",
    INVALID_HEX_COLOUR: "invalid-hex-colour",
    INVALID_FONTSTYLE: "invalid-fontstyle",
    FONTSTYLE_CONFLICT: "fontstyle-conflict",
    DEPRECATED_PROPERTY: "deprecated-property",
    EMPTY_RULE: "empty-rule",
  })

  /** @type {Set<string>} Known valid properties in a style object. */
  static #VALID_PROPERTIES = new Set([
    "foreground", "fontStyle",
    ...BOOLEAN_STYLE_PROPS,
    "background",
  ])

  /**
   * Runs all value rules against the semanticTokenColors object.
   *
   * @param {object} semanticTokenColors - The compiled semanticTokenColors object
   * @returns {Array<object>} Array of issue objects
   */
  static run(semanticTokenColors) {
    if(!semanticTokenColors || typeof semanticTokenColors !== "object")
      return []

    const issues = []

    for(const [selector, value] of Object.entries(semanticTokenColors))
      issues.push(...this.#checkValue(selector, value))

    return issues
  }

  /**
   * Validates a single value (string or object).
   *
   * @param {string} selector - The selector key
   * @param {*} value - The value to validate
   * @returns {Array<object>} Issues found
   * @private
   */
  static #checkValue(selector, value) {
    const issues = []

    if(typeof value === "string") {
      issues.push(...this.#checkHexColour(selector, value, "value"))
    } else if(value === null || value === false || typeof value === "number") {
      issues.push({
        type: this.ISSUE_TYPES.INVALID_VALUE,
        severity: "high",
        selector,
        value: String(value),
        message: `Value '${value}' for '${selector}' is not valid; expected a hex colour string or style object`,
      })
    } else if(typeof value === "object" && !Array.isArray(value)) {
      issues.push(...this.#checkStyleObject(selector, value))
    } else {
      issues.push({
        type: this.ISSUE_TYPES.INVALID_VALUE,
        severity: "high",
        selector,
        value: String(value),
        message: `Value for '${selector}' has unexpected type '${typeof value}'`,
      })
    }

    return issues
  }

  /**
   * Validates a hex colour string.
   *
   * @param {string} selector - The selector key
   * @param {string} colour - The colour string
   * @param {string} property - Which property this colour is from (for reporting)
   * @returns {Array<object>} Issues found
   * @private
   */
  static #checkHexColour(selector, colour, property) {
    if(!HEX_COLOUR_PATTERN.test(colour)) {
      return [{
        type: this.ISSUE_TYPES.INVALID_HEX_COLOUR,
        severity: "high",
        selector,
        colour,
        property,
        message: `'${colour}' in '${selector}' (${property}) is not a valid hex colour (#RGB, #RRGGBB, or #RRGGBBAA)`,
      }]
    }

    return []
  }

  /**
   * Validates a style object value.
   *
   * @param {string} selector - The selector key
   * @param {object} obj - The style object
   * @returns {Array<object>} Issues found
   * @private
   */
  static #checkStyleObject(selector, obj) {
    const issues = []
    const keys = Object.keys(obj)

    // Empty object
    if(keys.length === 0) {
      issues.push({
        type: this.ISSUE_TYPES.EMPTY_RULE,
        severity: "low",
        selector,
        message: `'${selector}' has an empty style object (does nothing)`,
      })

      return issues
    }

    // Check foreground
    if(obj.foreground !== undefined) {
      if(typeof obj.foreground === "string")
        issues.push(...this.#checkHexColour(selector, obj.foreground, "foreground"))
      else
        issues.push({
          type: this.ISSUE_TYPES.INVALID_VALUE,
          severity: "high",
          selector,
          value: String(obj.foreground),
          message: `'foreground' in '${selector}' should be a hex colour string, got ${typeof obj.foreground}`,
        })
    }

    // Check deprecated background
    if(obj.background !== undefined) {
      issues.push({
        type: this.ISSUE_TYPES.DEPRECATED_PROPERTY,
        severity: "medium",
        selector,
        property: "background",
        message: `'${selector}' uses 'background' which is deprecated and non-functional in VS Code`,
      })
    }

    // Check fontStyle
    if(obj.fontStyle !== undefined) {
      if(typeof obj.fontStyle !== "string") {
        issues.push({
          type: this.ISSUE_TYPES.INVALID_VALUE,
          severity: "high",
          selector,
          value: String(obj.fontStyle),
          message: `'fontStyle' in '${selector}' should be a string, got ${typeof obj.fontStyle}`,
        })
      } else if(obj.fontStyle !== "") {
        const keywords = obj.fontStyle.split(/\s+/)

        for(const keyword of keywords) {
          if(!VALID_FONTSTYLE_KEYWORDS.has(keyword)) {
            issues.push({
              type: this.ISSUE_TYPES.INVALID_FONTSTYLE,
              severity: "medium",
              selector,
              keyword,
              message: `fontStyle keyword '${keyword}' in '${selector}' is not recognised (valid: italic, bold, underline, strikethrough)`,
            })
          }
        }
      }
    }

    // Check fontStyle + boolean conflict (only when fontStyle is a valid string)
    const hasFontStyle = typeof obj.fontStyle === "string"
    const hasBooleanStyles = keys.some(k => BOOLEAN_STYLE_PROPS.has(k))

    if(hasFontStyle && hasBooleanStyles) {
      const conflicting = keys.filter(k => BOOLEAN_STYLE_PROPS.has(k))

      issues.push({
        type: this.ISSUE_TYPES.FONTSTYLE_CONFLICT,
        severity: "medium",
        selector,
        conflictingProps: conflicting,
        message: `'${selector}' has both fontStyle and ${conflicting.join(", ")} — fontStyle overrides the boolean properties`,
      })
    }

    return issues
  }
}
