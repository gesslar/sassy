---
sidebar_position: 2
title: "Architecture Overview"
---

import CodeBlock from "@site/src/components/CodeBlock"

## Compilation Pipeline

Sassy uses a phase-based compilation pipeline to transform YAML/JSON5 theme
definitions into VS Code `.color-theme.json` files:

1. **Import Resolution** — load and merge modular theme files. Objects (vars,
   colours, semanticTokenColors) are deep-merged; arrays (tokenColors) are
    appended. The main file is applied last, giving it override semantics.
2. **Variable Decomposition** — flatten nested objects into dot-notation paths
    (e.g., `{std: {bg: "#1a1a2e"}}` becomes `[{flatPath: "std.bg", value: "#1a1a2e"}]`).
3. **Token Evaluation** — resolve `$(variable)` references via the ThemePool
   registry. Variables are resolved first (self-contained), then theme entries
   resolve against the union of variables and other theme entries.
4. **Function Application** — execute colour functions (`lighten`, `darken`,
   `mix`, etc.) backed by Culori.
5. **Dependency Resolution** — the ThemePool builds a token dependency graph
   and resolves values in order, tracking resolution trails for debugging.
6. **Theme Assembly** — recompose flat paths into the nested VS Code theme JSON
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
