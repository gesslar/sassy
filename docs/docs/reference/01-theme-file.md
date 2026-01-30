---
sidebar_position: 1
title: "Theme File Anatomy"
---

import CodeBlock from "@site/src/components/CodeBlock"

A Sassy theme file is a YAML or JSON5 document with three top-level keys. When compiled, it produces a `<name>.color-theme.json` file suitable for VS Code.

## Top-Level Structure

<CodeBlock lang="yaml">{`
  config:
    name: "My Theme"
    type: dark

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

## `vars`

An arbitrary nested object. Keys become dot-path variable names; values are strings (hex colours, colour expressions, or variable references) or nested objects that extend the dot-path.

<CodeBlock lang="yaml">{`

  vars:
    palette:
      cyan: "#56b6c2"
      grey: "#5c6370"
    std:
      bg: "#1a1a2e"
      fg: "#abb2bf"
      accent: $(palette.cyan)

`}</CodeBlock>

The above produces the following variable paths:

- `palette.cyan`
- `palette.grey`
- `std.bg`
- `std.fg`
- `std.accent`

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
          foreground: $(palette.grey)
          fontStyle: italic
      - name: Keywords
        scope: keyword
        settings:
          foreground: $(palette.cyan)

`}</CodeBlock>

### `semanticTokenColors`

An object mapping semantic token types to colour expressions.

<CodeBlock lang="yaml">{`

  theme:
    semanticTokenColors:
      variable.declaration:
        foreground: $(std.fg)
      function.declaration:
        foreground: $(palette.cyan)

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
