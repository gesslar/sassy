---
sidebar_position: 2
title: "Architecture Overview"
---

import CodeBlock from "@site/src/components/CodeBlock"

## Compilation Pipeline

Sassy uses a phase-based compilation pipeline to transform YAML/JSON5 theme
definitions into VS Code `.color-theme.json` files:

1. **Import Resolution** — load and merge modular theme files. Objects (palette,
   vars, colours, semanticTokenColors) are deep-merged; arrays (tokenColors)
   are appended. The main file is applied last, giving it override semantics.
2. **Palette Alias Expansion** — expand `$$name` shorthand to `$palette.name`
   in all values before resolution begins.
3. **Palette Decomposition & Evaluation** — flatten the `palette` object (prefixed
   as `palette.*`) and resolve it in isolation. Palette cannot reference `vars`
   or `theme` — only its own entries.
4. **Variable Decomposition & Evaluation** — flatten `vars` and resolve against
   the union of palette and variables.
5. **Token Evaluation** — resolve `$(variable)` references via the ThemePool
   registry. Theme entries (colours, tokenColors, semanticTokenColors) resolve
   against the union of palette, variables, and other theme entries.
6. **Function Application** — execute colour functions (`lighten`, `darken`,
   `mix`, etc.) backed by Culori.
7. **Dependency Resolution** — the ThemePool builds a token dependency graph
   and resolves values in order, tracking resolution trails for debugging.
8. **Theme Assembly** — recompose flat paths into the nested VS Code theme JSON
   structure.

## Class Relationships

```text
CLI → Session → Theme → Compiler → Evaluator
                  ↓                    ↓
                Theme.js           ThemePool ← ThemeToken
                  ↓                    ↓
               chokidar             Colour.js
```

## Session

`Session` orchestrates the processing of multiple theme entry files. It uses
`Promise.allSettled` so that one theme failing does not halt the others. Each
`Theme` instance manages its own lifecycle independently — loading, compiling,
writing, and watching are all self-contained per entry file.

## Error Propagation

Errors are wrapped in `Sass` instances (from `@gesslar/toolkit`) with trace
context chains that accumulate as errors propagate up through the pipeline.
This gives structured, multi-layer error reports rather than bare stack traces.
