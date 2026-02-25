---
sidebar_position: 4
title: "Beyond Hex Codes"
---

import CodeBlock from "@site/src/components/CodeBlock"

Sassy uses [Culori](https://culorijs.org/) under the hood, which means you're
not limited to hex codes. Any colour format Culori understands, Sassy understands. And some of those formats are significantly better for designing themes.

## OKLCH: Perceptual Uniformity

The standout format for theme design is OKLCH. It has three channels:

- **L** -- lightness (0 to 1)
- **C** -- chroma / saturation (0 to ~0.4, depends on hue)
- **H** -- hue (0 to 360, like a colour wheel)

The key advantage: equal numeric steps produce equal visual steps. If you
`lighten()` two different OKLCH colours by the same amount, the perceived brightness change is the same for both. Hex codes and HSL can't make that guarantee.

Here's the ocean palette rewritten in OKLCH:

<CodeBlock lang="yaml">{`

  palette:
    blue: oklch(0.45 0.12 250)
    cyan: oklch(0.68 0.15 230)
    gray: oklch(0.60 0.00 0)
    white: oklch(0.90 0.01 250)
    red: oklch(0.55 0.20 27)
    green: oklch(0.70 0.15 145)
    yellow: oklch(0.80 0.15 85)

`}</CodeBlock>

The output is still hex -- VS Code requires it -- but your source values are
perceptually meaningful. When you see `oklch(0.45 ...)` and `oklch(0.68 ...)`, you know exactly how they relate in brightness.

:::tip
Sassy's `lighten()` and `darken()` functions already work in OKLCH internally,
regardless of your input format. But defining your `palette` in OKLCH gives you
perceptual control at the source level too.
:::

## Other Supported Formats

Use whatever makes sense for your workflow:

<CodeBlock lang="yaml">{`

  vars:
    # HSL -- familiar to most designers
    warm: hsl(30, 80%, 50%)

    # RGB -- when you have exact values
    precise: rgb(45, 90, 135)

    # CSS named colours via css()
    danger: css(crimson)
    ocean: css(deepskyblue)
    muted: fade(css(tomato), 60)

`}</CodeBlock>

The `css()` function accepts any [CSS named colour](https://developer.mozilla.org/en-US/docs/Web/CSS/named-color)
and converts it to hex. Handy for quick prototyping or when a named colour is
exactly what you want.

## Mixing Formats Freely

Sassy doesn't care if your palette mixes formats. This is perfectly valid:

<CodeBlock lang="yaml">{`

  palette:
    blue: oklch(0.45 0.12 250)
    cyan: "#4a9eff"
    gray: hsl(0, 0%, 50%)
    white: css(whitesmoke)

`}</CodeBlock>

Every value gets converted to hex for the final output. The format you write is purely for your own clarity and convenience.

## When to Use What

- **Hex** -- quick, universally understood, fine for one-off values
- **OKLCH** -- best for building palettes where you want consistent perceived brightness and saturation across hues
- **HSL** -- when you're thinking in terms of hue, saturation, and lightness
- **css()** -- for prototyping or when a named colour nails the look

There's no wrong answer. Pick the format that makes your intent clearest.

## Next Steps

You've seen `lighten()`, `darken()`, `fade()`, and `mix()`. But Sassy has more colour functions than what the Quick Start covered. Let's look at the full toolkit.
