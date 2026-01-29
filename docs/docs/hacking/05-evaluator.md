---
sidebar_position: 5
title: "Evaluator"
---

import CodeBlock from "@site/src/components/CodeBlock"

`Evaluator.js` handles variable substitution and colour function dispatch
during theme compilation.

## Regex Patterns

Two static patterns drive token detection:

- **`Evaluator.sub`** — matches variable references in three syntaxes: `$(var)`,
  `$var`, `${var}`
- **`Evaluator.func`** — matches function calls: `functionName(args)`

## evaluate(decomposed)

The main entry point. Takes an array of `{flatPath, value}` entries and
resolves them in-place.

Resolution is iterative:

1. Loop through all entries, calling `#evaluateValue()` on each string value.
2. `#evaluateValue()` dispatches based on the value's form:
   - **Hex literal** → `#resolveHex` (pass through)
   - **Variable reference** (`$(...)`) → `#resolveVariable` (look up in pool)
   - **Function call** (`func(...)`) → `#resolveFunction` (dispatch to colour
     function)
   - **Otherwise** → `#resolveLiteral`
3. Repeat passes until no unresolved tokens remain or `maxIterations` (10) is
   reached.
4. If max iterations are exhausted, a `Sass` error is thrown listing the
   unresolved tokens. This catches circular references.

## Function Dispatch

`#resolveFunction` parses the function call and delegates to `#colourFunction`,
which switches on the function name:

| Function | Description |
|---|---|
| `lighten` | Lighten a colour by a percentage |
| `darken` | Darken a colour by a percentage |
| `fade` | Reduce alpha (increase transparency) |
| `solidify` | Increase alpha (reduce transparency) |
| `alpha` | Set alpha to a specific value |
| `invert` | Invert a colour |
| `mix` | Mix two colours with a ratio |
| `css` | Output as CSS colour string |

The `default` case passes the raw expression to `Colour.toHex()` as a Culori
passthrough — any valid Culori colour expression works.

**This switch statement is the extension point for adding new colour functions.**

## ThemePool Integration

Each resolution creates or updates `ThemeToken` entries in the pool:

- New tokens are created with raw value, resolved value, and kind.
- Existing tokens have their value updated and resolution trail appended.
- The pool's lookup map enables chained dependency resolution — later tokens
  can reference earlier-resolved values.
- Resolution trails are tracked for the `resolve` command's debugging output.
