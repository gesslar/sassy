---
sidebar_position: 6
title: "Linting Your Theme"
---

import CodeBlock from "@site/src/components/CodeBlock"

Sassy includes a built-in linter that catches common problems before they become mysterious visual bugs in VS Code.

## Running the Linter

<CodeBlock lang="bash">{`

  npx @gesslar/sassy lint ocean.yaml

`}</CodeBlock>

The linter compiles your theme (including all imports) and then analyses the result for issues.

## What It Checks

### 1. Duplicate Scopes (warning)

The same TextMate scope appearing in more than one `tokenColors` entry. VS Code uses the first matching rule, so later entries with the same scope are dead code.

<CodeBlock lang="log">{`
● Scope 'keyword' is duplicated in 'Keywords', 'Control Flow'
`}</CodeBlock>

This usually means you have two rules that should be consolidated, or one should use a more specific scope like `keyword.control`.

### 2. Undefined Variables (error)

Referencing a variable that doesn't exist in your `vars` section or any imported file.

<CodeBlock lang="log">{`

  ● Variable '$(scope.operator)' is used but not defined in 'Operators' (foreground property)

`}</CodeBlock>

This is the most critical issue -- it means a value in your output will be a literal string like `$(scope.operator)` instead of a colour, and VS Code will ignore it.

### 3. Unused Variables (info)

Variables defined in `vars` but never referenced anywhere in `colors`, `tokenColors`, or `semanticTokenColors`.

<CodeBlock lang="log">{`

  ● Variable '$scope.operator' is defined in './shared/variables.yaml', but is never used

`}</CodeBlock>

Not a bug, but it's clutter. If you're maintaining a shared design system, unused variables might indicate a scope mapping that lost its consumer.

### 4. Precedence Issues (warning)

A broad TextMate scope appearing before a more specific one. VS Code evaluates `tokenColors` rules top-to-bottom and stops at the first match, so a broad scope listed _before_ a specific one will match first and mask it. When both scopes are in the _same rule_, it's a lower-severity note about redundancy.

<CodeBlock lang="log">{`

  ● Scope 'keyword' in 'Base Syntax' masks more specific 'keyword.control' in 'Control Flow'

`}</CodeBlock>

<CodeBlock lang="log">{`

  ● Scope 'entity.name' makes more specific 'entity.name.function' redundant in 'Entities'

`}</CodeBlock>

The linter checks proper TextMate scope hierarchy -- `keyword` is broader than `keyword.control` because every `keyword.control` scope also matches `keyword`.

### 5. Semantic Token Colour Validation

The linter performs comprehensive validation of your `semanticTokenColors` section. VS Code silently ignores invalid entries here -- no errors, no warnings -- so these checks catch problems you'd otherwise never see.

**Selector syntax** -- validates against VS Code's expected pattern. Catches malformed selectors like `.readonly` (leading dot), `variable..readonly` (double dot), or `variable:ts:js` (multiple languages).

<CodeBlock lang="log">{`

  ● Selector '.readonly' does not match VS Code's expected pattern

`}</CodeBlock>

**Token types and modifiers** -- checks selectors against VS Code's 23 standard token types and 10 standard modifiers. Typos like `vairable` or `readOnly` (should be `readonly`) are flagged at info level since they could also be extension-contributed types.

<CodeBlock lang="log">{`

  ● Token type 'vairable' is not a standard VS Code token type (may require an extension)

`}</CodeBlock>

**Value format** -- validates hex colour strings, fontStyle keywords, and style objects. Catches invalid hex values, unrecognised fontStyle keywords, and the common trap where `fontStyle` silently overrides boolean style properties (`bold`, `italic`, etc.) when both are present.

<CodeBlock lang="log">{`

  ● 'variable.declaration' has both fontStyle and bold — fontStyle overrides the boolean properties

`}</CodeBlock>

**Theme coherence** -- warns when `semanticTokenColors` rules are defined but `semanticHighlighting` is not enabled in `config.custom`. Without it, all your semantic rules are dead code.

<CodeBlock lang="log">{`

  ● semanticTokenColors rules are defined but semanticHighlighting is not enabled

`}</CodeBlock>

See the [Lint Rules](/docs/reference/lint-rules) reference for the full list of semantic token checks.

## Reading the Output

Issues are sorted by severity: errors first, then warnings, then info. The summary at the end gives you counts:

<CodeBlock lang="log">{`

  2 errors, 3 warnings, 1 info

`}</CodeBlock>

A clean theme produces:

<CodeBlock lang="log">{`

  ✓ No linting issues found

`}</CodeBlock>

## CI Integration

The lint command exits `1` if any errors are found (undefined variables, cross-rule precedence masking), making it suitable for use in CI pipelines without extra configuration:

<CodeBlock lang="bash">{`

  sassy lint my-theme.yaml && echo "theme is clean"

`}</CodeBlock>

To also fail on warnings (duplicate scopes, same-rule precedence notes), use `--strict`:

<CodeBlock lang="bash">{`

  sassy lint --strict my-theme.yaml

`}</CodeBlock>

## Tips

- **Lint after refactoring.** When you reorganise variables across files, it's easy to leave behind unused definitions or break references.
- **Lint both themes.** If you have multiple themes sharing a design system, lint each one separately -- they may override different variables.
- **Fix undefined variables first.** They're the only issues that produce visibly broken output.

## Next Steps

When the linter finds an issue but you're not sure _why_ a value resolved the way it did, the resolve command gives you the full picture.
