---
sidebar_position: 3
title: "Building a Palette"
---

import CodeBlock from "@site/src/components/CodeBlock"

Two colours won't get us far. Let's build a proper palette and introduce
variable nesting.

## Colour Palette and Semantic Layer

Replace your `vars` section with this:

<CodeBlock lang="yaml">{`

  vars:
    colors:
      blue: "#2d5a87"
      cyan: "#4a9eff"
      gray: "#3c3c3c"
      white: "#e6e6e6"
      red: "#ff6b6b"
      green: "#51cf66"
      yellow: "#ffd93d"

    accent: $(colors.cyan)

    std:
      fg: $(colors.white)
      bg: "#1a1a2e"
      bg.panel: "#242440"

`}</CodeBlock>

There are two ideas at work here.

**Nested variables** — `colors` is a group containing `blue`, `cyan`, and so
on. You reference them with dot-paths: `$(colors.cyan)`, `$(colors.red)`.
Nesting is purely organizational — group however you like.

**Semantic naming** — `accent` and `std.fg` describe *purpose*, not appearance.
Your theme properties should reference these semantic names. Later, changing
`accent` from cyan to purple updates every property that uses it.

## Variable Reference Syntax

Sassy supports three ways to reference variables:

| Syntax | Example |
| -------- | --------- |
| `$(var)` | `$(colors.cyan)` |
| `$var` | `$colors.cyan` |
| `${var}` | `${colors.cyan}` |

All three work identically. This guide uses `$(var)` throughout — it's the most
readable and least ambiguous, especially inside colour functions.

## Update Your Theme Colours

Update `theme.colors` to use the semantic layer:

<CodeBlock lang="yaml">{`

  theme:
    colors:
      editor.background: $(std.bg)
      editor.foreground: $(std.fg)
      editorGroupHeader.tabsBackground: $(std.bg.panel)
      tab.activeBackground: $(std.bg)
      tab.activeForeground: $(std.fg)
      tab.inactiveBackground: $(std.bg.panel)
      tab.inactiveForeground: $(colors.gray)

`}</CodeBlock>

## Build It

<CodeBlock lang="bash">{`

  npx @gesslar/sassy build ocean.yaml

`}</CodeBlock>

### Nesting `theme.colors`

Sassy allows you to nest your theme colors definition. This can provide
clarity, as to the relationship of different groupings. In Microsoft's most
excellent design decisioning, not every expected nesting is supported, and it
is somewhat of a grab bag of conventions. However, most are nestable and here
is an example of the above theme conveyed in such a manner.

<CodeBlock lang="yaml">{`

  theme:
    colors:
      editor:
        background: $(std.bg)
        foreground: $(std.fg)

      editorGroupHeader:
        tabsBackground: $(std.bg.panel)

      tab:
        activeBackground: $(std.bg)
        activeForeground: $(std.fg)
        inactiveBackground: $(std.bg.panel)
        inactiveForeground: $(colors.gray)

`}</CodeBlock>

For demonstration purposes, the continued examples will be in the first,
flattened pattern, but know that just like in your variables, Sassy doesn't
really care, as long as they collapse correctly, everything's good!

Check the output — every reference resolves to a concrete hex value. The theme
now has tabs and panels styled consistently from a single palette. But we're
still hand-picking every shade. Next, we'll let colour functions do that work
for us.
