---
sidebar_position: 7
title: "Extending Sassy"
---

import CodeBlock from "@site/src/components/CodeBlock"

## Adding Colour Functions

The simplest extension point. Edit `Evaluator.js` and add a case to the
`#colourFunction` switch statement:

<CodeBlock lang="javascript">{`

  case "saturate":
    return Colour.saturate(args[0], args[1])

`}</CodeBlock>

Then implement the corresponding method in `Colour.js` using Culori's API. The function receives parsed arguments (colour values already resolved from variables) and must return a hex string.

Existing functions (`lighten`, `darken`, `fade`, `solidify`, `alpha`, `invert`, `mix`, `css`) all follow this pattern. The `default` case passes raw expressions to `Colour.toHex()` as a Culori passthrough, so any valid Culori colour expression already works without explicit handling.

## Adding Output Formats

`Theme.write()` currently produces VS Code `.color-theme.json`. To support other editors:

1. Add a format option to the build command configuration.
2. Create a new assembly function that transforms the compiled theme data into the target format.
3. Call the appropriate assembler in `Theme.write()` based on the format option.

Potential targets: JetBrains, Sublime Text, Alacritty, WezTerm, kitty.

The compiled theme data (colours, tokenColors, semanticTokenColors) is editor-agnostic up until the assembly phase — the variable system and colour functions work regardless of output format.

## Custom Compilation Phases

The compiler pipeline in `Compiler.js` is sequential. New phases can be inserted between existing steps:

- **Between evaluation and assembly**: contrast auto-tuning, WCAG accessibility checking, colour palette validation.
- **Post-assembly**: output transformations, format conversion, validation against VS Code's theme schema.

Each phase receives and returns the working data structures (decomposed arrays or the assembled object).

## Adding Lint Rules

Lint rules live in `src/lint/` as self-contained modules. The `Lint` engine class (in `LintCommand.js`) orchestrates them, and `LintCommand` handles terminal output.

### Architecture

Each rule module is a class with a static `run()` method that receives compiled theme data and returns an array of issue objects:

<CodeBlock lang="javascript">{`

  // src/lint/MyNewRules.js
  export default class MyNewRules {
    static ISSUE_TYPES = Object.freeze({
      MY_CHECK: "my-check",
    })

    static run(semanticTokenColors) {
      const issues = []
      // ... analyse data, push issues
      return issues
    }
  }

`}</CodeBlock>

Issue objects have this shape:

<CodeBlock lang="javascript">{`

  {
    type: MyNewRules.ISSUE_TYPES.MY_CHECK,
    severity: "high",   // "high" | "medium" | "low"
    selector: "variable.readonly",
    message: "Human-readable description of the problem",
  }

`}</CodeBlock>

### Existing modules

| Module | Operates on | Checks |
|--------|------------|--------|
| `SemanticSelectorRules` | `output.semanticTokenColors` keys | Selector syntax, token types, modifiers, duplicates |
| `SemanticValueRules` | `output.semanticTokenColors` values | Hex colours, fontStyle, empty rules, deprecated props |
| `SemanticCoherenceRules` | Full `output` object | Missing semanticHighlighting, shadowed rules |
| `TokenColorValueRules` | `output.tokenColors` array | Settings validation: hex colours, fontStyle, missing/empty settings, unknown props |
| `TokenColorStructureRules` | `output.tokenColors` array | Multiple global defaults |

Shared constants (standard token types, modifiers, selector regex, parser) live in `src/lint/SemanticConstants.js`.

### Adding a new rule module

1. Create a class in `src/lint/` with a static `run()` method and `ISSUE_TYPES`.
2. Import it in `LintCommand.js` and call it from `Lint.run()`:

<CodeBlock lang="javascript">{`

  import MyNewRules from "./lint/MyNewRules.js"

  // In Lint.run(), add to the appropriate results array:
  results[LC.SECTIONS.SEMANTIC_TOKEN_COLORS].push(
    ...MyNewRules.run(output.semanticTokenColors),
  )

`}</CodeBlock>

1. Add reporting cases to `LintCommand.#reportSingleIssue()` — the generic pattern uses `issue.message`:

<CodeBlock lang="javascript">{`

  case MyNewRules.ISSUE_TYPES.MY_CHECK: {
    Term.info(\`\${indicator} \${issue.message}\`)
    break
  }

`}</CodeBlock>

### Data available to rules

The `Lint` engine receives a compiled `Theme` and has access to:

- **Compiled output** via `theme.getOutput()` — the final JSON that becomes `.color-theme.json`. Use this for structural validation (selectors, values, coherence).
- **Source data** via `theme.getDependencies()` — raw theme data from each file before compilation. Use this for variable analysis.

### Programmatic API

API consumers can use `Lint` directly without CLI infrastructure:

<CodeBlock lang="javascript">{`

  import {Theme, Lint} from '@gesslar/sassy'
  const results = await new Lint().run(theme)

`}</CodeBlock>

Individual rule modules are also importable for targeted validation:

<CodeBlock lang="javascript">{`

  import SemanticSelectorRules from '@gesslar/sassy/lint/SemanticSelectorRules.js'
  const issues = SemanticSelectorRules.run(mySemanticTokenColors)

`}</CodeBlock>

## Philosophy

Sassy is intentionally focused on VS Code theme generation. Output format plugins are the recommended extension path for supporting other editors — the core compilation pipeline should remain editor-agnostic.
