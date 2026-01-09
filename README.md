# Sassy - SCSS-Style Theme Engine for VS Code

**Transform VS Code theme development from tedious to delightful.**

Stop wrestling with 800+ disconnected hex codes. Create beautiful,
maintainable themes with semantic variables, colour functions, and design
systems that actually make sense.

## The Problem

VS Code theme development is a nightmare:

- 800+ flat colour properties with zero relationships
- Want to adjust contrast? Hunt through dozens of files for related colours
- Copy-paste hex codes everywhere and pray nothing breaks
- No way to express design intent or maintain consistency

## The Solution

Write themes like a human, compile for VS Code:

**Before (traditional):**

```json
{
  "editor.background": "#1e1e1e",
  "editor.foreground": "#e6e6e6",
  "statusBar.background": "#002e63",
  "panel.background": "#1a1a1a"
}
```

**After (Sassy):**

```yaml
vars:
  accent: "#4b8ebd"
  std:
    fg: "#e6e6e6"
    bg: "#1a1a1a"
    bg.panel: lighten($(std.bg), 15)
    bg.accent: darken($(accent), 15)

theme:
  colors:
    "editor.background": $(std.bg.panel)
    "editor.foreground": $(std.fg)
    "statusBar.background": $(std.bg.accent)
    "panel.background": $(std.bg)
```

Now when you want to adjust contrast, change one variable and watch it
cascade through your entire theme.

## Quick Start

No installation needed - use with npx:

```bash
# Create your first theme
npx @gesslar/sassy build my-theme.yaml

# Watch mode for development
npx @gesslar/sassy build my-theme.yaml --watch

# Custom output location
npx @gesslar/sassy build -o ./themes my-theme.yaml
```

## CLI Usage

```bash
# Basic compilation
npx @gesslar/sassy build <theme-file>

# Multiple files at once
npx @gesslar/sassy build theme1.yaml theme2.yaml theme3.yaml

# Watch for changes (rebuilds automatically)
npx @gesslar/sassy build --watch my-theme.yaml

# Custom output directory
npx @gesslar/sassy build --output-dir ./my-themes my-theme.yaml

# See the compiled JSON without writing files
npx @gesslar/sassy build --dry-run my-theme.yaml

# Silent mode (only show errors)
npx @gesslar/sassy build --silent my-theme.yaml

# Debug mode (detailed error traces)
npx @gesslar/sassy build --nerd my-theme.yaml

# Lint themes for potential issues
npx @gesslar/sassy lint my-theme.yaml
```

### Build Command Options

| Option | Description |
| -------- | ------------- |
| `-w, --watch` | Watch files and rebuild on changes |
| `-o, --output-dir <dir>` | Specify output directory |
| `-n, --dry-run` | Print JSON to stdout instead of writing files |
| `-s, --silent` | Only show errors (useful for scripts) |
| `--nerd` | Verbose error mode with stack traces |

### Debugging Your Themes

**See what a colour variable resolves to:**

```bash
npx @gesslar/sassy resolve --color editor.background my-theme.yaml
```

**Debug tokenColors syntax highlighting:**

```bash
npx @gesslar/sassy resolve --tokenColor keyword.control my-theme.yaml
```

**Debug semantic token colours:**

```bash
npx @gesslar/sassy resolve --semanticTokenColor variable.readonly my-theme.yaml
```

This shows you the complete resolution chain for any theme property, displaying
each step of variable substitution and function evaluation with colour-coded
output.

### Resolve Command Options

| Option | Description |
| -------- | ------------- |
| `-c, --color <key>` | Resolve a specific color property to its final value |
| `-t, --tokenColor <scope>` | Resolve tokenColors for a specific scope |
| `-s, --semanticTokenColor <token>` | Resolve semantic token colors for a specific token type |
| `--nerd` | Show detailed error traces if resolution fails |

### Theme Validation and Linting

**Validate your theme for common issues:**

```bash
npx @gesslar/sassy lint my-theme.yaml
```

The lint command performs comprehensive validation of your theme files to catch
common issues that could cause unexpected behaviour or poor maintainability.

### Lint Command Checks

The linter performs four types of validation:

#### 1. Duplicate Scopes

Detects when the same syntax scope appears in multiple tokenColors rules:

```yaml
# ❌ This will trigger a warning
theme:
  tokenColors:
    - name: "Keywords"
      scope: "keyword.control, keyword.operator"
      settings: { foreground: "$(accent)" }
    - name: "Control Keywords"
      scope: "keyword.control"  # Duplicate!
      settings: { foreground: "$(primary)" }
```

