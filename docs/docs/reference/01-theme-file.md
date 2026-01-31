---
sidebar_position: 1
title: "Theme File Anatomy"
---

import CodeBlock from "@site/src/components/CodeBlock"

A Sassy theme file is a YAML or JSON5 document with up to four top-level keys. When compiled, it produces a `<name>.color-theme.json` file suitable for VS Code.

## Top-Level Structure

<CodeBlock lang="yaml">{`
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
`}</CodeBlock>

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

<CodeBlock lang="yaml">{`

  config:
    name: "Midnight Ocean"
    type: dark
    $schema: "vscode://schemas/color-theme"
    import:
      - ./shared/variables.yaml
      - ./shared/colors.yaml

`}</CodeBlock>

## `palette`

A declarative, self-contained scope for raw colour definitions. Palette is evaluated before `vars` and cannot reference anything outside itself — only its own entries. Other scopes (`vars`, `theme`) can reference palette values using the `$$` alias syntax.

<CodeBlock lang="yaml">{`

  palette:
    cyan: "#56b6c2"
    grey: "#5c6370"
    accent: lighten($$cyan, 20)

`}</CodeBlock>

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

<CodeBlock lang="yaml">{`

  vars:
    accent: $$cyan          # resolves palette.cyan
    bg.accent: darken($$accent, 70)   # palette value in a function

`}</CodeBlock>

### Palette Isolation

Palette entries can reference other palette entries (using `$$` syntax), but they **cannot** reference `vars` or `theme` values. This is enforced by evaluation order — the palette is fully resolved before any other scope is processed.

## `vars`

An arbitrary nested object. Keys become dot-path variable names; values are strings (hex colours, colour expressions, or variable references) or nested objects that extend the dot-path. Variables can reference palette values using the `$$` alias.

<CodeBlock lang="yaml">{`

  vars:
    accent: $$cyan
    std:
      bg: "#1a1a2e"
      fg: "#abb2bf"
      fg.accent: $(accent)

`}</CodeBlock>

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

<CodeBlock lang="yaml">{`

  theme:
    colors:
      editor.background: $(std.bg)
      editor.foreground: $(std.fg)
      activityBar.background: darken($(std.bg), 10)

`}</CodeBlock>

### `tokenColors`

An array of TextMate token colour rules. Each entry has `name`, `scope`, and `settings`.

<CodeBlock lang="yaml">{`

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

`}</CodeBlock>

### `semanticTokenColors`

An object mapping semantic token types to colour expressions.

<CodeBlock lang="yaml">{`

  theme:
    semanticTokenColors:
      variable.declaration:
        foreground: $(std.fg)
      function.declaration:
        foreground: $$cyan

`}</CodeBlock>

## Supported File Formats

Both `.yaml` and `.json5` are supported with identical behaviour. Choose whichever you prefer.

| Format | Extension | Notes |
|--------|-----------|-------|
| YAML | `.yaml` | Supports comments, multiline strings, anchors |
| JSON5 | `.json5` | Supports comments, trailing commas, unquoted keys |

## Output

Given an input file named `midnight-ocean.yaml`, Sassy produces:

<CodeBlock lang="log">{`

midnight-ocean.color-theme.json

`}</CodeBlock>

The output is a standard VS Code colour theme JSON file containing `$schema`, `name`, `type`, `colors`, `tokenColors`, and `semanticTokenColors` at the root level, plus any keys from `config.custom`.
