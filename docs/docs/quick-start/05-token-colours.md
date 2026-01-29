---
sidebar_position: 5
title: "Syntax Highlighting"
---

import CodeBlock from "@site/src/components/CodeBlock"

So far we've styled the VS Code UI. Now let's colour the actual code.

## Token Colours

VS Code uses **TextMate scopes** to identify parts of your code — keywords, strings, comments, function names, and so on. You style them with `tokenColors` entries, each containing a `name`, `scope`, and `settings`.

Add a `tokenColors` section inside `theme`:

<CodeBlock lang="yaml">{`

  theme:
    tokenColors:
      - name: Comments
        scope: comment
        settings:
          foreground: $(std.fg.inactive)
          fontStyle: italic

      - name: Keywords
        scope: keyword, storage.type
        settings:
          foreground: $(accent)

      - name: Strings
        scope: string
        settings:
          foreground: $(colors.green)

      - name: Numbers
        scope: constant.numeric
        settings:
          foreground: $(colors.yellow)

      - name: Functions
        scope: entity.name.function
        settings:
          foreground: $(colors.cyan)

      - name: Classes
        scope: entity.name.class, entity.name.type
        settings:
          foreground: $(colors.blue)
          fontStyle: bold

`}</CodeBlock>

## How Scopes Work

Each `scope` is a TextMate grammar selector. VS Code matches them against the tokens in your code:

- `comment` matches all comments
- `keyword` matches `if`, `return`, `import`, etc.
- `string` matches string literals
- `entity.name.function` matches function declarations

Comma-separated scopes (like `keyword, storage.type`) apply the same style to multiple scopes. VS Code uses the first matching rule, so order can matter for overlapping scopes.

The `settings` block supports:

- `foreground` — the text colour
- `fontStyle` — `italic`, `bold`, `underline`, or combinations like `bold italic`

## Build It

<CodeBlock lang="shell"shell">{`

  npx @gesslar/sassy build ocean.yaml

`}</CodeBlock>

To see the result, install the theme in VS Code and open a source file. Comments should appear faded and italic, keywords in your accent colour, strings in green, and so on.

:::tip
Use VS Code's **Developer: Inspect Editor Tokens and Scopes** command (from the Command Palette) to see exactly which scopes apply to any token in your code. This is invaluable when fine-tuning syntax highlighting.
:::

The theme is starting to look real. Let's finish it off with UI polish.
