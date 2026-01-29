---
sidebar_position: 4
title: "Compiler"
---

import CodeBlock from "@site/src/components/CodeBlock"

`Compiler.js` runs the compilation pipeline. It receives a `Theme` instance and
processes it through all phases.

## Pipeline

1. **Process `config`** — decompose and evaluate the config section (schema,
   name, type, imports).
2. **Load imports** — resolve `config.import` entries. Each import file is
   loaded (with cache support) and its contents merged into the working data.
3. **Merge** — deep-merge imported data with the main source. Objects (vars,
   colours, semanticTokenColors) are merged; arrays (tokenColors) are appended.
   The main file always applies last.
4. **Decompose vars** — flatten the merged `vars` object into `[{flatPath, value}]`
   arrays.
5. **Evaluate vars** — variables resolved only against other variables (self-
   contained scope).
6. **Evaluate theme scopes** — colours, tokenColors, and semanticTokenColors
   each decomposed and evaluated against the union of resolved vars plus their
   own entries.
7. **Assemble output** — reduce flat paths back into nested VS Code JSON
   structure. Combine header, custom config, colours, tokenColors, and
   semanticTokenColors.

## Import Processing

<CodeBlock lang="javascript">{`

  const imports = recompConfig.import ?? []

`}</CodeBlock>

Each import filename is resolved relative to the entry file's directory. Files are loaded through the theme's cache (`Cache.loadCachedData`) for mtime-based invalidation.

Merge behaviour:

- **Objects** (vars, colours, semanticTokenColors): deep-merged via `Data.mergeObject`
- **Arrays** (tokenColors): appended — imports first, then main source entries
- **Main file last**: the entry file's values always override imported values

## Decomposition

Nested objects are flattened to dot-notation paths:

<CodeBlock lang="javascript">{`

  {std: {bg: "#1a1a2e", bg.panel: "#242440"}}

`}</CodeBlock>

becomes:

<CodeBlock lang="javascript">{`

  [
    {flatPath: "std.bg", value: "#1a1a2e"},
    {flatPath: "std.bg.panel", value: "#242440"}
  ]

`}</CodeBlock>

This flat representation enables uniform token evaluation across all scopes. After evaluation, the flat entries are reduced back into the nested structure expected by VS Code.
