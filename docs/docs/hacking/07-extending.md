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

`LintCommand` validates theme files through four analysis methods:

- Duplicate scope detection in tokenColors
- Undefined variable references
- Unused variable definitions
- Scope precedence issues (broad scopes masking specific ones)

To add a new rule:

1. Add a validation method to `LintCommand`.
2. Iterate over the relevant theme data (source, compiled, or both).
3. Collect issues with a severity type (`error` or `warning`).
4. Format and output results using the existing reporting pattern.

The lint command has access to both the raw source and the compiled theme, so rules can check either pre- or post-compilation state.

## Philosophy

Sassy is intentionally focused on VS Code theme generation. Output format plugins are the recommended extension path for supporting other editors — the core compilation pipeline should remain editor-agnostic.
