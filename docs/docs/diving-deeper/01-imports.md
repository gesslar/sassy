---
sidebar_position: 1
title: "Splitting Into Files"
---

import CodeBlock from "@site/src/components/CodeBlock"

Your ocean theme works. It builds, it looks great, everything lives in one
file. That's fine for a small theme, but as your design grows, a single file
gets unwieldy. Let's fix that.

## The Import System

Sassy lets you split your theme across multiple files using `config.import`.
Each import path is resolved relative to the main theme file.

Here's the idea: extract your `palette` and `vars` into shared files, and keep the main theme file focused on structure.

**ocean.yaml** (trimmed down):

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
      editorCursor.foreground: $(accent)
      sideBar.background: $(std.bg.panel)
      activityBar.background: $(std.bg.panel)

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

`}</CodeBlock>

**shared/palette.yaml**:

<CodeBlock lang="yaml">{`

  palette:
    cyan: "#4a9eff"
    white: "#e0e0e0"
    green: "#a8d8a8"

`}</CodeBlock>

**shared/variables.yaml**:

<CodeBlock lang="yaml">{`

  vars:
    accent: $$cyan
    main: $$white

    std:
      fg: $(main)
      bg: "#1a1a2e"
      bg.panel: lighten($(std.bg), 15)

    scope:
      comment: fade($(std.fg), 60)
      keyword: $(accent)
      string: $$green

`}</CodeBlock>

Build it the same way you always have:

<CodeBlock lang="bash">{`

  npx @gesslar/sassy build ocean.yaml

`}</CodeBlock>

The output is identical. The organisation is just better.

## How Merging Works

When Sassy processes imports, it follows two rules:

1. **Objects deep-merge.** If both the imported file and the main file define `vars.std.bg` (or `palette.cyan`), the main file's value wins. Later values override earlier ones at every nesting level.

2. **Arrays append.** If both files define `tokenColors`, the imported entries come first, followed by the main file's entries. Nothing gets replaced -- both sets appear in the output. Applying these as fallbacks to whatever is missing or not covered by the imports.

This means you can define a base set of `tokenColors` in a shared file, then add theme-specific rules in the main file. They all end up in the final output, in order, with the first matching rule winning.

## Import Order Matters

You can import multiple files:

<CodeBlock lang="yaml">{`

  config:
    import:
      - "./shared/palette.yaml"
      - "./shared/tokens.yaml"

`}</CodeBlock>

They are processed in order. If both files define `vars.accent`, the second file's value wins. Then the main theme file gets the final say over everything.

Think of it as layers: each import paints over the previous one, and the main file paints over all of them.

## Next Steps

Now that your variables live in their own file, you can build a proper design system around them. That's exactly what we'll do next.
