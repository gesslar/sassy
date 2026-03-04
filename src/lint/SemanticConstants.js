/**
 * @file SemanticConstants.js
 *
 * Shared constants and utilities for semantic token colour linting.
 * Contains the VS Code standard token type/modifier registry, selector
 * pattern validation, and a selector parser.
 */

/**
 * Regex pattern VS Code uses to validate semanticTokenColors selector keys.
 *
 * @type {RegExp}
 */
export const SELECTOR_PATTERN =
  /^(\w[-\w]*|\*)(\.\w[-\w]*)*(:\w[-\w]*)?$/

/**
 * The 23 standard token types registered by VS Code in
 * `tokenClassificationRegistry.ts`, aligned with LSP 3.17/3.18.
 *
 * @type {Set<string>}
 */
export const STANDARD_TOKEN_TYPES = new Set([
  "comment", "string", "keyword", "number", "regexp", "operator",
  "namespace", "type", "struct", "class", "interface", "enum",
  "typeParameter", "function", "method", "macro", "variable",
  "parameter", "property", "enumMember", "event", "decorator", "label",
])

/**
 * Deprecated token types mapped to their recommended replacements.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const DEPRECATED_TOKEN_TYPES = Object.freeze({
  member: "method",
})

/**
 * The 10 standard token modifiers registered by VS Code.
 *
 * @type {Set<string>}
 */
export const STANDARD_MODIFIERS = new Set([
  "declaration", "definition", "readonly", "static", "deprecated",
  "abstract", "async", "modification", "documentation", "defaultLibrary",
])

/**
 * Valid keywords for the `fontStyle` property.
 *
 * @type {Set<string>}
 */
export const VALID_FONTSTYLE_KEYWORDS = new Set([
  "italic", "bold", "underline", "strikethrough",
])

/**
 * Valid hex colour pattern for VS Code theme values.
 * Accepts #RGB, #RRGGBB, or #RRGGBBAA formats.
 *
 * @type {RegExp}
 */
export const HEX_COLOUR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/

/**
 * Boolean style properties that fontStyle overrides when both are present.
 *
 * @type {Set<string>}
 */
export const BOOLEAN_STYLE_PROPS = new Set([
  "bold", "italic", "underline", "strikethrough",
])

/**
 * Parses a semanticTokenColors selector string into its components.
 *
 * Follows VS Code's right-to-left parsing: the segment after the last `:`
 * becomes the language, segments separated by `.` after the first become
 * modifiers, and the leftmost segment is the token type (or `*`).
 *
 * @param {string} selector - The selector string to parse
 * @returns {{ type: string, modifiers: string[], language: string|null }}
 */
export function parseSelector(selector) {
  let remaining = selector
  let language = null

  // Extract language (rightmost segment after `:`)
  const colonIndex = remaining.lastIndexOf(":")

  if(colonIndex !== -1) {
    language = remaining.slice(colonIndex + 1)
    remaining = remaining.slice(0, colonIndex)
  }

  // Split on `.` — first segment is type, rest are modifiers
  const parts = remaining.split(".")
  const type = parts[0]
  const modifiers = parts.slice(1)

  return {type, modifiers, language}
}

/**
 * Normalises a selector by sorting its modifiers alphabetically.
 * This produces the canonical form VS Code uses internally for ID
 * generation, allowing duplicate detection regardless of modifier order.
 *
 * @param {string} type - Token type
 * @param {string[]} modifiers - Token modifiers
 * @param {string|null} language - Language scope
 * @returns {string} Normalised selector string
 */
export function normaliseSelector(type, modifiers, language) {
  const sorted = [...modifiers].sort()
  let result = type

  if(sorted.length > 0)
    result += `.${sorted.join(".")}`

  if(language)
    result += `:${language}`

  return result
}

/**
 * Computes the VS Code specificity score for a parsed selector.
 *
 * Formula: `languageBonus + typeScore + (modifierCount * 100)`
 *
 * @param {{ type: string, modifiers: string[], language: string|null }} parsed - Parsed selector
 * @returns {number} Specificity score (higher = more specific)
 */
export function computeSpecificity(parsed) {
  const languageBonus = parsed.language ? 10 : 0
  const typeScore = parsed.type === "*" ? 0 : 100
  const modifierScore = parsed.modifiers.length * 100

  return languageBonus + typeScore + modifierScore
}
