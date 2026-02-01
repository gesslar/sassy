---
sidebar_position: 3
title: "Token Colors"
---

import CodeBlock from "@site/src/components/CodeBlock"

`tokenColors` is the syntax highlighting layer. It controls how source code is painted — keywords, strings, comments, function names, operators, and everything else that makes code readable at a glance.

## Structure

`tokenColors` is an **array** of rules. Each rule has three fields:

<CodeBlock lang="json">{`
{
  "tokenColors": [
    {
      "name": "Comments",
      "scope": "comment",
      "settings": {
        "foreground": "#5c6370",
        "fontStyle": "italic"
      }
    },
    {
      "name": "Keywords",
      "scope": "keyword, storage.type",
      "settings": {
        "foreground": "#c678dd"
      }
    }
  ]
}
`}</CodeBlock>

| Field | Type | Required | Purpose |
|-------|------|----------|---------|
| `name` | string | No | Human-readable label (not used by VS Code at runtime) |
| `scope` | string | Yes | TextMate scope selector (comma-separated for multiple) |
| `settings` | object | Yes | Styling to apply |

The `settings` object supports two properties:

| Property | Type | Example | Purpose |
|----------|------|---------|---------|
| `foreground` | hex string | `"#c678dd"` | Text colour |
| `fontStyle` | string | `"italic"`, `"bold"`, `"underline"`, `"bold italic"` | Font decoration (space-separated for combinations) |

## TextMate Scopes

VS Code uses **TextMate grammars** to tokenise source code. Each token in your code is assigned one or more scopes — dot-separated identifiers that describe what the token is.

For example, the keyword `if` in JavaScript might have the scope `keyword.control.conditional.js`. A string literal might be `string.quoted.double.js`.

Common top-level scopes:

| Scope | What It Matches |
|-------|-----------------|
| `comment` | All comments |
| `keyword` | Language keywords (`if`, `return`, `import`, `class`) |
| `storage` | Storage modifiers (`const`, `let`, `var`, `static`) |
| `string` | String literals |
| `constant` | Constants (`true`, `false`, `null`, numbers) |
| `entity.name.function` | Function/method names at declaration |
| `entity.name.class` | Class names |
| `entity.name.type` | Type names |
| `variable` | Variables |
| `variable.parameter` | Function parameters |
| `punctuation` | Brackets, commas, semicolons |
| `support.function` | Built-in/library functions |

Scopes are hierarchical. `keyword.control` is a child of `keyword`. A rule matching `keyword` will also match `keyword.control`, `keyword.operator`, and any other `keyword.*` scope.

:::tip
Use VS Code's **Developer: Inspect Editor Tokens and Scopes** command (Ctrl+Shift+P or Cmd+Shift+P), then click on any token in your code. A tooltip appears near the click site showing the token's scope stack. This is the single most useful tool for writing token colour rules.
:::

## First-Match Semantics

VS Code evaluates `tokenColors` rules **top to bottom** and stops at the **first match**. This has two important consequences:

### Order Matters

If a broad scope appears before a specific scope, the specific rule never fires:

<CodeBlock lang="json">{`
{
  "tokenColors": [
    {
      "name": "All Keywords",
      "scope": "keyword",
      "settings": { "foreground": "#c678dd" }
    },
    {
      "name": "Control Keywords",
      "scope": "keyword.control",
      "settings": { "foreground": "#e06c75", "fontStyle": "bold" }
    }
  ]
}
`}</CodeBlock>

The second rule is dead code. `keyword` matches before `keyword.control` gets a chance.

**Fix:** Put specific scopes before broad ones:

<CodeBlock lang="json">{`
{
  "tokenColors": [
    {
      "name": "Control Keywords",
      "scope": "keyword.control",
      "settings": { "foreground": "#e06c75", "fontStyle": "bold" }
    },
    {
      "name": "All Keywords",
      "scope": "keyword",
      "settings": { "foreground": "#c678dd" }
    }
  ]
}
`}</CodeBlock>

### Comma-Separated Scopes Share Settings

Multiple scopes in a single rule all receive the same styling:

<CodeBlock lang="json">{`
{
  "scope": "keyword, storage.type, storage.modifier",
  "settings": { "foreground": "#c678dd" }
}
`}</CodeBlock>

This is a convenience — it's equivalent to three separate rules with the same settings.

## Gotchas

### No Background Colour

Unlike `colors`, the `settings` object in `tokenColors` does **not** support `background`. You can set `foreground` and `fontStyle` only. If you want to highlight a region of code with a background colour, that's done through `colors` keys like `editor.selectionBackground` or through editor decorations, not `tokenColors`.

### fontStyle Resets

Setting `fontStyle` to an empty string (`""`) explicitly removes all font styles. This is different from omitting `fontStyle`, which inherits the default. Use this when a broad rule sets italic and you want a more specific rule to undo it.

### Scope Specificity Is Not CSS

TextMate scope matching is simpler than CSS specificity. There's no scoring system — it's purely positional (first match wins). If you're coming from CSS, forget specificity. Think in terms of rule order.

### Language-Specific Scopes

Some grammars append a language suffix: `keyword.control.js`, `string.quoted.double.python`. You can target these specifically, but broad scopes like `keyword` already match them. Language suffixes are mostly useful when you want one language styled differently from others.

## In Sassy

Sassy's `tokenColors` maps directly to the VS Code structure. The main difference is variable references and colour functions in the values:

<CodeBlock lang="yaml">{`

  # Raw VS Code JSON
  # {
  #   "name": "Comments",
  #   "scope": "comment",
  #   "settings": {
  #     "foreground": "#5c6370",
  #     "fontStyle": "italic"
  #   }
  # }

  # Sassy equivalent
  theme:
    tokenColors:
      - name: Comments
        scope: comment
        settings:
          foreground: $(std.fg.inactive)
          fontStyle: italic

`}</CodeBlock>

The structure is identical — an array of objects with `name`, `scope`, and `settings`. Sassy resolves the variable references and colour functions, then writes the standard JSON array that VS Code expects.

:::tip
Sassy's linter (`sassy lint`) detects duplicate scopes and precedence issues automatically. Run it to catch dead rules before they confuse you.
:::
