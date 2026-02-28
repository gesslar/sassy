---
title: "Features"
sidebar_position: 99
---

# Sassy — Feature Inventory

## Authoring Formats

- **YAML Input** — Write themes in clean, human-readable YAML
- **JSON5 Input** — Write themes in JSON5 with comments and trailing commas
- **Mixed Format Ecosystem** — Import YAML from JSON5 or vice versa — they compose freely

## Variable System

- **Palette Layer** — Define raw colour values in an isolated, self-contained palette scope
- **Vars Layer** — Build semantic meaning on top of palette with a dedicated variable layer
- **Nested Variables** — Define deeply nested variable hierarchies with dot-path addressing
- **Three Reference Syntaxes** — `$(var)`, `$var`, `${var}` — pick the style that fits the context
- **Palette Aliases** — `$$name` shorthand auto-expands to `$(palette.name)` for concise palette references
- **Cross-Layer References** — Variables can reference other variables, palette entries, and theme values
- **Recursive Resolution** — Multi-pass evaluation engine resolves chained variable references automatically
- **Circular Dependency Detection** — Catches self-referential or looping variable chains before they hang

## Colour Functions

- **lighten / darken** — Perceptually uniform brightness adjustments via OKLCH
- **mix** — Blend two colours at any ratio with OKLCH interpolation
- **alpha** — Set exact transparency on any colour
- **fade / solidify** — Relative opacity adjustments — reduce or increase alpha proportionally
- **invert** — Flip lightness while preserving hue and saturation
- **saturate / desaturate** — Adjust chroma intensity in OKLCH space
- **mute / pop** — Semantic aliases for desaturation and saturation
- **tint / shade** — Mix toward white or black by a given percentage
- **shiftHue** — Rotate hue by arbitrary degrees
- **complement** — 180° hue shift in one call
- **grayscale** — Strip all chroma for a perceptually accurate greyscale
- **contrast** — Returns black or white, whichever has better contrast against the input
- **css()** — Use any CSS named colour (`css(tomato)`, `css(deepskyblue)`, etc.)
- **Composable Functions** — Nest function calls inside each other: `fade(lighten($(bg), 20), 0.5)`

## Colour Space Support

- **Hex** — `#rgb`, `#rrggbb`, `#rrggbbaa` — with short-form auto-expansion
- **RGB / RGBA** — `rgb(r, g, b)` and `rgba(r, g, b, a)` constructors
- **HSL / HSLA** — `hsl(h, s, l)` and `hsla(h, s, l, a)` constructors
- **HSV / HSVA** — `hsv(h, s, v)` and `hsva(h, s, v, a)` constructors
- **OKLCH / OKLCHA** — Perceptually uniform colour space for professional palette design
- **Any Culori Format** — LAB, LCH, HWB, Display P3, Rec. 2020 — if Culori parses it, Sassy compiles it
- **Cross-Space Mixing** — Freely combine colours from different spaces in the same theme
- **Alpha Preservation** — Hex alpha channels are tracked and preserved through transformations

## Import & Composition

- **File Imports** — Pull in external YAML/JSON5 files via `config.import`
- **Deep Object Merging** — Palette, vars, colors, semanticTokenColors merge by deep key override
- **Append-Only tokenColors** — Imported tokenColors prepend, your file's rules append — correct precedence by default
- **Multi-File Import Chains** — Import as many files as needed, merged in declaration order
- **Modular Theme Architecture** — Split palettes, variables, UI colours, syntax rules, and semantics into separate files
- **Shared Palettes** — One palette file, many theme variants
- **Dynamic Import Paths** — Use variables in import paths: `./import/palette-$(type).yaml`

## Séance Operator

- **Prior Value References** — `^` references the same key's value from a previously imported file
- **Derived Variants** — Create "hushed", "vivid", or any theme variant by transforming inherited values: `shade(^, 25)`
- **Multi-Layer Séance** — Chain through multiple import layers with automatic versioned tracking

## Theme Sections

- **colors** — Full support for VS Code workbench colour properties
- **tokenColors** — TextMate-style syntax highlighting rules with scope selectors
- **semanticTokenColors** — Semantic token colour definitions for language-aware highlighting
- **config.custom** — Pass-through block for arbitrary VS Code properties like `semanticHighlighting: true`
- **config.$schema** — Embed the VS Code colour theme schema reference in output

## CLI — Build Command

