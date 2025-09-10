# Sassy - Development Documentation

This document contains technical information for developers working on or
extending Sassy.

## CLI Implementation

The CLI is built with Commander.js using a subcommand architecture:

```text
Usage: sassy <command> [options] <args...>

Commands:
  build <file...>          Compile theme files to VS Code format
  resolve <file>           Resolve and inspect theme variables/tokens
  lint <file>              Validate theme files for potential issues

Build Command Options:
  -w, --watch              File watching with chokidar
  -o, --output-dir <dir>   Output directory handling
  -n, --dry-run            Stdout instead of file writes
  -s, --silent             Suppress non-error output

Resolve Command Options:
  -c, --color <key>        Resolve specific color property to final value
  -t, --tokenColor <scope> Resolve tokenColors for a specific scope
  -s, --semanticTokenColor <token> Resolve semantic token colors

Lint Command Options:
  (No specific options beyond global --nerd)

Global Options:
  --nerd                   Full error stack traces
```

The CLI delegates to command classes (`BuildCommand`, `ResolveCommand`,
`LintCommand`) that extend `Command`. See README.md for complete CLI
usage examples.

## Error Handling Architecture

### Sass Error Class

The `Sass` class provides structured error reporting with context chains:

```javascript
// Friendly causal chain collection
Sass.new("Variable not found")
  .trace("evaluating $(unknown.var)")
  .trace("in theme.colors['editor.background']")
  .trace("compiling ocean-theme.yaml")
```

**Error Modes:**

- **Default**: Clean multi-line trace showing domain context
- **Nerd mode** (`--nerd`): Adds pruned JS stack frames for debugging

**Key methods:**

- `Sass.new(message)` - Create new error
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

Each entry file becomes a Theme instance that manages the complete compilation
lifecycle:

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

This architecture enables the `resolve` command to provide detailed
introspection into how any variable resolves to its final value.

### Resolve Command Implementation

The `ResolveCommand` class provides theme debugging capabilities with support
for different types of theme properties:

```bash
# Resolve color properties (flat object structure)
npx @gesslar/sassy resolve --color editor.background my-theme.yaml

# Resolve tokenColors (array structure with scope matching)
npx @gesslar/sassy resolve --tokenColor keyword.control my-theme.yaml

# Resolve semantic token colors
npx @gesslar/sassy resolve --semanticTokenColor variable.readonly my-theme.yaml
```

**Architecture:**

The ResolveCommand uses a dynamic method resolution pattern based on CLI options:

- `--color` → calls `resolveColor()` - handles flat color object properties
- `--tokenColor` → calls `resolveTokenColor()` - matches scopes in tokenColors array
- `--semanticTokenColor` → calls `resolveSemanticTokenColor()` - handles semantic tokens

**Key Implementation Details:**

1. **Color Resolution**: Direct lookup in the compiled theme's colors object,
   showing variable dependency chains through the ThemePool system

2. **TokenColor Resolution**: Searches tokenColors array for entries matching
   the requested scope, prioritizing variables from `scope.*` namespace over
   compiled hex values to show meaningful resolution trails

3. **Semantic Token Resolution**: Handles semantic token color mappings with
   proper scope hierarchy

4. **Visual Output**: All resolution types produce tree-like visual output
   showing each resolution step with color-coded token types (variables,
   functions, hex colors, literals)

The output shows the complete dependency chain from the original expression to
the final resolved value, making it easy to debug complex variable
relationships across different theme property types.

### LintCommand Implementation

The `LintCommand` class provides comprehensive theme validation capabilities:

```bash
npx @gesslar/sassy lint my-theme.yaml
```

**Architecture:**

The LintCommand follows the same Command pattern as BuildCommand and
ResolveCommand, implementing four distinct validation passes:

1. **Duplicate Scope Detection**: Analyzes tokenColors array to find scopes
   that appear in multiple rules, which can cause unexpected precedence issues

2. **Undefined Variable Detection**: Cross-references variable usage in
   tokenColors against the compiled ThemePool to catch typos and missing
   definitions

3. **Unused Variable Analysis**: Identifies variables defined under `scope.*`
   that are never referenced in tokenColors (other variables may be used in
   colors section)

4. **Precedence Issue Detection**: Detects rule ordering problems where broad
   scopes appear before more specific ones, causing the specific rules to be
   masked

