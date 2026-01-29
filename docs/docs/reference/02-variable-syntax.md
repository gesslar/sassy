---
sidebar_position: 2
title: "Variable Syntax"
---

# Variable Syntax

Variables are defined under the `vars` key and referenced throughout `vars` and `theme` sections using one of three interchangeable reference forms.

## Reference Forms

| Form | Syntax | Example |
|------|--------|---------|
| Parenthesised | `$(path.to.var)` | `$(std.bg.panel)` |
| Bare | `$path.to.var` | `$std.bg.panel` |
| Braced | `${path.to.var}` | `${std.bg.panel}` |

All three resolve identically and can be mixed freely within the same file. The recommended form is **`$(...)`** because its explicit terminator makes it safe adjacent to punctuation and other text.

The bare form (`$path.to.var`) stops at the first character that is not a word character or a dot. This can cause ambiguity when a variable reference is immediately followed by text.

## Dot-Path Hierarchies

Nested objects under `vars` create dot-path variable names automatically:

```yaml
vars:
  std:
    bg: "#1a1a2e"        # std.bg
    bg.panel: "#242424"  # std.bg.panel (not a nested object — literal key)
  palette:
    cyan: "#56b6c2"      # palette.cyan
```

## Variable-to-Variable References

Variables may reference other variables:

```yaml
vars:
  palette:
    cyan: "#56b6c2"
  accent: $(palette.cyan)
```

Variables may also contain colour function calls:

```yaml
vars:
  base: "#1a1a2e"
  lighter: lighten($(base), 20)
```

## Resolution Order

Resolution happens in two distinct passes to ensure deterministic scoping:

1. **Variable pass** -- every entry under `vars` is resolved using only the variable set itself. Variables never see theme values during this pass.
2. **Theme pass** -- entries under `theme` (colours, tokenColors, semanticTokenColors) are resolved against the union of the fully-resolved variables and the theme entries.

Variables never see partially-resolved theme state. This guarantees that a variable always evaluates to the same value regardless of where it is referenced in the theme.

Within each pass, resolution iterates until all tokens are fully resolved or a maximum iteration limit is reached. If circular references prevent resolution, the compiler raises an error listing the unresolved tokens.

## Embedding in Strings

Variable references can appear anywhere a string value is expected:

```yaml
theme:
  colors:
    editor.background: $(std.bg)
    panel.border: alpha($(std.fg), 0.15)
```

When using the parenthesised or braced forms, the reference is unambiguous even when embedded in a larger expression. The bare form works in most cases but may require switching to `$(...)` when adjacent to parentheses or other punctuation.
