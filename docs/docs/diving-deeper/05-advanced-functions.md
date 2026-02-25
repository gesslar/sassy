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

Flips the lightness value in OKLCH space. A dark colour becomes light, a light colour becomes dark. Hue and chroma are preserved.

<CodeBlock lang="yaml">{`

  vars:
    inverted-fg: invert($(std.fg))    # light foreground becomes dark
    inverted-bg: invert($(std.bg))    # dark background becomes light

`}</CodeBlock>

### tint(colour, amount) and shade(colour, amount)

Mix toward white or black by a percentage. Useful for quickly generating lighter or darker variants that feel natural rather than washed out.

<CodeBlock lang="yaml">{`

  vars:
    std:
      bg.hover: tint($(std.bg), 10)      # slightly lighter on hover
      bg.deep: shade($(std.bg), 25)      # noticeably deeper
      accent.soft: tint($(accent), 40)   # pastel-like accent

`}</CodeBlock>

## Chroma Functions

### saturate(colour, amount) and desaturate(colour, amount)

Adjust the chroma (colourfulness) of a colour in OKLCH space by a percentage. These are the technical names; see `mute` and `pop` below for expressive aliases.

<CodeBlock lang="yaml">{`

  vars:
    vivid-accent: saturate($(accent), 30)     # push chroma up by 30%
    calm-accent: desaturate($(accent), 40)    # pull chroma down by 40%

`}</CodeBlock>

### grayscale(colour)

Strips all chroma, leaving only the perceptual lightness. The result sits on the same position in the greyscale as the original would appear to the eye.

<CodeBlock lang="yaml">{`

  vars:
    neutral-bg: grayscale($(std.bg))
    neutral-fg: grayscale($(std.fg))

`}</CodeBlock>

### mute(colour, amount) and pop(colour, amount)

Expressive aliases for partial chroma adjustment. `mute` moves a colour toward grey; `pop` moves it away. At 100, `mute` is equivalent to `grayscale`.

Think of it as: *"I want this colour to feel hushed"* vs *"I want this to jump out"*.

<CodeBlock lang="yaml">{`

  vars:
    std:
      # Active state — accent at full presence
      fg.active: pop($(accent), 20)

      # Inactive states — same hue, much quieter
      fg.inactive: mute($(accent), 60)
      fg.disabled: mute($(accent), 85)

`}</CodeBlock>

## Hue Functions

### shiftHue(colour, degrees) and complement(colour)

Rotate the hue angle in OKLCH space. `complement` is a shorthand for a 180° shift. Both are no-ops on achromatic colours (greyscale), since hue is meaningless there.

<CodeBlock lang="yaml">{`

  palette:
    base: oklch(0.6 0.15 220)
    triadic-a: shiftHue($$base, 120)
    triadic-b: shiftHue($$base, 240)
    complement: complement($$base)

`}</CodeBlock>

## Contrast

### contrast(colour)

Returns `#000000` or `#ffffff` — whichever is more readable against the given colour. Useful for automatically choosing foreground text on dynamic or user-defined backgrounds.

<CodeBlock lang="yaml">{`

  vars:
    # Automatically readable text on any background
    badge.fg: contrast($(badge.bg))
    button.label: contrast($(button.bg))

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
    complement: complement($$base)
    hushed: mute($$base, 60)
    ghost: alpha($$base, 0.15)
    on-base: contrast($$base)

`}</CodeBlock>

This gives you seven related colours from one source value. Change `base` and every derived colour follows.

## Function Summary

| Function | Arguments | Description |
|---|---|---|
| `lighten` | colour, amount | Increase lightness by percentage (OKLCH) |
| `darken` | colour, amount | Decrease lightness by percentage (OKLCH) |
| `invert` | colour | Flip lightness (OKLCH) |
| `tint` | colour, amount? | Mix toward white (default 50%) |
| `shade` | colour, amount? | Mix toward black (default 50%) |
| `saturate` | colour, amount | Increase chroma by percentage (OKLCH) |
| `desaturate` | colour, amount | Decrease chroma by percentage (OKLCH) |
| `grayscale` | colour | Remove all chroma |
| `mute` | colour, amount | Move toward greyscale by percentage |
| `pop` | colour, amount | Move away from greyscale by percentage |
| `shiftHue` | colour, degrees | Rotate hue by degrees (OKLCH) |
| `complement` | colour | 180° hue complement |
| `contrast` | colour | `#000000` or `#ffffff` for readability |
| `fade` | colour, amount | Reduce opacity (more transparent) |
| `solidify` | colour, amount | Increase opacity (more opaque) |
| `alpha` | colour, value | Set exact alpha (0--1) |
| `mix` | colourA, colourB, ratio? | Blend two colours in OKLCH (ratio 0--100, default 50) |
| `css` | name | CSS named colour to hex |

Any Culori-supported colour expression (like `oklch(...)`, `hsl(...)`, `rgb(...)`) also works directly as a value and is converted to hex in the output.

## Next Steps

You've got a design system, multiple themes, and a full colour toolkit. Before shipping, let's make sure everything is clean.
