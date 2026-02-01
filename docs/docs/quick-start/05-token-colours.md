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

<CodeBlock lang="bash">{`

  npx @gesslar/sassy build ocean.yaml

`}</CodeBlock>

To see the result, install the theme in VS Code and open a source file. Comments should appear faded and italic, keywords in your accent colour, strings in green, and so on.

:::tip
Use VS Code's **Developer: Inspect Editor Tokens and Scopes** command (from the Command Palette) to see exactly which scopes apply to any token in your code. This is invaluable when fine-tuning syntax highlighting.
:::

## Semantic Token Colours

VS Code also supports **semantic tokens** — language-aware tokens provided by language servers rather than TextMate grammars. These are more precise: a language server knows the difference between a variable *declaration* and a variable *reference*, for example.

You style them with `semanticTokenColors`. Each key is a semantic token selector, and values can be either a string (shorthand for foreground) or an object with `foreground` and/or `fontStyle`:

<CodeBlock lang="yaml">{`

  theme:
    semanticTokenColors:
      variable.declaration:
        foreground: $(std.fg)
        fontStyle: italic
      function.declaration:
        foreground: $(accent)
        fontStyle: bold
      "string:escape": $$yellow

`}</CodeBlock>

:::tip
Semantic tokens override `tokenColors` when a language server is active. Use `tokenColors` as the baseline and `semanticTokenColors` for precision where it matters.
:::

The theme is starting to look real. Let's finish it off with UI polish.
