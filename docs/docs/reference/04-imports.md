---
sidebar_position: 4
title: "Import System"
---

import CodeBlock from "@site/src/components/CodeBlock"

Sassy supports splitting a theme across multiple files using the `config.import` array. Imported files contribute palette definitions, variables, colours, token colours, and semantic token colours to the final theme.

## Syntax

<CodeBlock lang="yaml">{`

  config:
    name: "My Theme"
    type: dark
    import:
      - ./shared/variables.yaml
      - ./shared/colors.yaml
      - ./shared/tokenColors.json5

`}</CodeBlock>

Paths are relative to the importing file. Both `.yaml` and `.json5` formats are supported.

## Merge Behaviour

| Content Type | Merge Behaviour |
|---|---|
| `palette` | Deep merge; later values override earlier ones |
| `vars` | Deep merge; later values override earlier ones |
| `colors` | Deep merge; later values override earlier ones |
| `semanticTokenColors` | Deep merge; later values override earlier ones |
| `config` | Deep merge; later values override earlier ones |
| `tokenColors` | Append-only concatenation (order preserved) |

## Merge Order

1. Imports are processed in array order, left to right.
2. Each successive import is deep-merged (or appended for `tokenColors`) onto the accumulated result.
3. The main file's own `palette`, `vars`, `colors`, `semanticTokenColors`, and `tokenColors` are applied last, giving the main file final override authority.

<CodeBlock lang="VOGON">{`
import[0] → import[1] → ... → import[n] → main file
`}</CodeBlock>

## tokenColors Ordering

VS Code evaluates `tokenColors` rules using **first-match** semantics. The order of rules matters:

- Imported `tokenColors` appear first in the output.
- The main file's `tokenColors` are appended after all imports.

This means imports provide the base/specific rules while the main file can add fallback rules that only apply if no import already matched.

## Dynamic Import Paths

Variable substitution is supported in import paths. Variables from `config` are available:

<CodeBlock lang="yaml">{`

  config:
    name: "Midnight Ocean"
    type: dark
    import:
      - ./import/tokenColors-$(type).yaml

`}</CodeBlock>

Here `$(type)` resolves to `dark`, producing the path `./import/tokenColors-dark.yaml`.

## Séance Operator

When redefining a `palette` key that already exists from a prior import, the séance operator (`^`) substitutes the accumulated prior value of that key inline.

| Form | Syntax |
|------|--------|
| Bare | `^` |
| Parenthesised | `^()` |
| Braced | `^{}` |

All three forms are equivalent. Use whichever reads cleanly in context.

Given an imported palette that defines `black: oklch(.145 0 0)`, a later file can derive from it:

<CodeBlock lang="yaml">{`

  palette:
    black: darken(^, 5)

`}</CodeBlock>

The `^` is replaced with the accumulated prior value of `black` before evaluation. The operator is resolved at compile time before the palette is evaluated. The prior value is captured as a synthetic palette token, which means the full derivation chain is visible in `resolve` output.

**Chaining:** If multiple import layers each redefine the same key with `^`, each step captures the accumulated value to that point in the import sequence. Each layer sees the result of the previous one.

**Constraints:**

- Only valid in `palette` definitions.
- Only fires on leaf (string) values — not on object nodes.
- Silently passes through if no prior value exists for the key.

## Dependency Tracking

In watch mode (`--watch`), Sassy automatically tracks all imported files. When any imported file changes, the theme is recompiled. No additional configuration is needed.

## Example Multi-File Structure

<CodeBlock lang="tree">{`

  my-theme/
  ├── theme.yaml                  # Main entry: config + theme overrides
  ├── shared/
  │   ├── palette.yaml            # Colour palette definitions
  │   ├── variables.yaml          # Semantic variables
  │   ├── colors.yaml             # VS Code colour mappings
  │   ├── tokenColors.yaml        # Syntax highlighting rules
  │   └── semanticTokenColors.yaml # Semantic token styling

`}</CodeBlock>

**theme.yaml**

<CodeBlock lang="yaml">{`

  config:
    name: "My Theme"
    type: dark
    import:
      - ./shared/palette.yaml
      - ./shared/variables.yaml
      - ./shared/colors.yaml
      - ./shared/tokenColors.yaml
      - ./shared/semanticTokenColors.yaml

  theme:
    colors:
      # Override specific colours from imports
      statusBar.background: $$blue

`}</CodeBlock>

**shared/palette.yaml**

<CodeBlock lang="yaml">{`

  palette:
    blue: "#61afef"
    cyan: "#56b6c2"

`}</CodeBlock>

**shared/variables.yaml**

<CodeBlock lang="yaml">{`

  vars:
    accent: $$cyan
    std:
      bg: "#282c34"
      fg: "#abb2bf"

`}</CodeBlock>

**shared/colors.yaml**

<CodeBlock lang="yaml">{`

  theme:
    colors:
      editor.background: $(std.bg)
      editor.foreground: $(std.fg)

`}</CodeBlock>

**shared/tokenColors.yaml**

<CodeBlock lang="yaml">{`

theme:
  tokenColors:
    - name: Keywords
      scope: keyword
      settings:
        foreground: $$cyan

`}</CodeBlock>

**shared/semanticTokenColors.yaml**

<CodeBlock lang="yaml">{`

theme:
  semanticTokenColors:
    variable.declaration:
      foreground: $(std.fg)
      fontStyle: italic
    function.declaration:
      foreground: $(accent)
      fontStyle: bold
    "string:escape": $$cyan

`}</CodeBlock>