**Why this matters:** The second rule will never be applied since the first rule
already matches `keyword.control` tokens.

#### 2. Undefined Variables

Catches references to variables that don't exist:

```yaml
# ❌ This will trigger an error
theme:
  tokenColors:
    - name: "Comments"
      scope: "comment"
      settings: { foreground: "$(nonexistent.variable)" }  # Error!
```

#### 3. Unused Variables

Identifies variables defined but never used in tokenColors:

```yaml
# ⚠️ This will trigger a warning if never used
vars:
  scope:
    unused_color: "#ff0000"  # Warning if not referenced anywhere
```

**Note:** Only checks variables under `scope.*` since other variables might be
used in the colors section.

#### 4. Precedence Issues

Detects when broad scopes mask more specific ones due to rule ordering:

```yaml
# ❌ This will trigger a warning
theme:
  tokenColors:
    - name: "All Keywords"
      scope: "keyword"           # Broad scope
      settings: { foreground: "$(primary)" }
    - name: "Control Keywords"
      scope: "keyword.control"   # More specific, but will never match!
      settings: { foreground: "$(accent)" }
```

**Why this matters:** The second rule will never be applied because the first
rule already matches all `keyword.*` tokens. Reorder rules from most specific
to least specific.

### Lint Command Options

| Option | Description |
| -------- | ------------- |
| `--nerd` | Show detailed error traces if linting fails |

## Basic Theme Structure

```yaml
# my-awesome-theme.yaml
config:
  name: "My Awesome Theme"
  type: dark

vars:
  # Your colour palette
  primary: "#4b8ebd"
  success: "#4ab792"
  error: "#b74a4a"

  # Build semantic relationships
  std:
    fg: "#e6e6e6"
    bg: "#1a1a1a"
    accent: $(primary)
    bg.accent: darken($(accent), 15)

theme:
  colors:
    # Editor
    "editor.foreground": $(std.fg)
    "editor.background": $(std.bg)
    "editor.selectionBackground": $(std.bg.accent)

    # UI
    "statusBar.background": $(std.bg.accent)
    "activityBar.background": $(std.bg)
    "sideBar.background": $(std.bg)
```

## Unlimited Colour Freedom

