---
sidebar_position: 4
title: "Semantic Token Colors"
---

import CodeBlock from "@site/src/components/CodeBlock"

`semanticTokenColors` is the newest and least understood theme layer. It provides language-aware styling powered by **language servers** rather than TextMate grammars. Where `tokenColors` pattern-matches against syntax, `semanticTokenColors` styles based on *meaning*.

## Why It Exists

TextMate grammars are powerful but limited. They parse code as text patterns — they don't understand what the code *means*. Consider this JavaScript:

<CodeBlock lang="javascript">{`
  const name = "hello"
  console.log(name)
`}</CodeBlock>

A TextMate grammar sees `name` on both lines as a generic `variable`. It can't tell you that the first is a **declaration** and the second is a **reference**. It can't distinguish a **readonly** variable from a mutable one, or a **local** variable from a **global** one.

A language server can. It performs full semantic analysis — type checking, scope resolution, symbol tracking. Semantic tokens expose this information to the theme.

## Structure

`semanticTokenColors` is an **object** (not an array like `tokenColors`). Each key is a **semantic token selector**, and values can be either a string or an object:

<CodeBlock lang="json">{`
{
  "semanticTokenColors": {
    "variable.declaration": {
      "foreground": "#e6e6e6",
      "fontStyle": "italic"
    },
    "function.declaration": {
      "foreground": "#56b6c2",
      "fontStyle": "bold"
    },
    "string:escape": "#ffd93d"
  }
}
`}</CodeBlock>

### Value Forms

| Form | Example | Meaning |
|------|---------|---------|
| **String** | `"#ffd93d"` | Shorthand — sets `foreground` only |
| **Object** | `{"foreground": "#e6e6e6", "fontStyle": "italic"}` | Full control over `foreground` and/or `fontStyle` |

Both forms are valid. The string form is a convenience for when you only need to set the colour.

## Semantic Token Selectors

Selectors follow the pattern: `type.modifier:language`

| Component | Required | Example | Purpose |
|-----------|----------|---------|---------|
| `type` | Yes | `variable`, `function`, `parameter` | The kind of token |
| `.modifier` | No | `.declaration`, `.readonly`, `.async` | Refines the type |
| `:language` | No | `:javascript`, `:python` | Targets a specific language |

### Common Token Types

| Type | What It Targets |
|------|-----------------|
| `variable` | Variables |
| `variable.declaration` | Variable declarations specifically |
| `variable.readonly` | Constants and readonly variables |
| `function` | Function references |
| `function.declaration` | Function declarations |
| `parameter` | Function parameters |
| `property` | Object properties |
| `property.readonly` | Readonly properties |
| `class` | Class references |
| `class.declaration` | Class declarations |
| `interface` | Interface references |
| `type` | Type references |
| `enum` | Enum types |
| `enumMember` | Enum members |
| `namespace` | Namespaces/modules |
| `string` | String tokens |
| `string:escape` | Escape sequences within strings |
| `comment` | Comments |
| `keyword` | Keywords |
| `number` | Numeric literals |
| `operator` | Operators |
| `decorator` | Decorators/annotations |
| `macro` | Macros (Rust, C/C++) |

### Modifiers

Modifiers refine a token type. Multiple modifiers can be combined:

| Modifier | Meaning |
|----------|---------|
| `.declaration` | Where the symbol is declared |
| `.definition` | Where the symbol is defined (similar to declaration) |
| `.readonly` | Immutable (`const`, `final`, `readonly`) |
| `.static` | Static members |
| `.async` | Async functions/methods |
| `.deprecated` | Deprecated symbols (often paired with strikethrough) |
| `.modification` | Where a variable is modified |
| `.documentation` | Documentation comments |
| `.defaultLibrary` | Standard library symbols |

<CodeBlock lang="json">{`
{
  "semanticTokenColors": {
    "variable.readonly": "#e5c07b",
    "function.async": { "fontStyle": "italic" },
    "class.deprecated": { "fontStyle": "strikethrough" },
    "function.declaration:python": { "foreground": "#61afef" }
  }
}
`}</CodeBlock>

