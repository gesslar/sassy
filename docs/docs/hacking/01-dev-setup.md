---
sidebar_position: 1
title: "Development Setup"
---

# Development Setup

## Clone and Install

```bash
git clone https://github.com/gesslar/sassy
cd sassy
pnpm install
```

Sassy requires **Node.js >= 22** and uses **pnpm** as its package manager. The project is ES6 modules throughout (`"type": "module"` in `package.json`).

## Run from Source

```bash
node ./src/cli.js build examples/simple/midnight-ocean-yaml.yaml
```

This runs the CLI directly without installing globally. All subcommands (`build`, `resolve`, `lint`) are available.

## Testing

Run the full test suite:

```bash
pnpm test
```

Run a single test file:

```bash
node --test tests/Colour.test.js
node --test tests/Compiler.test.js
```

Tests use the Node.js built-in test runner (`node:test`) with `assert/strict`.

## Linting

```bash
pnpm lint
```

ESLint is configured via `@gesslar/uglier`. The style rules are **non-negotiable**:

- No semicolons
- No spaces after control keywords (`if(x)` not `if (x)`)
- No Prettier
- Arrow parens as-needed
- No internal object spacing (`{key: value}` not `{ key: value }`)

Do not suggest style changes. ESLint handles all formatting.

## Type Generation

```bash
pnpm types
```

TypeScript definitions are generated from JSDoc annotations. All public functions must have `@param` and `@returns` documentation.
