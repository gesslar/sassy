---
sidebar_position: 3
title: "Colour Functions"
---

import CodeBlock from "@site/src/components/CodeBlock"

Sassy provides colour manipulation functions powered by [Culori](https://culorijs.org/). Functions can be used anywhere a colour value is expected -- in `vars`, `colors`, `tokenColors`, and `semanticTokenColors`.

## Function Reference

| Function | Signature | Description |
|----------|-----------|-------------|
| `lighten` | `lighten(colour, amount)` | Lighten by percentage (0--100). Uses OKLCH with multiplicative scaling for perceptual uniformity. |
| `darken` | `darken(colour, amount)` | Darken by percentage (0--100). Uses OKLCH with multiplicative scaling. |
| `alpha` | `alpha(colour, value)` | Set alpha to an exact value (0--1). 0 = transparent, 1 = opaque. |
| `fade` | `fade(colour, amount)` | Reduce opacity by a relative amount (0--1). Multiplies current alpha by `(1 - amount)`. |
| `solidify` | `solidify(colour, amount)` | Increase opacity by a relative amount (0--1). Multiplies current alpha by `(1 + amount)`. |
| `mix` | `mix(colour1, colour2[, ratio])` | Blend two colours. Ratio 0--100 (default 50). Uses OKLCH interpolation when either input is OKLCH. |
| `invert` | `invert(colour)` | Flip lightness in HSL space (preserves hue and saturation). |
| `css` | `css(name)` | Convert a CSS named colour to hex (e.g., `css(tomato)`). |
| `hsl` | `hsl(h, s, l)` | Create a colour from HSL. h: 0--360, s: 0--100, l: 0--100. |
| `hsla` | `hsla(h, s, l, a)` | HSL with alpha. a: 0--1. |
| `hsv` | `hsv(h, s, v)` | Create a colour from HSV. h: 0--255, s: 0--255, v: 0--255. |
| `hsva` | `hsva(h, s, v, a)` | HSV with alpha. a: 0--1. |
| `rgb` | `rgb(r, g, b)` | Create a colour from RGB. r/g/b: 0--255. |
| `rgba` | `rgba(r, g, b, a)` | RGB with alpha. a: 0--1. |
| `oklch` | `oklch(l, c, h)` | Create a colour in OKLCH space. l: 0--1, c: 0--100, h: 0--360. |
| `oklcha` | `oklcha(l, c, h, a)` | OKLCH with alpha. a: 0--1. |

## Colour Arguments

The `colour` parameter in transformation functions accepts:

- **Hex values**: `#ff0000`, `#f00`, `#ff000080` (with alpha)
- **Variable references**: `$(accent)`, `$std.fg`
- **Palette references**: `$$cyan`, `$($blue)` (shorthand for `$palette.cyan`, `$(palette.blue)`)
- **CSS names via css()**: `css(tomato)`
- **Nested function calls**: `darken($(bg), 20)`

## Examples

<CodeBlock lang="yaml">{`
  vars:
    base: "#1a1a2e"
    accent: "#56b6c2"

  theme:
    colors:
      # Lighten the base by 30%
      editor.background: lighten($(base), 30)

      # Set exact alpha
      editor.selectionBackground: alpha($(accent), 0.3)

      # Mix two colours equally
      panel.background: mix($(base), $(accent))

      # Mix with custom ratio (80% first colour, 20% second)
      sideBar.background: mix($(base), $(accent), 80)

      # Reduce opacity by half
      editorLineNumber.foreground: fade($(accent), 0.5)

      # Invert lightness
      badge.foreground: invert($(base))

      # Named CSS colour
      errorForeground: css(crimson)

      # Colour space constructors
      statusBar.background: oklch(0.5, 30, 250)
      button.background: hsl(200, 80, 50)

    semanticTokenColors:
      # Object form — function in foreground
      variable.readonly:
        foreground: fade($(accent), 0.3)
        fontStyle: italic

      # String form — function as shorthand foreground
      "string:escape": lighten($$yellow, 10)

`}</CodeBlock>

## Passthrough Behaviour

Any colour expression that Culori can parse is accepted even without a named Sassy function. If a value does not match any built-in function name, it is passed directly to Culori's parser as a fallback. This means colour spaces supported by Culori (LAB, LCH, HWB, Display P3, Rec.2020, and others) work out of the box.

See the [Culori documentation](https://culorijs.org/) for the full list of supported colour spaces and syntaxes.
