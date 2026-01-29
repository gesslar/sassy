---
sidebar_position: 4
title: "Import System"
---

# Import System

Sassy supports splitting a theme across multiple files using the `config.import` array. Imported files contribute variables, colours, token colours, and semantic token colours to the final theme.

## Syntax

```yaml
config:
  name: "My Theme"
  type: dark
  import:
    - ./shared/variables.yaml
    - ./shared/colors.yaml
    - ./shared/tokenColors.json5
```

Paths are relative to the importing file. Both `.yaml` and `.json5` formats are supported.

## Merge Behaviour

| Content Type | Merge Behaviour |
|---|---|
| `vars` | Deep merge; later values override earlier ones |
| `colors` | Deep merge; later values override earlier ones |
| `semanticTokenColors` | Deep merge; later values override earlier ones |
| `config` | Deep merge; later values override earlier ones |
| `tokenColors` | Append-only concatenation (order preserved) |

## Merge Order

1. Imports are processed in array order, left to right.
2. Each successive import is deep-merged (or appended for `tokenColors`) onto the accumulated result.
3. The main file's own `vars`, `colors`, `semanticTokenColors`, and `tokenColors` are applied last, giving the main file final override authority.

```
import[0] → import[1] → ... → import[n] → main file
```

## tokenColors Ordering

VS Code evaluates `tokenColors` rules using **first-match** semantics. The order of rules matters:

- Imported `tokenColors` appear first in the output.
- The main file's `tokenColors` are appended after all imports.

This means imports provide the base/specific rules while the main file can add fallback rules that only apply if no import already matched.

## Dynamic Import Paths

Variable substitution is supported in import paths. Variables from `config` are available:

```yaml
config:
  name: "Midnight Ocean"
  type: dark
  import:
    - ./import/tokenColors-$(type).yaml
```

Here `$(type)` resolves to `dark`, producing the path `./import/tokenColors-dark.yaml`.

## Dependency Tracking

In watch mode (`--watch`), Sassy automatically tracks all imported files. When any imported file changes, the theme is recompiled. No additional configuration is needed.

## Example Multi-File Structure

```
my-theme/
├── theme.yaml              # Main entry: config + theme overrides
├── shared/
│   ├── variables.yaml      # Colour palette + semantic variables
│   ├── colors.yaml         # VS Code colour mappings
│   └── tokenColors.yaml    # Syntax highlighting rules
```

**theme.yaml**
```yaml
config:
  name: "My Theme"
  type: dark
  import:
    - ./shared/variables.yaml
    - ./shared/colors.yaml
    - ./shared/tokenColors.yaml

theme:
  colors:
    # Override specific colours from imports
    statusBar.background: $(palette.blue)
```

**shared/variables.yaml**
```yaml
vars:
  palette:
    blue: "#61afef"
    cyan: "#56b6c2"
  std:
    bg: "#282c34"
    fg: "#abb2bf"
```

**shared/colors.yaml**
```yaml
theme:
  colors:
    editor.background: $(std.bg)
    editor.foreground: $(std.fg)
```

**shared/tokenColors.yaml**
```yaml
theme:
  tokenColors:
    - name: Keywords
      scope: keyword
      settings:
        foreground: $(palette.cyan)
```
