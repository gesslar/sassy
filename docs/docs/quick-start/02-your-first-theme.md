---
sidebar_position: 2
title: "Your First Theme"
---

import Tabs from "@theme/Tabs"
import TabItem from "@theme/TabItem"

Let's get something on screen. Create a file called `ocean.yaml` and add the following:

<Tabs groupId="json5-yaml">
  <TabItem value="json5" label="JSON5" default>

```json
{
  config: {
    name: "Ocean",
    type: "dark",
  },

  vars: {
    bg: "#1a1a2e",
    fg: "#e6e6e6",
  },

  theme: {
    colors: {
      "editor.background": "$(bg)",
      "editor.foreground": "$(fg)",
    },
  },
}
```

  </TabItem>
  <TabItem value="yaml" label="YAML">

```yaml
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

```

  </TabItem>
</Tabs>

That's a valid Sassy theme. Let's break it down.

## The Three Sections

**`config`** tells Sassy about your theme:

- `name` — the display name VS Code shows in the theme picker
- `type` — `dark` or `light`, so VS Code picks the right defaults for properties you don't set

**`vars`** is where you define variables. Here we have two: `bg` and `fg`. These are just names pointing to hex colours.

**`theme.colors`** maps VS Code UI properties to values. The `$(bg)` syntax references the variable `bg` — Sassy resolves it to `#1a1a2e` at build time.

## Build It

Run this from the same directory as your `ocean.yaml`:

```bash
npx @gesslar/sassy build ocean.yaml
```

Sassy creates `ocean.color-theme.json` alongside your source file. Open it up:

```json
{
  "name": "Ocean",
  "type": "dark",
  "colors": {
    "editor.background": "#1a1a2e",
    "editor.foreground": "#e6e6e6"
  },
  "tokenColors": []
}
```

Variables resolved, standard VS Code format. Two colours isn't much of a theme yet, but the pipeline works. Next, we'll build a proper palette.
