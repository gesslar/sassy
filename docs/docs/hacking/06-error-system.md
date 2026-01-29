---
sidebar_position: 6
title: "Error System"
---

import CodeBlock from "@site/src/components/CodeBlock"

Sassy's error handling is provided by `@gesslar/toolkit` through two classes:
**Sass** and **Tantrum**.

## Sass

An enhanced `Error` with trace context chains. Rather than relying solely on
JavaScript stack traces, Sass errors accumulate domain-specific context as they
propagate up through the pipeline.

<CodeBlock lang="javascript">{`

  Sass.new("Variable not found")
    .trace("evaluating $(unknown.var)")
    .trace("in theme.colors['editor.background']")
    .trace("compiling ocean-theme.yaml")

`}</CodeBlock>

### Key Methods

- **`.addTrace(message)` / `.trace(message)`** — add a context layer. Traces
  are stored LIFO (most recent first when reading).
- **`.report(nerdMode)`** — format for terminal output.
  - **Default mode**: clean multi-line trace showing domain context only.
  - **Nerd mode** (`--nerd` flag): adds pruned JavaScript stack frames
    alongside domain context.

### Usage Pattern

Errors are caught at each layer and re-wrapped with additional context:

<CodeBlock lang="javascript">{`

  try {
      // compilation work
    } catch(error) {
      throw Sass.new(\`Compiling \${theme.getName()}\`, error)
    }

`}</CodeBlock>

This builds a chain of context from the point of failure up to the session level.

## Tantrum

An `AggregateError` that auto-wraps plain `Error` instances in `Sass`. Used when multiple errors need to be reported together.

- Collects errors from parallel operations
- `.report(nerdMode)` formats all contained errors

## Per-Theme Isolation

`Session` uses `Promise.allSettled` to process themes. A failure in one theme produces a Sass-wrapped error report for that theme without halting compilation of the others. This is the primary consumer of Tantrum — when multiple themes fail, their errors are aggregated.