Sassy is built on [Culori](https://culorijs.org/), a comprehensive colour
manipulation library. This means **if Culori supports it, Sassy supports
it automatically** - no configuration needed.

### Beyond the Built-ins

While Sassy provides common functions like `lighten()`, `darken()`, and
`mix()`, you have access to the entire spectrum of colour formats:

```yaml
vars:
  # Use any colour space Culori understands
  lab_colour: lab(50 20 -30)           # LAB colour space
  hwb_colour: hwb(180 30% 20%)         # HWB (Hue-Whiteness-Blackness)
  lch_colour: lch(70 40 180)           # LCH colour space
  p3_colour: color(display-p3 0.4 0.8 0.2)  # Display P3 gamut
  rec2020: color(rec2020 0.42 0.85 0.31)    # Rec. 2020 colour space

  # Mix and match freely
  primary: oklch(0.6, 20, 220)
  secondary: mix($(primary), lab(80 -20 40), 30)
  accent: lighten(hwb(240 20% 10%), 15)
```

**The rule is simple:** Write any colour expression that Culori can parse, and
Sassy will handle it. No need to memorize function lists or check
compatibility - if it's a valid colour, it works.

> **Learn More:** Explore the full range of supported colour formats and
functions in the [Culori documentation](https://culorijs.org/).

## Colour Functions

Make colours that work together:

| Function | Example | Result |
| ---------- | --------- | -------- |
| `lighten(colour, %=0-100)` | `lighten($(bg), 25)` | 25% lighter background |
| `darken(colour, %=0-100)` | `darken($(accent), 30)` | 30% darker accent |
| `alpha(colour, alpha=0-1)` | `alpha($(brand), 0.5)` | Set exact transparency |
| `fade(colour, alpha=0-1)` | `fade($(accent), 0.5)` | Reduce opacity by 50% |
| `solidify(colour, alpha=0-1)` | `solidify($(bg.accent), 0.3)` | Increase opacity by 30% |
| `mix(colour1, colour2, %=0-100)` | `mix($(fg), $(accent), 20)` | Blend 20% accent |
| `mix(colour1, colour2)` | `mix($(fg), $(accent))` | Blend 50% accent |
| `invert(colour)` | `invert($(fg))` | Perfect opposite |
| `hsv(h=0-255, s=0-255, v=0-255)` | `hsv(50, 200, 180)` | HSV colour (hue 50, saturation 200, value 180) |
| `hsva(h=0-255, s=0-255, v=0-255, a=0-1)` | `hsva(50, 200, 180, 0.5)` | HSV with 50% opacity |
| `hsl(h=0-360, s=0-100, l=0-100)` | `hsl(200, 50, 40)` | HSL colour (200° hue, 50% saturation, 40% lightness) |
| `hsla(h=0-360, s=0-100, l=0-100, a=0-1)` | `hsla(200, 50, 40, 0.5)` | HSL with 50% opacity |
| `rgb(r=0-255, g=0-255, b=0-255)` | `rgb(139, 152, 255)` | RGB colour (139 red, 152 green, 255 blue) |
| `rgba(r=0-255, g=0-255, b=0-255, a=0-1)` | `rgba(139, 152, 255, 0.5)` | RGB with 50% opacity |
| `oklch(l=0-1, c=0-100, h=0-360)` | `oklch(0.7, 25, 180)` | OKLCH colour (70% lightness, 25 chroma, 180° hue) |
| `oklcha(l=0-1, c=0-100, h=0-360, a=0-1)` | `oklcha(0.5, 30, 45, 0.8)` | OKLCH with 80% opacity |
| `css(name)` | `css(tomato)` | CSS named colour (tomato, skyblue, etc.) |

> **Note:** In all of these functions, `colour` can be a raw hex (`#ff66cc`),
a variable (`$(accent)`), a CSS named colour (`css(tomato)`), or another colour
function (`rgba(255, 100, 200, 0.5)`, `darken($(bg), 20)`,
`oklcha(0.7, 25, 180, 0.8)`).

### CSS Named Colours

Use CSS colour names with the `css()` function:

```yaml
vars:
  # CSS named colours
  danger: css(crimson)
  ocean: css(deepskyblue)
  nature: css(forestgreen)

  # Mix named colours with functions
  muted_red: fade(css(tomato), 0.6)
  light_blue: lighten(css(navy), 40)
```

> **Reference:** See the complete list of CSS named colours at [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/CSS/named-color) or [Wikipedia](https://en.wikipedia.org/wiki/Web_colors#HTML_color_names).

## Variable Reference

Use any of these syntaxes (they're identical):

```yaml
vars:
  accent: "#4b8ebd"

  # All equivalent:
  variant1: $(accent)          # Recommended
  variant2: $accent            # Short form
  variant3: ${accent}          # Braced form
```

## Theme Development Workflow

### 1. Create Your Theme File

```bash
# Create a new theme file
touch ocean-theme.yaml
```

### 2. Set Up Watch Mode

```bash
# Start watching for changes
npx @gesslar/sassy build --watch ocean-theme.yaml
```

### 3. Install Your Theme

After compilation, you'll get a `.color-theme.json` file:

1. **Copy to VS Code**: Place in `~/.vscode/extensions/my-themes/themes/`
2. **Or package as extension**: Use `yo code` to create a theme extension
3. **Test immediately**: Press `Ctrl+K Ctrl+T` in VS Code to switch themes

### 4. Iterate and Refine

With watch mode, every save triggers recompilation. VS Code will
automatically reload your theme changes.

### Output Files

Sassy generates standard VS Code theme files:

```bash
my-theme.yaml  →  my-theme.color-theme.json
```

The output file name is based on your input file, with `.color-theme.json`
extension.

## Advanced Features

### Modular Theme Design

Break your themes into reusable components using the import system:

```yaml
# colours.yaml
vars:
  palette:
    primary: "#4b8ebd"
    success: "#4ab792"
    error: "#b74a4a"
    warning: "#b36b47"

---

# my-theme.yaml
config:
  name: "My Theme"
  type: dark
  import:
    - "./colours.yaml"

vars:
  # Use imported colours
  accent: $(palette.primary)

  # Build your design system
  std:
    fg: "#e6e6e6"
    bg: "#1a1a1a"
    accent: $(accent)
    bg.accent: darken($(accent), 15)

theme:
  colors:
    "editor.foreground": $(std.fg)
    "editor.background": $(std.bg)
    "statusBar.background": $(std.bg.accent)
```

### Import System

Sassy supports importing different types of theme components:

```yaml
config:
  import:
    - "./shared/colours.yaml"        # Variables and base config
    - "./shared/ui-colours.yaml"     # VS Code color definitions
    - "./shared/syntax.yaml"         # Syntax highlighting rules
    - "./shared/semantic.yaml"       # Semantic token colours
```

**Import Format:**

Imports are a simple array of file paths. Each file gets merged into your theme:

- **Files:** `["./file1.yaml", "./file2.yaml", "./file3.yaml"]`
- **File types:** Both `.yaml` and `.json5` are supported

**Merge Order:**

The merge behaviour depends on the type of theme content:

**Objects (composable):** `colors`, `semanticTokenColors`, `vars`, `config`

1. Imported files (merged in import order)
2. Your theme file's own definitions (final override)

Later sources override earlier ones using deep object merging.

**Arrays (append-only):** `tokenColors`

1. All imported `tokenColors` (in import order)
2. Your theme file's `tokenColors` (appended last)

**Why different?** VS Code reads `tokenColors` from top to bottom and stops at the first matching rule. This means:

- **Imported rules** = specific styling (e.g., "make function names blue")
- **Your main file rules** = fallbacks (e.g., "if nothing else matched, make it white")

**Examples:**

- If an import defines `keyword.control` and your main file also defines `keyword.control`, VS Code will use the imported version because it appears first in the final array.

- If your import has a broad rule like `storage` and your main file has a specific rule like `storage.type`, the broad `storage` rule will match first and your specific `storage.type` rule will never be used.

> **Tip:** If you're unsure about rule precedence or conflicts, run `npx @gesslar/sassy lint your-theme.yaml` to see exactly what's happening with your `tokenColors`.

### Watch Mode for Development

Perfect for theme development - see changes instantly:

```bash
npx @gesslar/sassy build my-theme.yaml --watch
```

Now edit your YAML file and watch VS Code update automatically!

## Tips for Great Themes

### Start with Meaning, Not Colours

```yaml
# ❌ Don't start with random colours
vars:
  red: "#ff0000"
  blue: "#0000ff"

# ✅ Start with semantic meaning
vars:
  status:
    error: "#b74a4a"
    success: "#4ab792"

  ui:
    background: "#1a1a1a"
    surface: lighten($(ui.background), 15)
```

### Use Mathematical Relationships

```yaml
# Colours that harmonize automatically
vars:
  base: "#4b8ebd"

  harmonies:
    lighter: lighten($(base), 20)
    darker: darken($(base), 20)
    complement: mix($(base), invert($(base)), 50)
    muted: mix($(base), "#808080", 30)

  # OKLCH colours for perceptually uniform adjustments
  oklch_palette:
    primary: oklch(0.6, 20, 220)        # Blue with controlled chroma
    accent: oklch(0.7, 25, 45)          # Warm orange complement
    muted: oklch(0.5, 8, 220)           # Desaturated blue
    bright: oklcha(0.8, 30, 220, 0.9)   # Bright blue with transparency
```

### Test with Real Code

Always test your themes with actual code files to see how syntax
highlighting looks with your colour choices.

## More Examples

Check out the `/examples` folder for complete theme files showing
different approaches and techniques.

## Troubleshooting

### Common Issues

**Theme not appearing in VS Code:**

- Check that the output file ends with `.color-theme.json`
- Verify the file is in your extensions themes folder
- Try reloading VS Code (`Ctrl+Shift+P` → "Developer: Reload Window")

**Compilation errors:**

```bash
# See detailed error information
npx @gesslar/sassy build --nerd my-theme.yaml

# Check what a specific variable resolves to
npx @gesslar/sassy resolve --color problematic.variable my-theme.yaml
```

**Variables not resolving:**

- Check variable names for typos
- Use the resolve command to trace dependency chains
- Look for circular references (variables referencing themselves)

**Watch mode not updating:**

- Ensure you're editing the original `.yaml` file (not the compiled `.color-theme.json`)
- Check that imported files are in the same directory tree as your main theme
- Try restarting watch mode if it seems stuck
- Verify file permissions allow reading your theme files

## Getting Help

- **Examples**: Complete theme files in the `/examples` directory
- **Issues**: Report bugs or request features on GitHub
- **Community**: Share your themes and get feedback

## License

**The Unlicense** - Use this however you want! The idea of copyrighting colour
arrangements is absurd.

---

*Make gorgeous themes that speak as boldly as you do.*
