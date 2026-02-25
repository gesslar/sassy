---
sidebar_position: 5
title: "Advanced Colour Functions"
---

import CodeBlock from "@site/src/components/CodeBlock"

You already know `lighten()`, `darken()`, `fade()`, and `mix()`. Here's the
full set, with practical examples for each.

## Transparency Functions

### alpha(colour, value)

Sets the alpha channel to an exact value. The second argument is a decimal from
0 (fully transparent) to 1 (fully opaque).

<CodeBlock lang="yaml">{`

  vars:
    overlay: alpha($(accent), 0.5)         # exactly 50% transparent
    solid-accent: alpha($(accent), 1)      # remove any existing transparency
    ghost: alpha($(std.bg), 0.1)           # barely visible

`}</CodeBlock>

### fade(colour, amount)

Reduces opacity by a relative amount. Think of it as "make this more transparent."

<CodeBlock lang="yaml">{`

  vars:
    std:
      fg.inactive: fade($(std.fg), 60)     # 60% more transparent than fg
      fg.muted: fade($(std.fg), 40)        # 40% more transparent
      outline: fade($(accent), 30)         # subtle accent border

`}</CodeBlock>

### solidify(colour, amount)

The opposite of `fade()` -- increases opacity by a relative amount.

<CodeBlock lang="yaml">{`

  vars:
    hover-bg: solidify($(std.bg.accent), 30)  # 30% more opaque

`}</CodeBlock>

## Lightness Functions

### lighten(colour, amount) and darken(colour, amount)

Adjust lightness by a percentage. Both work in OKLCH colour space internally for perceptually uniform results.

<CodeBlock lang="yaml">{`

  vars:
    std:
      bg.panel: lighten($(std.bg), 15)
      bg.panel.inner: lighten($(std.bg.panel), 10)
      bg.deep: darken($(std.bg), 20)

`}</CodeBlock>

### invert(colour)

Flips the lightness value. A dark colour becomes light, a light colour becomes dark. Hue and saturation are preserved.

<CodeBlock lang="yaml">{`

  vars:
    inverted-fg: invert($(std.fg))    # light foreground becomes dark
    inverted-bg: invert($(std.bg))    # dark background becomes light

`}</CodeBlock>

## Blending

### mix(colourA, colourB, ratio)

Blends two colours together. The ratio (0-100) controls the balance -- 0 is all colourA, 100 is all colourB, 50 is an equal mix.

<CodeBlock lang="yaml">{`

  vars:
    # 20% accent blended into foreground
    tinted-fg: mix($(std.fg), $(accent), 20)

    # Equal blend for a complementary colour
    blend: mix($(colors.blue), $(colors.cyan), 50)

    # Default ratio is 50 if omitted
    halfway: mix($(colors.red), $(colors.green))

`}</CodeBlock>

## Colour Constructors

Any colour expression that Culori understands works as a passthrough. Sassy recognises these as colour constructors and converts them to hex:

<CodeBlock lang="yaml">{`

  vars:
    # Functional notation
    from-hsl: hsl(210, 60%, 40%)
    from-rgb: rgb(45, 90, 135)
    from-oklch: oklch(0.6 0.15 220)

    # With alpha
    from-hsla: hsla(210, 60%, 40%, 0.8)
    from-rgba: rgba(45, 90, 135, 0.5)
    from-oklcha: oklch(0.6 0.15 220 / 0.7)

    # CSS named colours
    named: css(deepskyblue)
    named-faded: fade(css(crimson), 40)

`}</CodeBlock>

Colour constructors can also be used inline as arguments to transformation functions -- no variable required:

<CodeBlock lang="yaml">{`

  vars:
    # Lighten/darken an oklch colour directly
    bg-lighter: lighten(oklch(0.1 0 0), 15)
    accent-dark: darken(hsl(210, 60%, 40%), 20)

    # Fade an rgb colour inline
    subtle: fade(rgb(74, 158, 255), 40)

`}</CodeBlock>

## Building Harmonious Palettes

Combine functions to derive entire palettes from a single base colour. The `palette` section is ideal for this since it's self-contained:

<CodeBlock lang="yaml">{`

  palette:
    base: oklch(0.6 0.15 220)
    lighter: lighten($$base, 20)
    darker: darken($$base, 20)
    complement: mix($$base, invert($$base), 50)
    ghost: alpha($$base, 0.15)
    warm-tint: mix($$base, css(coral), 15)

`}</CodeBlock>

This gives you six related colours from one source value. Change `base` and every derived colour follows.

## Function Summary

| Function | Arguments | Description |
|---|---|---|
| `lighten` | colour, amount | Increase lightness by percentage |
| `darken` | colour, amount | Decrease lightness by percentage |
| `fade` | colour, amount | Reduce opacity (more transparent) |
| `solidify` | colour, amount | Increase opacity (more opaque) |
| `alpha` | colour, value | Set exact alpha (0-1) |
| `invert` | colour | Flip lightness |
| `mix` | colourA, colourB, ratio? | Blend two colours (ratio 0-100, default 50) |
| `css` | name | CSS named colour to hex |

Any Culori-supported colour expression (like `oklch(...)`, `hsl(...)`, `rgb(...)`) also works directly as a value and is converted to hex in the output.

## Next Steps

You've got a design system, multiple themes, and a full colour toolkit. Before shipping, let's make sure everything is clean.
