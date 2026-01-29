---
sidebar_position: 2
title: "Your First Theme"
---

import CodeBlock from "@site/src/components/CodeBlock"

Let's get something on screen. Create a file called `ocean.yaml` and add the following:

<CodeBlock lang="yaml">{`

  config:
    name: "Ocean"
    type: dark

  vars:
    bg: "#1a1a2e"
    fg: "#e6e6e6"

  theme:
    colors:
      editor.background: $(bg)
      editor.foreground: $(fg)

`}</CodeBlock>

That's a valid Sassy theme. Let's break it down.

## The Three Sections

**`config`** tells Sassy about your theme:

- `name` — the display name VS Code shows in the theme picker
- `type` — `dark` or `light`, so VS Code picks the right defaults for
  properties you don't set

**`vars`** is where you define variables. Here we have two: `bg` and `fg`.
These are just names pointing to hex colours.
****
**`theme.colors`** maps VS Code UI properties to values. The `$(bg)` syntax
references the variable `bg` — Sassy resolves it to `#1a1a2e` at build time.

## Build It

Run this from the same directory as your `ocean.yaml`:

<CodeBlock lange="shell">{`

npx @gesslar/sassy build ocean.yaml

`}
</CodeBlock>

Sassy creates `ocean.color-theme.json` alongside your source file. Open it up:

<CodeBlock lang="json">
{`

  {
    "name": "Ocean",
    "type": "dark",
    "colors": {
      "editor.background": "#1a1a2e",
      "editor.foreground": "#e6e6e6"
    },
    "tokenColors": []
  }
`}
</CodeBlock>

Variables resolved, standard VS Code format. Two colours isn't much of a theme
yet, but the pipeline works. Next, we'll build a proper palette.