- **Single or Multi-File Builds** — Compile one or many theme files in a single invocation
- **Watch Mode** — Live recompilation on file save with automatic dependency tracking
- **Dependency-Aware Watching** — Edits to any imported file trigger a rebuild of the parent theme
- **Custom Output Directory** — Route compiled output wherever you want with `--output-dir`
- **Dry Run** — Print compiled JSON to stdout without writing any files
- **Silent Mode** — Suppress all output except errors — ideal for scripts and CI
- **Nerd Mode** — Verbose error traces with full stack context for debugging
- **Interactive Watch Controls** — `F5` to force rebuild, `Ctrl-C` to quit — with a live prompt
- **Hash-Based Skip** — SHA-256 output comparison prevents unnecessary file writes
- **Graceful Signal Handling** — Clean shutdown on SIGINT, SIGTERM, SIGHUP

## CLI — Resolve Command

- **Color Resolution** — Trace any `colors.*` property through its full variable chain
- **tokenColor Resolution** — Resolve any TextMate scope to its final foreground value
- **semanticTokenColor Resolution** — Resolve any semantic token scope to its final value
- **Full Resolution Trail** — See every substitution step from raw expression to final hex
- **Scope Disambiguation** — When a scope appears in multiple rules, lists all matches with selectable qualifiers
- **Precedence-Aware Resolution** — Shows when a broader scope masks your specific one
- **Colour Swatches** — Truecolour terminal swatches next to resolved hex values
- **Alpha Compositing Preview** — `--bg` flag composites transparent colours against a background for preview

## CLI — Proof Command

- **Composed Document View** — See the fully merged theme document after all imports, overrides, and séance are applied — before any evaluation
- **Séance Inlining** — `^` operators replaced with the actual prior values so the output reads naturally: `shade(#4b8ebd, 25)`
- **YAML Output** — Outputs in the authoring language, not the compiled format — stays in your world
- **Import-Free Output** — Imports are resolved and merged; the `import` key is gone — what you see is what the engine sees
- **Aerial Debugging** — Orient yourself in a layered theme before reaching for `resolve` — the map before the dig

## CLI — Lint Command

- **Duplicate Scope Detection** — Finds TextMate scopes that appear in multiple tokenColors rules
- **Undefined Variable Detection** — Catches references to variables that don't exist
- **Unused Variable Detection** — Identifies vars defined but never referenced in theme content
- **Scope Precedence Analysis** — Warns when a broad scope masks a more specific one due to rule ordering
- **Cross-Section Linting** — Validates variables in colors, tokenColors, and semanticTokenColors
- **Strict Mode** — `--strict` treats warnings as errors for CI enforcement
- **Severity Levels** — Issues categorised as high/medium/low with colour-coded terminal output
- **Import-Aware Analysis** — Lints across all imported files, not just the main theme

## Output

- **VS Code `.color-theme.json`** — Standard output format, ready for use in VS Code extensions
- **Deterministic Output** — Same input always produces the same output
- **Pretty-Printed JSON** — 2-space indented, human-readable output
- **Automatic File Naming** — `my-theme.yaml` → `my-theme.color-theme.json`

## Architecture & Performance

- **Compose-Then-Evaluate Pipeline** — Shared composition step (import → merge → séance) feeds both `compile` and `proof` — one source of truth, two consumers
- **Phase-Based Compilation** — Compose → decompose → evaluate → resolve → assemble — clean, predictable pipeline
- **File Caching** — Imported files are cached and reused across themes in the same session
- **Colour Caching** — Parsed colours and mix results are memoised for repeat calls
- **OKLCH-Native Operations** — Lighten, darken, mix, and saturate all work in perceptually uniform space
- **Structured Error Reporting** — Chained error contexts with `.trace()` for precise failure diagnostics
- **Max-Iteration Guards** — Bounded resolution passes prevent runaway compilation

## Programmatic API

- **ES Module Exports** — `import { Theme, Compiler, Colour, LintCommand } from '@gesslar/sassy'`
- **Full Class Access** — Theme, Compiler, Evaluator, Session, Colour, and all command classes are importable
- **Embeddable Compilation** — Build themes programmatically without the CLI
- **Proof API** — Retrieve the composed, unevaluated theme structure for external tooling
- **Lint API** — Run lint checks and get structured results for external tooling
- **Resolve API** — Programmatically resolve tokens and get structured resolution data

## Developer Experience

- **Zero-Install Usage** — `npx @gesslar/sassy build` — no global install required
- **TypeScript Definitions** — Auto-generated `.d.ts` files from JSDoc for editor support
- **Docusaurus Documentation Site** — Full docs at sassy.gesslar.io
- **Example Themes** — Simple and advanced examples included in the repository
- **Unlicense** — Use however you want — no restrictions
