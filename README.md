# Aunty Rose - SCSS-Style Theme Engine for VS Code

![Aunty Rose](media/drawing2.png)

**Aunty Rose** brings sanity to VS Code theme development with
SCSS-inspired preprocessing, semantic colour relationships, and parametric design
systems.

*(Translation: It's like SCSS but for themes - your colours have names that
make sense, they talk to each other, and you can change everything by tweaking
a few variables instead of hunting down 800 random hex codes.)*

Express your themes hierarchically now, compile it into flat properties that
VS Code understands (why... did... they... do... that????).

## Features at a Glance

- YAML / JSON5 source → VS Code theme
- Semantic variable graph (`$(std.bg.panel.inner)`) instead of flat hex soup
- Colour functions: lighten / darken / fade / solidify / mix / invert / alpha
- Multi-document ( `---` ) theming for generating variants in a single file
- Modular imports for vars & theme fragments
- Change detection & watch mode with coloured status lines + timing
- Skips redundant writes via output hashing
- Extensible compiler phases (import → resolve → evaluate → emit)

## For example

Before:

```json5
editor: {
  background: "$(std.bg.panel)",
  foreground: "$(std.fg)",
  selectionBackground: "$(std.bg.accent)",
  lineHighlightBackground: "fade($(std.bg.accent), 30)"
}
```

```text

After:

```json
{
  "editor.background": "#1e1e1e",
  "editor.foreground": "#e6e6e6",
  "editor.selectionBackground": "#002e63",
  "editor.lineHighlightBackground": "#002e63b3",
}
```

## The Problem

Developing VS Code themes is a mess:

- 800+ flat colour properties with no relationships
- Want to adjust contrast? Good luck finding all 47 error-related colours
- Copy-paste hex codes everywhere and pray nothing breaks
- No semantic meaning, no design system, no composability

## The Solution

Aunty Rose serves:

- **Semantic variables** - `$(std.accent)` instead of `#4b8ebd`
- **Colour functions** - `lighten()`, `darken()`, `fade()`, `mix()`, ...
- **Hierarchical relationships** - panels that automatically maintain proper depth
- **Modular architecture** - import base systems, override specifics
- **Instant compilation** - YAML/JSON5 source → complete VS Code theme

## Quick Start

Use with npx - no installation required:

```bash
npx @gesslar/aunty my-theme.yaml
# Compiles to my-theme.color-theme.json
```

With watch mode for development:

```bash
npx @gesslar/aunty my-theme.yaml --watch
# Auto-recompiles when files change
```

Specify an output directory:

```bash
npx @gesslar/aunty -o ./themes my-theme.yaml
# Compiles to ./themes/my-theme.color-theme.json
```

For programmatic use as an NPM module:

```bash
npm i @gesslar/aunty
```

```javascript
import Compiler from '@gesslar/aunty'

const file = await loadDataFile('my-theme.yaml')
await Compiler.compile(file)
// Result available in file.result.output
```

## CLI Usage

```text
Usage: aunty [options] <file...>

Options:
  -w, --watch              Recompile when any input / imported file changes
  -o, --output-dir <dir>   Destination directory (defaults to cwd)
  -n, --dry-run            Print compiled JSON to stdout, skip writing
  -s, --silent             Suppress non-error output (errors still shown; dry-run still prints)
  --nerd                   Verbose error mode: full chained stack traces
  -p, --profile            (Reserved) Phase timing flag (basic timings already shown)
  -V, --version            Output version
  -h, --help               Show help
```

Multiple input theme files are processed in parallel; failures are reported individually.

### Nerd Mode (Verbose Errors)

`AuntyError` already collects a friendly causal chain (each nested context you see in the code adds a trace line). By default you get that whole multi‑line chain — clear, readable, no raw engine noise. Passing `--nerd` does not change the friendly portion; it *appends* a pruned underlying JS stack (function frames) after the trace so you can dive into call sites.

In short:

| Mode | Output |
|------|--------|
| default | Friendly multi‑line trace (domain context chain) |
| `--nerd` | Friendly trace + pruned JS stack frames (prefixed with `*`) |

Good reasons to add `--nerd`:

- Debugging a stubborn variable cycle
- Locating which imported file introduced a malformed colour
- Surfacing the original YAML path that produced a bad token/function call

Examples:

```bash
# Normal (concise) output
npx @gesslar/aunty bad-theme.yaml

# Verbose diagnostic output
npx @gesslar/aunty bad-theme.yaml --nerd

# Only verbose errors, suppressing status lines
npx @gesslar/aunty bad-theme.yaml --nerd --silent
```

When `--silent` is combined with `--nerd`, only the friendly trace + appended stack (or dry‑run JSON) is emitted.

### Status Line Format

During compilation you will see lines like:

```text
[SUCCESS]   3.2ms my-theme loaded [INFO] 1423 bytes
[SUCCESS]   1.1ms my-theme compiled
[SUCCESS]   0.4ms my-theme <written> [INFO] 16892 bytes
```

Bracket colours reflect phase category (success/info/warn/error). Times are wall‑clock milliseconds rounded to one decimal.

### Watch Mode

