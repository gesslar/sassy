---
sidebar_position: 2
title: "Building a Design System"
---

import CodeBlock from "@site/src/components/CodeBlock"

You've split your theme into files. Now let's make that shared variables file actually worth sharing. The goal: a layered system where raw palette colours feed into semantic tokens, and semantic tokens feed into your theme.

## The Three Layers

A well-structured theme has three layers:

1. **Palette** — raw colour values in a dedicated `palette` section, with no opinion about usage
2. **Semantic tokens** — meaning-based names under `vars` that reference the palette via `$$`
3. **Scope mappings** — syntax highlighting colours that reference semantic tokens

Here's what that looks like in practice:

**shared/palette.yaml**:

<CodeBlock lang="yaml">{`

  palette:
    blue: "#2d5a87"
    cyan: "#4a9eff"
    gray: "#808080"
    white: "#e0e0e0"
    red: "#e74c3c"
    green: "#a8d8a8"
    yellow: "#f0c674"

`}</CodeBlock>

**shared/variables.yaml**:

<CodeBlock lang="yaml">{`

  vars:
    # Semantic tokens -- what colours mean
    accent: $$cyan
    main: $$white

    std:
      fg: $(main)
      fg.accent: $(accent)
      fg.inactive: fade($(std.fg), 60)
      fg.muted: fade($(std.fg), 40)
      bg: "#1a1a2e"
      bg.accent: darken($(accent), 70)
      bg.panel: lighten($(std.bg), 15)
      bg.panel.inner: lighten($(std.bg.panel), 10)
      outline: fade($(accent), 30)
      shadow: fade($(std.bg), 80)

    status:
      error: $$red
      warning: $$yellow
      success: $$green
      info: $$cyan

    # Scope mappings -- syntax concepts to colours
    scope:
      comment: $(std.fg.inactive)
      keyword: $(accent)
      string: $$green
      number: $$yellow
      function: $$cyan
      type: $$blue

`}</CodeBlock>

## Why This Structure Matters

The `palette` section is a first-class citizen — it's declarative, self-contained, and evaluated before anything else. It cannot reach into `vars` or `theme`, which keeps your colour definitions clean and predictable.

The `scope.*` variables decouple syntax highlighting from your palette. Your `tokenColors` entries reference `$(scope.keyword)`, not `$$cyan`. If you later decide keywords should be yellow, you change one line in the scope mappings. Every tokenColors rule that uses `$(scope.keyword)` updates automatically.

The same principle applies to the semantic layer. `$(std.fg.inactive)` is defined as `fade($(std.fg), 60)`. If you change `$(main)` from white to cream, every derived colour -- foreground, inactive, muted -- recalculates.

This is the parametric design philosophy: **meaning over hex codes**. You describe _what_ a colour represents, not _what_ it literally is.

## Using It in Your Theme

Your main theme file stays clean:

<CodeBlock lang="yaml">{`

  config:
    name: "Ocean"
    type: dark
    import:
      - "./shared/palette.yaml"
      - "./shared/variables.yaml"

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

Every colour in the theme traces back to a named concept. Read it and you know exactly what each value _means_.

## Next Steps

Here's where this design system really pays off: what if you could swap the palette and get an entirely different theme, with the same structure? That's next.
