# Aunty Rose - Development Documentation

This document contains technical information for developers working on or
extending Aunty Rose.

## CLI Implementation

The CLI is built with Commander.js using a subcommand architecture:

```text
Usage: aunty <command> [options] <args...>

Commands:
  build <file...>          Compile theme files to VS Code format
  resolve <file>           Resolve and inspect theme variables/tokens

Build Command Options:
  -w, --watch              File watching with chokidar
  -o, --output-dir <dir>   Output directory handling
  -n, --dry-run            Stdout instead of file writes
  -s, --silent             Suppress non-error output

Resolve Command Options:
  -t, --token <key>        Resolve specific token to final value

Global Options:
  --nerd                   Full error stack traces
```

The CLI delegates to command classes (`BuildCommand`, `ResolveCommand`) that extend `AuntyCommand`. See README.md for complete CLI usage examples.

## Error Handling Architecture

### AuntyError Class

The `AuntyError` class provides structured error reporting with context chains:

```javascript
// Friendly causal chain collection
AuntyError.new("Variable not found")
  .trace("evaluating $(unknown.var)")
  .trace("in theme.colors['editor.background']")
  .trace("compiling ocean-theme.yaml")
```

**Error Modes:**

- **Default**: Clean multi-line trace showing domain context
- **Nerd mode** (`--nerd`): Adds pruned JS stack frames for debugging

**Key methods:**

- `AuntyError.new(message)` - Create new error
- `error.trace(context)` - Add context layer
- `error.report()` - Format for output

### Watch Mode Implementation

File watching uses chokidar with stability controls:

```javascript
// Watch setup in Theme.js
this.#watcher = chokidar.watch(dependencies, {
  ignored: [this.#outputFileName],
  awaitWriteFinish: {
    stabilityThreshold: 100,
    pollInterval: 50
  }
})
```

**Change handling:**

1. Bundle reload if entry file changed
2. Pause existing watchers during recompilation
3. Hash-based output skipping for unchanged themes

## Theme Class Structure

Each entry file becomes a Theme instance that manages the complete compilation lifecycle:

```ts
interface Theme {
  sourceFile: FileObject            // entry theme file
  source: object                    // parsed YAML / JSON5 (must contain config)
  output: object                    // final theme JSON object
  dependencies: FileObject[]        // all secondary sources discovered during compile
  lookup: object                    // variable lookup data for compilation
  pool: ThemePool                   // token resolution tracking system
  outputFileName: string            // computed output file path

  // Methods
  load(): Promise<Theme>            // loads and parses the source file
  build(options?): Promise<Theme>   // compiles via Compiler
  write(forceWrite?): Promise<object> // outputs to file or stdout with hash checking
  addDependency(file): Theme        // adds a file dependency
  reset(): void                     // clears compilation state
}
```

The Theme class manages its complete lifecycle including:

- File loading and parsing (JSON5/YAML support)
- Dependency tracking for imports
- Internal watch mode with chokidar integration
- Hash-based output skipping to prevent unnecessary writes

## Theme Resolution System

The current implementation uses a sophisticated token resolution system:

- **ThemePool**: Central registry for all tokens and their relationships
- **ThemeToken**: Individual token with value, dependencies, and resolution trail
- **Evaluator**: Handles variable substitution and function evaluation

This architecture enables the `resolve` command to provide detailed introspection into how any variable resolves to its final value.

### Resolve Command Implementation

The `ResolveCommand` class provides theme debugging capabilities:

```bash
npx @gesslar/aunty resolve --token std.bg.accent.faint my-theme.yaml
```

This command:

1. Loads and compiles the theme to build the complete ThemePool
2. Retrieves the requested token and its resolution trail
3. Formats a tree-like visual output showing each resolution step
4. Color-codes different token types (variables, functions, hex colors, literals)

The output shows the complete dependency chain from the original expression to the final resolved value, making it easy to debug complex variable relationships.

## Imports

Imports live under `config.imports` (e.g.
`config.imports.vars.<alias>: ./file.yaml`). Imported variable trees merge
into your namespace; you can then reference them like
`$(alias.palette.primary)`.

## Skipped Writes & Dry Runs

Outputs are hashed (sha256). If the hash matches the existing on-disk file,
no write occurs and the state shows `<skipped>`. Use `--dry-run` to inspect
the generated JSON without touching the filesystem.

