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
export function parseSelector(selector: string): {
    type: string;
    modifiers: string[];
    language: string | null;
};
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
export function normaliseSelector(type: string, modifiers: string[], language: string | null): string;
/**
 * Computes the VS Code specificity score for a parsed selector.
 *
 * Formula: `languageBonus + typeScore + (modifierCount * 100)`
 *
 * @param {{ type: string, modifiers: string[], language: string|null }} parsed - Parsed selector
 * @returns {number} Specificity score (higher = more specific)
 */
export function computeSpecificity(parsed: {
    type: string;
    modifiers: string[];
    language: string | null;
}): number;
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
export const SELECTOR_PATTERN: RegExp;
/**
 * The 23 standard token types registered by VS Code in
 * `tokenClassificationRegistry.ts`, aligned with LSP 3.17/3.18.
 *
 * @type {Set<string>}
 */
export const STANDARD_TOKEN_TYPES: Set<string>;
/**
 * Deprecated token types mapped to their recommended replacements.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const DEPRECATED_TOKEN_TYPES: Readonly<Record<string, string>>;
/**
 * The 10 standard token modifiers registered by VS Code.
 *
 * @type {Set<string>}
 */
export const STANDARD_MODIFIERS: Set<string>;
/**
 * Valid keywords for the `fontStyle` property.
 *
 * @type {Set<string>}
 */
export const VALID_FONTSTYLE_KEYWORDS: Set<string>;
/**
 * Valid hex colour pattern for VS Code theme values.
 * Accepts #RGB, #RRGGBB, or #RRGGBBAA formats.
 *
 * @type {RegExp}
 */
export const HEX_COLOUR_PATTERN: RegExp;
/**
 * Boolean style properties that fontStyle overrides when both are present.
 *
 * @type {Set<string>}
 */
export const BOOLEAN_STYLE_PROPS: Set<string>;
//# sourceMappingURL=SemanticConstants.d.ts.map