**Key Implementation Details:**

- `getSourceTokenColors()`: Extracts pre-compilation tokenColors data from both
  main theme file and imported dependencies for accurate variable analysis

- Source vs Compiled Analysis: The linter analyzes source tokenColors (before
  variable resolution) to catch undefined variables, but uses the compiled
  ThemePool for variable existence checking

- Professional Output: Uses ANSI color coding with ERROR:/WARN: prefixes
  instead of emoji-based formatting for professional CLI appearance

- Structured Issue Reporting: Each issue type has specific formatting that
  includes context like rule names, indices, and variable paths for easy
  debugging

**Error Categories:**

All issues are categorized as either 'error' (undefined variables) or 'warning'
(duplicates, unused variables, precedence). The command exits cleanly regardless
of findings, making it suitable for CI/CD integration.

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
npm install @gesslar/sassy
```

```javascript
import Theme from '@gesslar/sassy/src/components/Theme.js'
import FileObject from '@gesslar/sassy/src/components/FileObject.js'

const fileObject = new FileObject('my-theme.yaml')
const theme = new Theme(fileObject, process.cwd(), {})

await theme.load()
await theme.build()
await theme.write()
// Result available in my-theme.color-theme.json
```

## Architecture

Sassy processes themes in phases:

1. **Import Resolution** - Merge modular theme files using `config.imports`
2. **Variable Decomposition** - Flatten nested object structures into dot-
   notation paths
3. **Token Evaluation** - Resolve `$(variable)` references through ThemePool
  system
4. **Function Application** - Execute colour manipulation functions (`lighten`,
  `darken`, `oklch`, `oklcha`, etc.) leveraging Culori's comprehensive parsing
  for automatic support of any colour format
5. **Dependency Resolution** - Build token dependency graph and resolve in
  correct order
6. **Theme Assembly** - Compose final VS Code theme JSON with proper structure

The ThemePool/ThemeToken system tracks resolution trails, enabling debugging
and circular dependency detection. Error handling is per-entry theme: a failure
in one file doesn't halt others (thanks to `Promise.allSettled`).

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

## Culori Integration

Sassy leverages [Culori](https://culorijs.org/) for colour parsing and
manipulation. The Evaluator's colour function system works as follows:

**Architecture:**

- **Explicit functions** (`lighten`, `darken`, `mix`, etc.) have dedicated
  switch cases for custom logic
- **Default case** passes any unrecognized colour expression to
  `Colour.toHex(raw)`
- **Colour.toHex()** uses Culori's `parse()` function to handle any supported
  colour format automatically

**This means:**

- Any colour format Culori supports works instantly (LAB, LCH, HWB, Display P3,
  Rec. 2020, etc.)
- No need to add switch cases for new colour formats
- Theme developers get the full power of modern colour science

**Example flow:**

```yaml
primary: oklch(0.7, 25, 180)     # → default case → Colour.toHex() → "#4a9eff"
accent: lighten($(primary), 20)  # → explicit case → Colour.lightenOrDarken()
mixed: lab(50 20 -30)           # → default case → Colour.toHex() → "#7d5a47"
```

## Extending

Potential extension points (PRs / forks):

- Additional colour manipulation functions (though Culori's automatic support
  reduces this need)
- Custom phase injectors (e.g. contrast auto-tuning)
- Output format plugins (JetBrains, Sublime, etc.)
- Structured profiling / JSON stats emitter when `--profile` is set

If you build something neat, consider opening a PR or sharing a gist.

## Development Setup

```bash
git clone https://github.com/gesslar/sassy
cd sassy
npm install
```

Local CLI development:

```bash
node ./src/cli.js build examples/simple/midnight-ocean.yaml -o ./examples/output \
  --watch
```

## Philosophy

Sassy embraces **parametric design** principles:

- **Semantic over literal** - `$(std.accent)` tells you *what* it is
- **Relationships over isolation** - Colours that belong together, stay
  together
- **Composition over inheritance** - Mix and match modular systems
- **Intention over implementation** - Express design intent, not hex codes

## Publishing

Publish (maintainer): ensure README & package version sync, then `npm run
submit` (as configured in your scripts) or standard `npm publish` if
appropriate.
