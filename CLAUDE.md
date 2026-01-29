# CLAUDE.md

This file provides guidance to Claude Code (and similar coding agents) when working with code in this repository.

## Project Overview

@gesslar/sassy is a VS Code theme generator that transforms YAML/JSON5 theme definitions into VS Code `.color-theme.json` files. It provides variable systems, colour functions (via Culori), import/composition, and watch mode for live development.

## Development Commands

### Testing

```bash
# Run all tests
pnpm test

# Run a single test file
node --test tests/Colour.test.js
node --test tests/Compiler.test.js
```

### Linting & Types

```bash
# Lint code
pnpm lint

# Generate TypeScript definitions from JSDoc
pnpm types
```

### Running the CLI

```bash
# Via npm script
pnpm exec -- build --watch --output-dir ./examples/output ./examples/simple/midnight-ocean-json5.json5

# Direct
node ./src/cli.js build my-theme.yaml
```

### Documentation Site

```bash
# Dev server
pnpm docs:dev

# Production build
pnpm docs:build
```

### Publishing & Updates

```bash
# Publish to npm
pnpm submit

# Update dependencies
pnpm update

# Create PR with Graphite
pnpm pr
```

## Architecture

### Source Files (`src/`)

- `cli.js` - Commander.js CLI entry point with subcommands (build, resolve, lint)
- `Session.js` - Orchestrates theme processing sessions
- `Theme.js` - Theme lifecycle: load, build, write, watch mode, dependency tracking
- `Compiler.js` - Compilation pipeline: imports, variable decomposition, token evaluation
- `Evaluator.js` - Variable substitution and colour function evaluation
- `ThemePool.js` - Central token registry and dependency graph
- `ThemeToken.js` - Individual token with value, dependencies, resolution trail
- `Colour.js` - Colour manipulation via Culori (lighten, darken, mix, alpha, etc.)
- `Command.js` - Base command class
- `BuildCommand.js` - Build subcommand implementation
- `ResolveCommand.js` - Variable/token resolution debugging
- `LintCommand.js` - Theme validation (duplicate scopes, undefined vars, precedence)

### Key Design Patterns

- **Parametric design**: Semantic variables over literal hex codes
- **Phase-based compilation**: Import resolution → variable decomposition → token evaluation → function application → dependency resolution → theme assembly
- **ThemePool/ThemeToken system**: Tracks resolution trails, enables debugging, detects circular dependencies
- **Hash-based output**: Skips file writes when output unchanged (sha256)
- **Error context chains**: `Sass.new(msg).trace(context)` for structured error reporting

### Documentation Site (`docs/`)

Docusaurus 3 site deployed to `sassy.gesslar.io` via rsync. Workflow at `.github/workflows/deploy-docs.yml`.

## Code Standards

### ESLint Configuration

Style is enforced by `@gesslar/uglier` ESLint config. **Non-negotiable** preferences:

- **No Prettier**
- **No spaces after control keywords:** `if(condition)` not `if (condition)`
- **No semicolons**
- **Arrow parens as-needed:** `c =>` not `(c) =>`
- **No internal object spacing:** `{key: value}` not `{ key: value }`

**DO NOT suggest style changes.** ESLint handles all formatting.

### JSDoc Requirements

- All public functions must have descriptions
- `@param` and `@returns` required
- Private methods marked with `@private`

### Review Focus

- Functional correctness and logic errors
- Security vulnerabilities
- Performance issues
- Modern JavaScript (`??`, `?.`, destructuring)

## Module System

- **Type:** ES6 modules (`"type": "module"`)
- **Node Version:** `>=22`
- **Package Manager:** pnpm
- **Import Extensions:** Always use `.js` extensions

## Testing

Tests use Node.js built-in test runner (`node:test`):

```javascript
import {describe, it, before, after, beforeEach} from 'node:test'
import assert from 'node:assert/strict'
```

- Test files: `tests/*.test.js`
- Fixtures: `tests/fixtures/`
- Helpers: `tests/helpers/`

## Dependencies

**Runtime:** `@gesslar/colours`, `@gesslar/toolkit`, `chokidar`, `color-support`, `commander`, `culori`, `globby`, `json5`, `yaml`

**Dev:** `@gesslar/uglier`, `eslint`, `typescript`

## Communication Style

- Use Canadian spelling
- Be direct and actionable
- Respect existing patterns and opinions