## Performance Timing

Each phase timing (load / compile / write) is recorded (ms, one decimal) and
displayed inline. Currently the timing infrastructure is being updated to
work with the new Theme class architecture for potential future aggregation
or profiling output.

## API Reference

### Compiler

```bash
npm install @gesslar/aunty
```

```javascript
import Theme from '@gesslar/aunty/src/components/Theme.js'
import FileObject from '@gesslar/aunty/src/components/FileObject.js'

const fileObject = new FileObject('my-theme.yaml')
const theme = new Theme(fileObject, process.cwd(), {})

await theme.load()
await theme.build()
await theme.write()
// Result available in my-theme.color-theme.json
```

## Architecture

Aunty Rose processes themes in phases:

1. **Import Resolution** - Merge modular theme files using `config.imports`
2. **Variable Decomposition** - Flatten nested object structures into dot-notation paths
3. **Token Evaluation** - Resolve `$(variable)` references through ThemePool system
4. **Function Application** - Execute color manipulation functions (`lighten`, `darken`, `oklch`, `oklcha`, etc.)
5. **Dependency Resolution** - Build token dependency graph and resolve in correct order
6. **Theme Assembly** - Compose final VS Code theme JSON with proper structure

The ThemePool/ThemeToken system tracks resolution trails, enabling debugging and circular dependency detection. Error handling is per-entry theme: a failure in one file doesn't halt others (thanks to `Promise.allSettled`).

## Variable / Token Reference Syntax

You can reference previously defined variables (and nested properties)
using any of three interchangeable syntaxes:

| Form | Example | Notes |
|------|---------|-------|
| `$path.to.var` | `$std.bg.panel.inner` | Short / legacy form. Stops at first non word / `.` character. |
| `$(path.to.var)` | `$(std.bg.panel.inner)` | Recommended. Explicit terminator allows adjacent punctuation: `fade($(std.bg.accent), 30)` |
| `${path.to.var}` | `${std.bg.panel.inner}` | Braced form; behaves the same as `$(...)`. |

All three resolve identically. You can even mix them freely (the evaluator
doesn't mind); the parenthesised form is simply the most robust inside
longer strings or when followed immediately by characters that could extend
a bare token.

Resolution order:

1. All `vars` entries are fully resolved first (only against the variable
   set).
2. Theme entries are then resolved against the union of resolved vars +
   theme.

This guarantees variables never see partially-resolved theme state and lets
theme keys layer atop a stable semantic base.

## Extending

Potential extension points (PRs / forks):

- Additional colour manipulation functions
- Custom phase injectors (e.g. contrast auto-tuning)
- Output format plugins (JetBrains, Sublime, etc.)
- Structured profiling / JSON stats emitter when `--profile` is set

If you build something neat, consider opening a PR or sharing a gist.

## Development Setup

```bash
git clone https://github.com/gesslar/aunty
cd aunty
npm install
```

Local CLI development:

```bash
node ./src/cli.js build examples/simple/midnight-ocean.yaml -o ./examples/output \
  --watch
```

## Kary Pro Colors

To demonstrate the flexibility of incorporating multiple sources, included
in this repo are two syntax highlighting files from [Kary Pro
Colors](https://marketplace.visualstudio.com/items?itemName=karyfoundation.theme-karyfoundation-themes)
by Pouya Kary. These files *are not* released under the Unlicense, but
rather bear their own licensing terms. Using those files, you are bound by
Pouya's very generous licensing.

These files differ from the original source in that they have been modified
to correspond to the DSL of this theming engine.

A copy of the GPL3 license is included in the `examples/advanced/import`
directory and applies specifically to:

- `examples/advanced/import/karyprocolors-dark.tmLanguage.yaml`
- `examples/advanced/import/karyprocolors-light.tmLanguage.yaml`

## Philosophy

Aunty Rose embraces **parametric design** principles:

- **Semantic over literal** - `$(std.accent)` tells you *what* it is
- **Relationships over isolation** - Colours that belong together, stay
  together
- **Composition over inheritance** - Mix and match modular systems
- **Intention over implementation** - Express design intent, not hex codes

## Publishing

Publish (maintainer): ensure README & package version sync, then `npm run
submit` (as configured in your scripts) or standard `npm publish` if
appropriate.
