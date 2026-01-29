---
sidebar_position: 4
title: "Colour Functions"
---

import CodeBlock from "@site/src/components/CodeBlock"

Hand-picking hex codes for every shade is tedious and fragile. Sassy lets you
derive colours from existing ones using functions powered by [Culori](https://culorijs.org/).

## Derived Colours

Add these to your `vars.std` group:

<CodeBlock lang="yaml">{`

  vars:
    std:
      fg: $(colors.white)
      fg.inactive: fade($(std.fg), 60)
      bg: "#1a1a2e"
      bg.panel: lighten($(std.bg), 15)
      bg.accent: darken($(accent), 70)
      outline: fade($(accent), 30)
      shadow: fade($(std.bg), 80)

`}</CodeBlock>

Instead of guessing what "60% opacity white" looks like as a hex code, you
write `fade($(std.fg), 60)` and Sassy computes it.

## Core Functions

Here are the functions you'll use most:

| Function | What it does | Example |
|----------|-------------|---------|
| `lighten(colour, amount)` | Increases lightness by `amount`% | `lighten($(bg), 15)` |
| `darken(colour, amount)` | Decreases lightness by `amount`% | `darken($(accent), 70)` |
| `fade(colour, amount)` | Sets opacity to `amount`% | `fade($(fg), 60)` |
| `mix(colour1, colour2, weight)` | Blends two colours | `mix($(accent), $(bg), 50)` |

The first argument is always a colour — a hex value, a variable reference, or even another function call. The remaining arguments are numeric parameters.

## Wire Them Into Your Theme

Add more properties using the derived colours:

<CodeBlock lang="yaml">{`

  theme:
    colors:
      editor.background: $(std.bg)
      editor.foreground: $(std.fg)
      editorGroupHeader.tabsBackground: $(std.bg.panel)
      tab.activeBackground: $(std.bg)
      tab.activeForeground: $(std.fg)
      tab.inactiveBackground: $(std.bg.panel)
      tab.inactiveForeground: $(std.fg.inactive)
      focusBorder: $(std.outline)
      panel.border: $(std.outline)
      editorOverviewRuler.border: $(std.outline)
      widget.shadow: $(std.shadow)
      titleBar.activeBackground: $(std.bg.accent)
      titleBar.activeForeground: $(std.fg)
      titleBar.inactiveBackground: $(std.bg.accent)
      titleBar.inactiveForeground: $(std.fg.inactive)

`}</CodeBlock>

## Build It

<CodeBlock lang="shell"shell">{`

  npx @gesslar/sassy build ocean.yaml

`}</CodeBlock>

Open the output and look at the resolved values. `fade($(std.fg), 60)` becomes
something like `#e6e6e699` — the same white at 60% opacity, computed
automatically. Change your base `bg` colour and every derived shade updates
with it.

Next, let's add syntax highlighting.
