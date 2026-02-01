---
sidebar_position: 2
title: "Colors"
---

import CodeBlock from "@site/src/components/CodeBlock"

The `colors` object controls every non-code surface in VS Code — the editor background, sidebar panels, the status bar, borders, badges, buttons, input fields, scrollbars, and hundreds more.

## Structure

`colors` is a flat object. Each key is a dot-separated identifier defined by VS Code, and each value is a hex colour string.

<CodeBlock lang="json">{`
{
  "colors": {
    "editor.background": "#1a1a2e",
    "editor.foreground": "#abb2bf",
    "activityBar.background": "#16213e",
    "statusBar.background": "#0f3460",
    "focusBorder": "#56b6c280"
  }
}
`}</CodeBlock>

That's it. No nesting, no arrays, no sub-objects. Just string keys and hex values.

## Colour Format

VS Code expects **hex strings** in `colors`:

| Format | Example | Meaning |
|--------|---------|---------|
| `#RGB` | `#f00` | Short hex (red) |
| `#RRGGBB` | `#ff0000` | Full hex (red) |
| `#RRGGBBAA` | `#ff000080` | Hex with alpha (50% transparent red) |

Alpha is supported and widely used — transparent borders, subtle overlays, and faded highlights all rely on it. The alpha byte is appended at the end (`00` = fully transparent, `ff` = fully opaque).

## Finding Colour Identifiers

VS Code defines over 700 colour identifiers. The authoritative list is in the [VS Code Theme Colour Reference](https://code.visualstudio.com/api/references/theme-color).

Common groups:

| Prefix | Controls |
|--------|----------|
| `editor.*` | Editor area (background, foreground, selection, line highlights) |
| `editorGutter.*` | Gutter (line numbers, folding, decorations) |
| `activityBar.*` | Left-hand icon bar |
| `sideBar.*` | File explorer, search results, source control panels |
| `statusBar.*` | Bottom bar |
| `tab.*` | Editor tabs |
| `titleBar.*` | Window title bar |
| `input.*` | Input fields (search, settings, command palette) |
| `list.*` | All list/tree views (file explorer, search results) |
| `button.*` | Buttons |
| `badge.*` | Notification badges |
| `panel.*` | Bottom panels (terminal, output, problems) |

:::tip
You don't need to define every identifier. VS Code fills in sensible defaults from the base type (`dark` or `light`). Focus on the surfaces that matter to your design and let the rest fall through.
:::

## Gotchas

### Alpha Compositing

When you use alpha in a `colors` value, VS Code composites it against the surface behind it. This means the same colour can look different depending on where it's used. A `#ffffff20` border on a dark background looks like a faint grey line; the same value on a light background is nearly invisible.

### Some Properties Require Transparency

A significant number of `colors` properties **must not be opaque**. VS Code draws these as overlays on top of other content — selections, highlights, find matches, diff regions, and drop targets. If you set them to a solid colour, they'll hide the text or decorations underneath.

The [VS Code Theme Colour Reference](https://code.visualstudio.com/api/references/theme-color) documents which properties need transparency. Common groups include:

| Group | Examples |
|-------|----------|
| **Selection & highlights** | `editor.selectionHighlightBackground`, `editor.wordHighlightBackground`, `editor.findMatchHighlightBackground` |
| **Find results** | `editor.findRangeHighlightBackground`, `terminal.findMatchBackground` |
| **Diff editor** | `diffEditor.insertedTextBackground`, `diffEditor.removedTextBackground`, `diffEditor.insertedLineBackground` |
| **Merge conflicts** | `merge.currentHeaderBackground`, `merge.incomingHeaderBackground`, `merge.commonContentBackground` |
| **Overview ruler** | `editorOverviewRuler.findMatchForeground`, `editorOverviewRuler.wordHighlightForeground` |
| **Drop targets** | `sideBar.dropBackground`, `panel.dropBackground`, `terminal.dropBackground` |
| **Other** | `editor.foldBackground`, `editor.hoverHighlightBackground`, `editor.rangeHighlightBackground` |

:::tip
If you use the `$schema` property in your theme config, VS Code will warn you in the editor when a colour that requires transparency is missing an alpha channel. This is one of the best reasons to include the schema.
:::

In Sassy, `fade()` and `alpha()` make this easy to manage. Rather than manually calculating hex alpha bytes, you express the intent:

<CodeBlock lang="yaml">{`

  theme:
    colors:
      editor.selectionHighlightBackground: alpha($(accent), 0.3)
      editor.wordHighlightBackground: fade($(accent), 0.6)

`}</CodeBlock>

### No RGB/HSL — Hex Only

Unlike CSS, VS Code `colors` only accepts hex strings. You cannot use `rgb()`, `hsl()`, or named colours directly. This is one area where Sassy helps — you can write `hsl(200, 80, 50)` or `css(tomato)` in your source file and Sassy converts it to hex in the output.

### Transparent vs Omitted

Setting a colour to `#00000000` (fully transparent) is different from omitting it. A transparent colour is explicitly "nothing here." An omitted colour falls back to VS Code's default for the base type. Sometimes you want the default; sometimes you want true transparency.

## In Sassy

Sassy maps the `colors` object directly under `theme.colors`. The main difference is that you use variable references and colour functions instead of raw hex:

<CodeBlock lang="yaml">{`

  # Raw VS Code JSON
  # "editor.background": "#1a1a2e"
  # "editor.foreground": "#abb2bf"
  # "focusBorder": "#56b6c280"

  # Sassy equivalent
  theme:
    colors:
      editor.background: $(std.bg)
      editor.foreground: $(std.fg)
      focusBorder: fade($(accent), 0.5)

`}</CodeBlock>

The output is identical — flat dot-separated keys with hex values. Sassy just lets you express the relationships between colours instead of repeating hex codes.

Sassy also supports nesting as a convenience. These are equivalent:

<CodeBlock lang="yaml">{`

  # Flat (matches VS Code structure)
  theme:
    colors:
      editor.background: $(std.bg)
      editor.foreground: $(std.fg)

  # Nested (Sassy flattens this for you)
  theme:
    colors:
      editor:
        background: $(std.bg)
        foreground: $(std.fg)

`}</CodeBlock>

Both produce the same `editor.background` and `editor.foreground` keys in the output.
