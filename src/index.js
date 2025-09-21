/**
 * @file API entry point for @gesslar/sassy
 * 
 * Exports classes and utilities for programmatic use by other npm packages.
 * This allows other projects to import and use Sassy's functionality programmatically.
 * 
 * @example
 * // Import specific classes
 * import { Theme, LintCommand, Compiler } from '@gesslar/sassy'
 * 
 * // Import everything
 * import * as Sassy from '@gesslar/sassy'
 * 
 * // Create and use a Theme programmatically
 * const theme = new Theme()
 * await theme.load('./my-theme.json5')
 * await theme.build()
 */

// Core theme functionality
export { default as Theme } from './Theme.js'
export { default as Compiler } from './Compiler.js'
export { default as Evaluator } from './Evaluator.js'

// Command classes for programmatic access
export { default as Command } from './Command.js'
export { default as BuildCommand } from './BuildCommand.js'
export { default as LintCommand } from './LintCommand.js'
export { default as ResolveCommand } from './ResolveCommand.js'

// File system utilities
export { default as FileObject } from './FileObject.js'
export { default as DirectoryObject } from './DirectoryObject.js'
export { default as File } from './File.js'

// Data handling and utilities
export { default as Data } from './Data.js'
export { default as Cache } from './Cache.js'
export { default as Session } from './Session.js'
export { default as Util } from './Util.js'

// Terminal utilities
export { default as Term } from './Term.js'

// Color utilities
export { default as Colour } from './Colour.js'

// Error handling
export { default as Sass } from './Sass.js'

// Note: CLI functionality remains in cli.js and is accessible via the 'sassy' command
// when installed globally or via npx