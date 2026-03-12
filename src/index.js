/**
 * @file API entry point for @gesslar/sassy
 *
 * Exports classes and utilities for programmatic use by other npm packages.
 *
 * This allows other projects to import and use Sassy's functionality
 * programmatically.
 *
 * @example
 * // Import specific classes
 * import {Theme, Lint, Resolve, Colour} from '@gesslar/sassy'
 *
 * // Build a theme with the builder pattern
 * const theme = new Theme()
 *   .setCwd(cwd)
 *   .setThemeFile(fileObject)
 *   .setOptions({outputDir: './dist'})
 * await theme.load()
 * await theme.build()
 *
 * // Use engine classes directly (no CLI needed)
 * const results = await new Lint().run(theme)
 * const data = new Resolve().color(theme, 'editor.background')
 */

// Core theme functionality
export {default as Theme} from "./Theme.js"

// Engine classes — CLI-free analysis and introspection
export {Lint} from "./LintCommand.js"
export {Proof} from "./ProofCommand.js"
export {Resolve} from "./ResolveCommand.js"

// Colour utilities
export {default as Colour} from "./Colour.js"

// YAML AST and source-location tracking
export {default as YamlSource} from "./YamlSource.js"

// Lint rule modules — importable for targeted validation
export {default as SemanticSelectorRules} from "./lint/SemanticSelectorRules.js"
export {default as SemanticValueRules} from "./lint/SemanticValueRules.js"
export {default as SemanticCoherenceRules} from "./lint/SemanticCoherenceRules.js"
export {default as TokenColorValueRules} from "./lint/TokenColorValueRules.js"
export {default as TokenColorStructureRules} from "./lint/TokenColorStructureRules.js"

// Lint constants and utilities
export {
  SELECTOR_PATTERN,
  STANDARD_TOKEN_TYPES,
  DEPRECATED_TOKEN_TYPES,
  STANDARD_MODIFIERS,
  VALID_FONTSTYLE_KEYWORDS,
  HEX_COLOUR_PATTERN,
  BOOLEAN_STYLE_PROPS,
  parseSelector,
  normaliseSelector,
  computeSpecificity,
} from "./lint/SemanticConstants.js"

// Note: CLI functionality remains in cli.js and is accessible via the 'sassy'
// command when installed globally or via npx
