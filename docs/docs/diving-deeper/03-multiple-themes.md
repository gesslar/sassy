---
sidebar_position: 3
title: "Multiple Themes, One System"
---

import CodeBlock from "@site/src/components/CodeBlock"

This is the power move. You have a design system with palette colours, semantic tokens, and scope mappings. Now you'll create a second theme that reuses the entire system -- just with different colours.

## The Sunset Theme

Create a new file alongside your ocean theme:

**sunset.yaml**:

<CodeBlock lang="yaml">{`

  config:
    name: "Sunset"
    type: dark
    import:
      - "./shared/variables.yaml"

  vars:
    # Override the palette
    colors:
      blue: "#8b4513"
      cyan: "#ff8c42"
      gray: "#4a3728"
      white: "#f5e6d3"
      red: "#e74c3c"
      green: "#27ae60"
      yellow: "#f39c12"

    # Override the semantic anchors
    accent: $(colors.cyan)
    main: $(colors.white)
    std:
      bg: "#1a1008"

  theme:
    colors:
      editor.background: $(std.bg)
      editor.foreground: $(std.fg)
      editorCursor.foreground: $(std.fg.accent)
      sideBar.background: $(std.bg.panel)
      sideBarSectionHeader.background: $(std.bg.panel.inner)
      activityBar.background: $(std.bg.panel)
      focusBorder: $(std.outline)
      widget.shadow: $(std.shadow)

      editorError.foreground: $(status.error)
      editorWarning.foreground: $(status.warning)
      editorInfo.foreground: $(status.info)

    tokenColors:
      - name: Comments
        scope: comment
        settings:
          foreground: $(scope.comment)
      - name: Keywords
        scope: keyword
        settings:
          foreground: $(scope.keyword)
      - name: Strings
        scope: string
        settings:
          foreground: $(scope.string)
      - name: Numbers
        scope: constant.numeric
        settings:
          foreground: $(scope.number)
      - name: Functions
        scope: entity.name.function
        settings:
          foreground: $(scope.function)
      - name: Types
        scope: entity.name.type
        settings:
          foreground: $(scope.type)

`}</CodeBlock>

## How Override Cascading Works

The import loads `shared/variables.yaml` first, establishing the full design system. Then the main file's `vars` section merges on top. Because objects deep-merge:

- `colors.blue` changes from `#2d5a87` to `#8b4513`
- `accent` changes from `$(colors.cyan)` (the ocean cyan) to `$(colors.cyan)` (the sunset orange -- same expression, different resolved value)
- `std.bg` changes to `#1a1008`
- Everything else -- `std.fg`, `std.bg.panel`, `scope.keyword`, all of it -- **recalculates automatically** from the new values

You only override what changes. The derived values cascade.

## Building Both

Build both themes in one command:

<CodeBlock lang="shell"shell">{`

  npx @gesslar/sassy build ocean.yaml sunset.yaml

`}</CodeBlock>

Each gets its own `.color-theme.json` output. Same structure, completely different feel.

## Sharing tokenColors Too

If your themes use identical tokenColors, extract them into a shared file:

**shared/tokens.yaml**:

<CodeBlock lang="yaml">{`

  theme:
    tokenColors:
      - name: Comments
        scope: comment
        settings:
          foreground: $(scope.comment)
      - name: Keywords
        scope: keyword
        settings:
          foreground: $(scope.keyword)
      - name: Strings
        scope: string
        settings:
          foreground: $(scope.string)
      - name: Numbers
        scope: constant.numeric
        settings:
          foreground: $(scope.number)
      - name: Functions
        scope: entity.name.function
        settings:
          foreground: $(scope.function)
      - name: Types
        scope: entity.name.type
        settings:
          foreground: $(scope.type)

`}</CodeBlock>

Then both themes import it:

<CodeBlock lang="yaml">{`

  config:
    import:
      - "./shared/variables.yaml"
      - "./shared/tokens.yaml"

`}</CodeBlock>

Remember: tokenColors from imports append in order, and the main file's tokenColors come last. This lets you add theme-specific overrides after the shared rules.

## Watch Mode with Multiple Themes

During development, watch all your themes at once:

<CodeBlock lang="shell"shell">{`

  npx @gesslar/sassy build --watch ocean.yaml sunset.yaml

`}</CodeBlock>

Edit `shared/variables.yaml` and both themes rebuild. Edit a palette override in `sunset.yaml` and only that theme rebuilds. Sassy tracks dependencies and rebuilds only what changed.

## Next Steps

So far every colour has been a hex code. But Sassy supports far more expressive colour formats -- and some of them are genuinely better for theme design.
