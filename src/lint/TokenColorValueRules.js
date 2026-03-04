/**
 * @file TokenColorValueRules.js
 *
 * Validates tokenColors `settings` objects. Checks for missing or empty
 * settings, hex colour formats, fontStyle keyword validity, deprecated
 * `background` usage, and unknown settings properties.
 */

import {
  HEX_COLOUR_PATTERN,
  VALID_FONTSTYLE_KEYWORDS,
} from "./SemanticConstants.js"

/**
 * Lint rules for tokenColors settings values.
 */
export default class TokenColorValueRules {
  static ISSUE_TYPES = Object.freeze({
    MISSING_SETTINGS: "tc-missing-settings",
    EMPTY_SETTINGS: "tc-empty-settings",
    INVALID_HEX_COLOUR: "tc-invalid-hex-colour",
    INVALID_FONTSTYLE: "tc-invalid-fontstyle",
    DEPRECATED_BACKGROUND: "tc-deprecated-background",
    UNKNOWN_SETTINGS_PROPERTY: "tc-unknown-settings-property",
  })

  /** @type {Set<string>} Valid properties in a tokenColors settings object. */
  static #VALID_PROPERTIES = new Set([
    "foreground", "background", "fontStyle",
  ])

  /**
   * Runs all value rules against the tokenColors array.
   *
   * @param {Array} tokenColors - The compiled tokenColors array
   * @returns {Array<object>} Array of issue objects
   */
  static run(tokenColors) {
    if(!Array.isArray(tokenColors))
      return []

    const issues = []

    for(let i = 0; i < tokenColors.length; i++) {
      const entry = tokenColors[i]
      const name = entry.name || `Entry ${i + 1}`

      issues.push(...this.#checkEntry(entry, name))
    }

    return issues
  }

  /**
   * Validates a single tokenColors entry's settings.
   *
   * @param {object} entry - The tokenColors entry
   * @param {string} name - Entry name for reporting
   * @returns {Array<object>} Issues found
   * @private
   */
  static #checkEntry(entry, name) {
    const issues = []
    const settings = entry.settings

    // Missing settings
    if(settings === undefined || settings === null ||
       typeof settings !== "object" || Array.isArray(settings)) {
      issues.push({
        type: this.ISSUE_TYPES.MISSING_SETTINGS,
        severity: "high",
        rule: name,
        message: `'${name}' has no valid settings object`,
      })

      return issues
    }

    const keys = Object.keys(settings)

    // Empty settings
    if(keys.length === 0) {
      issues.push({
        type: this.ISSUE_TYPES.EMPTY_SETTINGS,
        severity: "low",
        rule: name,
        message: `'${name}' has empty settings (does nothing)`,
      })

      return issues
    }

    // Check each property
    for(const key of keys) {
      // Unknown property
      if(!this.#VALID_PROPERTIES.has(key)) {
        issues.push({
          type: this.ISSUE_TYPES.UNKNOWN_SETTINGS_PROPERTY,
          severity: "low",
          rule: name,
          property: key,
          message: `'${name}' has unknown settings property '${key}' (valid: foreground, background, fontStyle)`,
        })
      }
    }

    // Check foreground hex
    if(settings.foreground !== undefined && typeof settings.foreground === "string")
      issues.push(...this.#checkHexColour(name, settings.foreground, "foreground"))

    // Check background (deprecated + hex validation)
    if(settings.background !== undefined) {
      issues.push({
        type: this.ISSUE_TYPES.DEPRECATED_BACKGROUND,
        severity: "medium",
        rule: name,
        message: `'${name}' uses 'background' which is deprecated and has limited support in VS Code`,
      })

      if(typeof settings.background === "string")
        issues.push(...this.#checkHexColour(name, settings.background, "background"))
    }

    // Check fontStyle keywords
    if(settings.fontStyle !== undefined && typeof settings.fontStyle === "string" && settings.fontStyle !== "") {
      const keywords = settings.fontStyle.split(/\s+/)

      for(const keyword of keywords) {
        if(!VALID_FONTSTYLE_KEYWORDS.has(keyword)) {
          issues.push({
            type: this.ISSUE_TYPES.INVALID_FONTSTYLE,
            severity: "medium",
            rule: name,
            keyword,
            message: `fontStyle keyword '${keyword}' in '${name}' is not recognised (valid: italic, bold, underline, strikethrough)`,
          })
        }
      }
    }

    return issues
  }

  /**
   * Validates a hex colour string.
   *
   * @param {string} name - Entry name for reporting
   * @param {string} colour - The colour string
   * @param {string} property - Which property (foreground/background)
   * @returns {Array<object>} Issues found
   * @private
   */
  static #checkHexColour(name, colour, property) {
    if(!HEX_COLOUR_PATTERN.test(colour)) {
      return [{
        type: this.ISSUE_TYPES.INVALID_HEX_COLOUR,
        severity: "high",
        rule: name,
        colour,
        property,
        message: `'${colour}' in '${name}' (${property}) is not a valid hex colour (#RGB, #RRGGBB, or #RRGGBBAA)`,
      }]
    }

    return []
  }
}
