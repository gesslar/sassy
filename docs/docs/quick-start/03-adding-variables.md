---
sidebar_position: 3
title: "Building a Palette"
---

import Tabs from "@theme/Tabs"
import TabItem from "@theme/TabItem"

Two colours won't get us far. Let's build a proper palette and introduce variable nesting.

## Colour Palette and Semantic Layer

Replace your `vars` section with this:

<Tabs groupId="json5-yaml">
  <TabItem value="json5" label="JSON5" default>

```json
{
  vars: {
    colors: {
      blue: "#2d5a87",
      cyan: "#4a9eff",
      gray: "#3c3c3c",
      white: "#e6e6e6",
      red: "#ff6b6b",
      green: "#51cf66",
      yellow: "#ffd93d",
    },
    accent: "$(colors.cyan)",
    std: {
      fg: "$(colors.white)",
      bg: "#1a1a2e",
      "bg.panel": "#242440",
    },
  },
}
```

  </TabItem>
  <TabItem value="yaml" label="YAML">

```yaml
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
```

  </TabItem>
</Tabs>

There are two ideas at work here.

**Nested variables** — `colors` is a group containing `blue`, `cyan`, and so on. You reference them with dot-paths: `$(colors.cyan)`, `$(colors.red)`. Nesting is purely organizational — group however you like.

**Semantic naming** — `accent` and `std.fg` describe *purpose*, not appearance. Your theme properties should reference these semantic names. Later, changing `accent` from cyan to purple updates every property that uses it.

## Variable Reference Syntax

Sassy supports three ways to reference variables:

| Syntax | Example |
| -------- | --------- |
| `$(var)` | `$(colors.cyan)` |
| `$var` | `$colors.cyan` |
| `${var}` | `${colors.cyan}` |

All three work identically. This guide uses `$(var)` throughout — it's the most readable and least ambiguous, especially inside colour functions.

## Update Your Theme Colours

Update `theme.colors` to use the semantic layer:

```yaml
theme:
  colors:
    editor.background: $(std.bg)
    editor.foreground: $(std.fg)
    editorGroupHeader.tabsBackground: $(std.bg.panel)
    tab.activeBackground: $(std.bg)
    tab.activeForeground: $(std.fg)
    tab.inactiveBackground: $(std.bg.panel)
    tab.inactiveForeground: $(colors.gray)
```

## Build It

```bash
npx @gesslar/sassy build ocean.yaml
```

Check the output — every reference resolves to a concrete hex value. The theme now has tabs and panels styled consistently from a single palette. But we're still hand-picking every shade. Next, we'll let colour functions do that work for us.