### The Colon Separator

The `:` separator targets specific languages. `string:escape` is a special case — it's not a language filter but a well-known compound token type for escape sequences inside strings.

## How It Overrides tokenColors

When a language server is active and provides semantic tokens, VS Code applies them **on top of** TextMate scopes. The override is per-token:

1. VS Code first applies the matching `tokenColors` rule (TextMate)
2. If a `semanticTokenColors` entry also matches, its properties **override** the TextMate result
3. Properties not set by `semanticTokenColors` are kept from the `tokenColors` match

This means:

<CodeBlock lang="json">{`
{
  "tokenColors": [
    {
      "scope": "variable",
      "settings": { "foreground": "#abb2bf" }
    }
  ],
  "semanticTokenColors": {
    "variable.readonly": { "fontStyle": "bold" }
  }
}
`}</CodeBlock>

A readonly variable gets `foreground: #abb2bf` from `tokenColors` **and** `fontStyle: bold` from `semanticTokenColors`. The semantic layer adds to the TextMate base rather than replacing it entirely.

## Gotchas

### You Must Opt In

This is the single most common reason semantic token colours don't work: custom themes must explicitly enable semantic highlighting by setting `"semanticHighlighting": true` at the root of the theme JSON.

<CodeBlock lang="json">{`
{
  "name": "My Theme",
  "type": "dark",
  "semanticHighlighting": true,
  "colors": {},
  "tokenColors": [],
  "semanticTokenColors": {}
}
`}</CodeBlock>

Without this flag, VS Code treats your `semanticTokenColors` entries as if they don't exist. Only VS Code's built-in themes (like "Dark+" and "Light+") have this enabled by default. Every other theme must opt in.

The user setting `editor.semanticHighlighting.enabled` also plays a role. When set to `configuredByTheme` (the default), it defers to the theme's `semanticHighlighting` property. Users can override this to `true` or `false` to force semantic highlighting on or off regardless of the theme.

In Sassy, you enable this via `config.custom`:

<CodeBlock lang="yaml">{`

  config:
    name: "My Theme"
    type: dark
    custom:
      semanticHighlighting: true

`}</CodeBlock>

### Not All Languages Have Semantic Tokens

Semantic tokens require a language server that supports the `textDocument/semanticTokens` capability. Most popular languages have this (TypeScript, Python, Rust, Go, Java, C#, C/C++), but some don't. For those languages, `semanticTokenColors` has no effect and `tokenColors` is all you've got.

### Object vs String Merge Behaviour

When defining `semanticTokenColors` across imports, the merge behaviour depends on value type:

- **String values** are replaced entirely by later definitions
- **Object values** are deep-merged — you can override just `fontStyle` in an import while keeping `foreground` from the base

### Discovering Available Tokens

Unlike TextMate scopes (which you can inspect with **Developer: Inspect Editor Tokens and Scopes**), semantic tokens are harder to discover. The same inspector command shows semantic token information when available — look for the "semantic token type" and "semantic token modifiers" fields in the inspector popup.

### The Empty fontStyle Trick

Just like with `tokenColors`, setting `fontStyle` to `""` (empty string) explicitly clears all font styling. This is useful when you want semantic tokens to strip italic or bold from a TextMate base rule.

## In Sassy

Sassy maps `semanticTokenColors` under `theme.semanticTokenColors`. Both value forms are supported:

<CodeBlock lang="yaml">{`

  # Raw VS Code JSON
  # "semanticTokenColors": {
  #   "variable.declaration": {
  #     "foreground": "#e6e6e6",
  #     "fontStyle": "italic"
  #   },
  #   "string:escape": "#ffd93d"
  # }

  # Sassy equivalent
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

Variable references, palette aliases, and colour functions work in both the string form and inside object properties. Sassy resolves everything to hex and writes the standard VS Code structure.

:::tip
Use `sassy resolve --semanticTokenColor variable.declaration my-theme.yaml` to trace how a semantic token value is resolved through your variable chain. This is especially helpful when debugging imported themes with overrides.
:::