`--watch` sets up file watchers for the entry file and any files imported during compilation. On change:

1. The bundle for the changed entry file (if it was the root) is reloaded.
2. Any existing watcher is paused while recompiling (prevents cascaded triggers).
3. Only changed output is written (hash comparison) — unchanged themes are skipped silently except for a "&lt;skipped&gt;" state line.

## Bundle Object Structure

Internally each entry file becomes a mutable "bundle":

```ts
interface Bundle {
  file: FileObject                  // entry file
  source: any                       // parsed YAML / JSON5 (must contain config)
  result?: {
    output: Record<string, any>     // final theme JSON object
    importedFiles: FileObject[]     // all secondary sources
    json: string                    // cached JSON string of output
  }
  watcher?: FSWatcher               // active chokidar watcher in --watch
  hash?: string                     // sha256 of result.json
  perf?: {
    load?: number[]
    compile?: number[]
    write?: number[]
  }
}
```

You won't usually touch this directly unless extending the compiler.

## Multi-Document & Imports

You can split logical sections with YAML document separators `---` to express variants or staged overrides in a single file. Each later document can add or override earlier `vars` / `theme` fragments.

Imports live under `config.imports` (e.g. `config.imports.vars.<alias>: ./file.yaml`). Imported variable trees merge into your namespace; you can then reference them like `$(alias.palette.primary)`.

## Skipped Writes & Dry Runs

Outputs are hashed (sha256). If the hash matches the existing on-disk file, no write occurs and the state shows `<skipped>`. Use `--dry-run` to inspect the generated JSON without touching the filesystem.

## Performance Timing

Each phase timing (load / compile / write) is recorded (ms, one decimal) and displayed inline. Internally they are stored numerically in `bundle.perf.*` arrays for potential future aggregation or profiling output.

## Extending

Potential extension points (PRs / forks):

- Additional colour manipulation functions
- Custom phase injectors (e.g. contrast auto-tuning)
- Output format plugins (JetBrains, Sublime, etc.)
- Structured profiling / JSON stats emitter when `--profile` is set

If you build something neat, consider opening a PR or sharing a gist.

## Theme Syntax

### Basic Theme Structure

```yaml
# my-theme.yaml
config:
  name: "My Awesome Theme"
  type: dark

vars:
  # Define your base palette
  main: "#e6e6e6"         # Primary foreground
  accent: "#4b8ebd"       # Brand colour

  # Build semantic relationships
  std:
    fg: $(main)
    fg.accent: lighten($(accent), 50)
    bg: invert($(main))
    bg.accent: darken($(accent), 15)

theme:
  colors:
    # Use semantic names, not hex codes
    "editor.foreground": $(std.fg)
    "editor.background": $(std.bg)
    "statusBar.background": $(std.bg.accent)
```

### Colour Functions

| Function | Example | Result | Description |
|----------|---------|--------|-------------|
| `lighten(colour, amount)` | `lighten($(accent), 25)` | Lighter version of accent | Increase lightness by 25% |
| `darken(colour, amount)` | `darken($(primary), 30)` | Darker version of primary | Decrease lightness by 30% |
| `fade(colour, amount)` | `fade("#4b8ebd", 50)` | 50% more transparent | Reduce opacity by 50% |
| `solidify(colour, amount)` | `solidify($(bg.translucent), 20)` | 20% more opaque | Increase opacity by 20% |
| `alpha(colour, value)` | `alpha($(brand), 0.5)` | 50% transparent brand | Set opacity to exact value (0-1) |
| `invert(colour)` | `invert($(foreground))` | Opposite of foreground | Invert RGB channels |
| `mix(colour1, colour2, ratio)` | `mix($(accent), $(error), 30)` | Purple blend | Mix 30% error colour with accent |

### Colour Spaces

| Format | Example | Usage | Description |
|--------|---------|-------|-------------|
| `rgb(r, g, b)` | `rgb(75, 142, 189)` | Direct RGB values | Red, Green, Blue (0-255) |
| `rgba(r, g, b, a)` | `rgba(75, 142, 189, 0.8)` | RGB with transparency | Alpha channel (0-1) |
| `hsl(h, s, l)` | `hsl(210, 50%, 52%)` | Hue, Saturation, Lightness | More intuitive colour picking |
| `hsla(h, s, l, a)` | `hsla(210, 50%, 52%, 0.8)` | HSL with transparency | Alpha channel (0-1) |
| `hsv(h, s, v)` | `hsv(210, 60, 74)` | Hue, Saturation, Value | Alternative colour model |
| `hsva(h, s, v, a)` | `hsva(210, 60, 74, 0.8)` | HSV with transparency | Alpha channel (0-1) |

### Modular Design

```yaml
# base-colours.yaml
vars:
  palette:
    primary: "#4b8ebd"
    success: "#4ab792"
    error: "#b74a4a"

---

# my-theme.yaml
config:
  name: "My Theme"
  type: dark
  imports:
    vars:
      colors: "./base-colours.yaml"

vars:
  # Access imported variables
  accent: $(colours.palette.primary)

  # Override or extend as needed
  std:
    fg: "#e6e6e6"
    bg: "#1a1a1a"
    accent: $(accent)

theme:
  colors:
    "editor.foreground": $(std.fg)
    "editor.background": $(std.bg)
```

