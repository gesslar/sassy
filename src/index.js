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
 *   .withOptions({outputDir: './dist'})
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

// Note: CLI functionality remains in cli.js and is accessible via the 'sassy'
// command when installed globally or via npx
