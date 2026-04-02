---
sidebar:
  order: 1
title: "Theme File Anatomy"
---

A Sassy theme file is a YAML  document with up to four top-level keys. When
compiled, it produces a `<name>.color-theme.json` file suitable for VS Code.

## Top-Level Structure

```yaml
config:
  name: "My Theme"
  type: dark

palette:
  # colour definitions

vars:
  # variable definitions

theme:
  colors: {}
  tokenColors: []
  semanticTokenColors: {}
```

| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `config` | object | Yes | Theme metadata and import declarations |
| `palette` | object | No | Colour definitions — a declarative, self-contained scope evaluated before `vars` |
| `vars` | object | No | Variable definitions for reuse throughout the theme |
| `theme` | object | Yes | VS Code theme content: colours, token colours, semantic token colours |

## `config`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | Yes | Theme display name in VS Code |
| `type` | `"dark"` \| `"light"` | Yes | Base theme type |
| `$schema` | string | No | Set to `"vscode://schemas/color-theme"` for editor validation |
| `import` | string[] | No | Array of file paths to import (relative to this file) |
| `custom` | object | No | Arbitrary keys merged into the root of the output JSON |

```yaml
config:
  name: "Midnight Ocean"
  type: dark
  $schema: "vscode://schemas/color-theme"
  import:
    - ./shared/variables.yaml
    - ./shared/colors.yaml
  custom:
    semanticHighlighting: true
```

:::tip
If your theme uses `semanticTokenColors`, set `semanticHighlighting: true` via `config.custom`. Without it, VS Code ignores semantic token rules in custom themes. See [Theme School: Semantic Token Colors](/theme-school/04-semantic-token-colors/) for details.
:::

## `palette`

A declarative, self-contained scope for raw colour definitions. Palette is evaluated before `vars` and cannot reference anything outside itself — only its own entries. Other scopes (`vars`, `theme`) can reference palette values using the `$$` alias syntax.

```yaml
palette:
  cyan: "#56b6c2"
  grey: "#5c6370"
  accent: lighten($$cyan, 20)
```

The above produces the following palette paths (internally prefixed as `palette.*`):

- `palette.cyan`
- `palette.grey`
- `palette.accent`

### Referencing Palette Values

The `$` prefix inside variable references is shorthand for `palette.`:

| Written | Expands to |
|---------|------------|
| `$$cyan` | `$palette.cyan` |
| `$($cyan)` | `$(palette.cyan)` |
| `${$cyan}` | `${palette.cyan}` |

This expansion happens before variable resolution, so downstream tools (resolve, lint) always see the canonical `palette.*` form.

```yaml
vars:
  accent: $$cyan          # resolves palette.cyan
  bg.accent: darken($$accent, 70)   # palette value in a function
```

### Palette Isolation

Palette entries can reference other palette entries (using `$$` syntax), but they **cannot** reference `vars` or `theme` values. This is enforced by evaluation order — the palette is fully resolved before any other scope is processed.

## `vars`

An arbitrary nested object. Keys become dot-path variable names; values are strings (hex colours, colour expressions, or variable references) or nested objects that extend the dot-path. Variables can reference palette values using the `$$` alias.

```yaml
vars:
  accent: $$cyan
  std:
    bg: "#1a1a2e"
    fg: "#abb2bf"
    fg.accent: $(accent)
```

The above produces the following variable paths:

- `accent`
- `std.bg`
- `std.fg`
- `std.fg.accent`

See [Variable Syntax](./02-variable-syntax.md) for reference forms and resolution order.

## `theme`

Contains the three sections VS Code expects in a colour theme.

### `colors`

An object whose keys are VS Code colour identifiers (dot-notation) and whose values are colour expressions.

```yaml
theme:
  colors:
    editor.background: $(std.bg)
    editor.foreground: $(std.fg)
    activityBar.background: darken($(std.bg), 10)
```

### `tokenColors`

An array of TextMate token colour rules. Each entry has `name`, `scope`, and `settings`.

```yaml
theme:
  tokenColors:
    - name: Comments
      scope: comment, punctuation.definition.comment
      settings:
        foreground: $$grey
        fontStyle: italic
    - name: Keywords
      scope: keyword
      settings:
        foreground: $$cyan
```

### `semanticTokenColors`

An object mapping semantic token types to colour values. Each key is a semantic token selector (e.g. `variable.declaration`, `function.declaration`, `string:escape`). Values can be either:

- **A string** — interpreted as the `foreground` colour
- **An object** — with `foreground` and/or `fontStyle` properties

```yaml
theme:
  semanticTokenColors:
    # Object form — foreground and fontStyle
    variable.declaration:
      foreground: $(std.fg)
      fontStyle: italic
    function.declaration:
      foreground: $$cyan
      fontStyle: bold

    # String form — shorthand for foreground only
    "string:escape": $$yellow
```

Both forms support variable references, palette aliases, and colour functions.

## Supported File Formats

Files in `.yaml` format are supported.

| Format | Extension | Notes |
|--------|-----------|-------|
| YAML | `.yaml` | Supports comments, multiline strings, anchors |

## Output

Given an input file named `midnight-ocean.yaml`, Sassy produces:

```log
midnight-ocean.color-theme.json
```

The output is a standard VS Code colour theme JSON file containing `$schema`, `name`, `type`, `colors`, `tokenColors`, and `semanticTokenColors` at the root level, plus any keys from `config.custom`.