## Advanced Features

### Variable / Token Reference Syntax

You can reference previously defined variables (and nested properties) using
any of three interchangeable syntaxes:

| Form | Example | Notes |
|------|---------|-------|
| `$path.to.var` | `$std.bg.panel.inner` | Short / legacy form. Stops at first non word / `.` character. |
| `$(path.to.var)` | `$(std.bg.panel.inner)` | Recommended. Explicit terminator allows adjacent punctuation: `fade($(std.bg.accent), 30)` |
| `${path.to.var}` | `${std.bg.panel.inner}` | Braced form; behaves the same as `$(...)`. |

All three resolve identically. You can even mix them freely (the evaluator
doesn't mind); the parenthesised form is simply the most robust inside longer
strings or when followed immediately by characters that could extend a bare
token.

Examples:

```yaml
vars:
  std:
    bg: "#191919"
    bg.panel.inner: lighten($(std.bg), 6)
    fg: invert($std.bg)
    accent: mix(${std.fg}, "#ff6b9d", 25)

theme:
  colors:
    "editor.background": $(std.bg)
    "editor.foreground": $std.fg
    "statusBar.background": ${std.bg.panel.inner}
```

Resolution order reminder:

1. All `vars` entries are fully resolved first (only against the variable set).
2. Theme entries are then resolved against the union of resolved vars + theme.

This guarantees variables never see partially-resolved theme state and lets
theme keys layer atop a stable semantic base.

### Semantic Colour Hierarchies

Build visual depth with mathematical relationships:

```yaml
vars:
  std:
    bg: "#191919"
    bg.panel:
      outer: $(std.bg)                           # Darkest (status bars)
      inner: lighten($(std.bg.panel.outer), 10)  # Medium (sidebars)
      innermost: lighten($(std.bg.panel.inner), 10)  # Lightest (editor)
```

### Status-Driven Colour Systems

Semantic meaning that cascades automatically:

```yaml
vars:
  status:
    error: "#b74a4a"
    warning: "#b36b47"
    success: "#4ab792"

  # All error states inherit the same base colour
  std:
    fg.error: lighten($(status.error), 70)
    bg.error: $(status.error)
    outline.error: fade($(status.error), 40)
```

### Theme Variants

Generate multiple themes from one design system:

```yaml
# Shared base system
vars:
  relationships: # ... your design system

# Theme 1: Blue accent
vars:
  accent: "#4b8ebd"

---
# Theme 2: Pink accent
vars:
  accent: "#ff6b9d"

---
# Theme 3: Green accent
vars:
  accent: "#4ab792"
```

## API Reference

### Compiler

```bash
npm install @gesslar/aunty
```

```javascript
import Compiler from '@gesslar/aunty'

const file = await loadDataFile('my-theme.yaml')
await Compiler.compile(file)
// Result available in my-theme.color-theme.json
```

## Architecture

Aunty Rose processes themes in phases:

1. **Import Resolution** - Merge modular theme files
2. **Variable Decomposition** - Flatten nested structures
3. **Token Evaluation** - Resolve `$(variable)` references
4. **Function Application** - Execute colour manipulation functions
5. **Recursive Resolution** - Handle variables that reference other variables
6. **Theme Assembly** - Build final VS Code theme JSON

Error handling is per-entry theme: a failure in one file doesn't halt others (thanks to `Promise.allSettled`).

## Philosophy

Aunty Rose embraces **parametric design** principles:

- **Semantic over literal** - `$(std.accent)` tells you *what* it is
- **Relationships over isolation** - Colours that belong together, stay together
- **Composition over inheritance** - Mix and match modular systems
- **Intention over implementation** - Express design intent, not hex codes

## Development

```bash
git clone https://github.com/gesslar/aunty
cd aunty
npm install
npm test
```

Local CLI development:

```bash
node ./src/build.js examples/simple/midnight-ocean.yaml -o ./examples/output --watch
```

Publish (maintainer): ensure README & package version sync, then `npm run submit` (as configured in your scripts) or standard `npm publish` if appropriate.

## License

**The Unlicense** - Because the idea of copyrighting colour arrangements is absurd.

If you think otherwise, gg `¯\_(ツ)_/¯`.

### Kary Pro Colors

To demonstrate the flexibility of incorporating multiple sources, included
in this repo are two syntax highlighting files from [Kary Pro Colors](https://marketplace.visualstudio.com/items?itemName=karyfoundation.theme-karyfoundation-themes)
by Pouya Kary. These files *are not* released under the Unlicense, but rather
bear the own licensing terms. Using those files, you are bound by Pouya's very
generous licensing.

These files differ from the original source in that they have been modified to
correspond to the DSL of this theming engine.

A copy of the GPL3 license is included in the `examples/advance/import`
directory and applies specifically to:

- `examples/advanced/import/karyprocolors-dark.tmLanguage.yaml`
- `examples/advanced/import/karyprocolors-light.tmLanguage.yaml`

## *Fin*

I don't write tests. If that bothers you, you can fork the repo and write your
own.
