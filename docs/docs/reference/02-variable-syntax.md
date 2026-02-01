---
sidebar_position: 2
title: "Variable Syntax"
---

import CodeBlock from "@site/src/components/CodeBlock"

Variables are defined under `vars` (or `palette`) and referenced throughout `vars` and `theme` sections using one of three interchangeable reference forms. Palette values have a dedicated alias syntax using `$$`.

## Reference Forms

| Form | Syntax | Example |
|------|--------|---------|
| Parenthesised | `$(path.to.var)` | `$(std.bg.panel)` |
| Bare | `$path.to.var` | `$std.bg.panel` |
| Braced | `${path.to.var}` | `${std.bg.panel}` |

All three resolve identically and can be mixed freely within the same file. The recommended form is **`$(...)`** because its explicit terminator makes it safe adjacent to punctuation and other text.

The bare form (`$path.to.var`) stops at the first character that is not a word character or a dot. This can cause ambiguity when a variable reference is immediately followed by text.

## Palette Alias Syntax

The `$$` prefix is shorthand for referencing `palette.*` values. It works with all three reference forms:

| Written | Expands to |
|---------|------------|
| `$$cyan` | `$palette.cyan` |
| `$($cyan)` | `$(palette.cyan)` |
| `${$cyan}` | `${palette.cyan}` |

This expansion happens before any variable resolution. After expansion, the reference resolves through the normal variable lookup. The `$$` alias works anywhere — in `palette`, `vars`, `theme.colors`, `tokenColors`, `semanticTokenColors`, and inside colour function arguments.

<CodeBlock lang="yaml">{`

  palette:
    cyan: "#56b6c2"
    blue: "#2d5a87"

  vars:
    accent: $$cyan                      # expands to $palette.cyan
    bg.accent: darken($$blue, 70)       # palette ref inside function

`}</CodeBlock>

## Dot-Path Hierarchies

Nested objects under `vars` (and `palette`) create dot-path variable names automatically:

<CodeBlock lang="yaml">{`

  vars:
    std:
      bg: "#1a1a2e"        # std.bg
      bg.panel: "#242424"  # std.bg.panel (not a nested object — literal key)

`}</CodeBlock>

## Variable-to-Variable References

Variables may reference other variables, including palette values:

<CodeBlock lang="yaml">{`

  palette:
    cyan: "#56b6c2"

  vars:
    accent: $$cyan

`}</CodeBlock>

Variables may also contain colour function calls:

<CodeBlock lang="yaml">{`

  vars:
    base: "#1a1a2e"
    lighter: lighten($(base), 20)

`}</CodeBlock>

## Resolution Order

Resolution happens in three distinct passes to ensure deterministic scoping:

1. **Palette pass** — every entry under `palette` is resolved using only the palette set itself. Palette entries cannot reference `vars` or `theme` values.
2. **Variable pass** — every entry under `vars` is resolved using the fully-resolved palette plus the variable set. Variables never see theme values during this pass.
3. **Theme pass** — entries under `theme` (colours, tokenColors, semanticTokenColors) are resolved against the union of the fully-resolved palette, variables, and the theme entries.

Variables never see partially-resolved theme state. This guarantees that a variable always evaluates to the same value regardless of where it is referenced in the theme.

Within each pass, resolution iterates until all tokens are fully resolved or a maximum iteration limit is reached. If circular references prevent resolution, the compiler raises an error listing the unresolved tokens.

## Embedding in Strings

Variable references can appear anywhere a string value is expected:

<CodeBlock lang="yaml">{`

  theme:
    colors:
      editor.background: $(std.bg)
      panel.border: alpha($(std.fg), 0.15)

    semanticTokenColors:
      variable.declaration:
        foreground: $(std.fg)
        fontStyle: italic
      "string:escape": $$yellow

`}</CodeBlock>

When using the parenthesised or braced forms, the reference is unambiguous even when embedded in a larger expression. The bare form works in most cases but may require switching to `$(...)` when adjacent to parentheses or other punctuation.

In `semanticTokenColors`, references work identically whether the value is a string (shorthand for foreground) or a property inside an object form.
