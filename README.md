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

## Philosophy

Aunty Rose embraces **parametric design** principles:

- **Semantic over literal** - `$(std.accent)` tells you *what* it is
- **Relationships over isolation** - Colours that belong together, stay together
- **Composition over inheritance** - Mix and match modular systems
- **Intention over implementation** - Express design intent, not hex codes

## Development

```bash
git clone https://github.com/your-username/aunty
cd aunty
npm install
npm test
```

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
