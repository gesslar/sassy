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
export { default as Theme, WriteStatus } from "./Theme.js";
export { default as Lint } from "./Lint.js";
export { default as Proof } from "./Proof.js";
export { default as Resolve } from "./Resolve.js";
export { default as Colour } from "./Colour.js";
export { default as YamlSource } from "./YamlSource.js";
export { default as SemanticSelectorRules } from "./lint/SemanticSelectorRules.js";
export { default as SemanticValueRules } from "./lint/SemanticValueRules.js";
export { default as SemanticCoherenceRules } from "./lint/SemanticCoherenceRules.js";
export { default as TokenColorValueRules } from "./lint/TokenColorValueRules.js";
export { default as TokenColorStructureRules } from "./lint/TokenColorStructureRules.js";
export { SELECTOR_PATTERN, STANDARD_TOKEN_TYPES, DEPRECATED_TOKEN_TYPES, STANDARD_MODIFIERS, VALID_FONTSTYLE_KEYWORDS, HEX_COLOUR_PATTERN, BOOLEAN_STYLE_PROPS, parseSelector, normaliseSelector, computeSpecificity, } from "./lint/SemanticConstants.js";
//# sourceMappingURL=index.d.ts.map