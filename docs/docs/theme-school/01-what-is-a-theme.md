---
sidebar_position: 1
title: "What Is a VS Code Theme?"
---

import CodeBlock from "@site/src/components/CodeBlock"

A VS Code colour theme is a single JSON file that tells the editor how to paint everything you see — the UI chrome, the syntax highlighting, and (optionally) language-aware token styling. Understanding this file is the foundation of everything Sassy does.

## The File

A theme is a `.color-theme.json` file with up to five root keys:

<CodeBlock lang="json">{`
{
  "$schema": "vscode://schemas/color-theme",
  "name": "My Theme",
  "type": "dark",
  "colors": {},
  "tokenColors": [],
  "semanticTokenColors": {}
}
`}</CodeBlock>

| Key | Type | Required | Purpose |
|-----|------|----------|---------|
| `$schema` | string | No | Enables validation and autocomplete in VS Code |
| `name` | string | Yes | Display name in the theme picker |
| `type` | `"dark"` \| `"light"` | Yes | Tells VS Code which base UI defaults to use |
| `semanticHighlighting` | boolean | No | Enables semantic token highlighting (see below) |
| `colors` | object | No | UI chrome colours (editor, sidebar, status bar, etc.) |
| `tokenColors` | array | No | Syntax highlighting via TextMate scopes |
| `semanticTokenColors` | object | No | Language-aware token styling via language servers |

Nothing beyond `name` and `type` is strictly required. An empty `colors` object produces a valid theme — VS Code fills in defaults from the base type. In practice, most themes define all three sections.

## The Three Layers

VS Code themes paint in three distinct layers, each with different mechanics:

### 1. Colors — The UI Chrome

`colors` controls every non-code surface: the editor background, sidebar, status bar, borders, badges, buttons, scrollbars, and hundreds more. Each key is a dot-separated identifier defined by VS Code.

This is the most straightforward layer — flat key-value pairs mapping identifiers to hex colours.

### 2. Token Colors — Syntax Highlighting

`tokenColors` controls how source code is painted. It uses **TextMate grammars** — the same system VS Code inherited from TextMate and Sublime Text. Each rule matches a scope (like `keyword` or `string.quoted.double`) and applies a foreground colour and/or font style.

This layer is array-ordered and uses first-match semantics, which has implications for how you structure rules.

### 3. Semantic Token Colors — Language-Aware Styling

`semanticTokenColors` is the newest and most precise layer. Instead of pattern-matching grammar scopes, it uses **semantic tokens** provided by language servers. A language server understands your code's meaning — it knows whether `foo` is a variable declaration, a function call, or a parameter.

When a language server is active, semantic tokens **override** matching TextMate scopes. When no language server is available (plain text, unsupported languages), TextMate scopes are the fallback.

:::warning
Custom themes must set `"semanticHighlighting": true` at the root of the theme file for `semanticTokenColors` to take effect. Without it, VS Code ignores your semantic token rules. Only built-in themes (like "Dark+") have this enabled by default. In Sassy, add this to `config.custom` in your theme configuration.
:::

## How They Interact

<CodeBlock lang="text">{`
  Priority (highest to lowest):

  1. semanticTokenColors  — language server tokens (when available)
  2. tokenColors           — TextMate grammar scopes (always available)
  3. colors                — UI chrome (independent of the other two)
`}</CodeBlock>

The `colors` layer is independent — it never overlaps with the token layers. But `tokenColors` and `semanticTokenColors` both target code, and semantic tokens win when both apply to the same token.

This means:

- **`tokenColors` is your baseline.** Every theme should have solid TextMate rules.
- **`semanticTokenColors` is precision.** Use it to override specific cases where the language server provides better information than the grammar.
- **You don't need `semanticTokenColors` at all.** Many excellent themes ship without it.

## What Sassy Changes

Sassy doesn't change what VS Code expects — it changes how you author it. Instead of maintaining a 1000-line JSON file full of disconnected hex codes, you write a structured source file with variables, palette definitions, and colour functions. Sassy compiles it into the standard `.color-theme.json` that VS Code reads.

The output is identical to a hand-written theme. VS Code never knows the difference.

The following pages dive into each layer in detail — what it expects, common patterns, gotchas, and how Sassy maps to each.
