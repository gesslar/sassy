---
sidebar:
  order: 6
title: "Linting Your Theme"
---

Sassy includes a built-in linter that catches common problems before they become mysterious visual bugs in VS Code.

## Running the Linter

```bash
npx @gesslar/sassy lint ocean.yaml
```

The linter compiles your theme (including all imports) and then analyses the result for issues.

## What It Checks

### 1. Duplicate Scopes (warning)

The same TextMate scope appearing in more than one `tokenColors` entry. VS Code uses the first matching rule, so later entries with the same scope are dead code.

```log
● Scope 'keyword' is duplicated in 'Keywords', 'Control Flow' (ocean.yaml:18:5)
```

This usually means you have two rules that should be consolidated, or one should use a more specific scope like `keyword.control`.

### 2. Undefined Variables (error)

Referencing a variable that doesn't exist in your `vars` section or any imported file.

```log
● Variable '$(scope.operator)' is used but not defined in 'Operators' (foreground property) (ocean.yaml:35:17)
```

This is the most critical issue -- it means a value in your output will be a literal string like `$(scope.operator)` instead of a colour, and VS Code will ignore it.

### 3. Unused Variables (info)

Variables defined in `vars` but never referenced anywhere in `colors`, `tokenColors`, or `semanticTokenColors`.

```log
● Variable '$scope.operator' is defined in './shared/variables.yaml', but is never used
```

Not a bug, but it's clutter. If you're maintaining a shared design system, unused variables might indicate a scope mapping that lost its consumer.

### 4. Precedence Issues (warning)

A broad TextMate scope appearing before a more specific one. VS Code evaluates `tokenColors` rules top-to-bottom and stops at the first match, so a broad scope listed _before_ a specific one will match first and mask it. When both scopes are in the _same rule_, it's a lower-severity note about redundancy.

```log
● Scope 'keyword' in 'Base Syntax' masks more specific 'keyword.control' in 'Control Flow' (ocean.yaml:22:5)
```

```log
● Scope 'entity.name' makes more specific 'entity.name.function' redundant in 'Entities' (ocean.yaml:48:5)
```

The linter checks proper TextMate scope hierarchy -- `keyword` is broader than `keyword.control` because every `keyword.control` scope also matches `keyword`.

### 5. Token Colour Settings Validation

The linter validates the `settings` object inside each `tokenColors` entry. VS Code silently ignores entries with missing or malformed settings, so these checks catch dead rules you'd never notice.

**Missing or empty settings** -- flags entries that have no `settings` key (error) or an empty `settings: {}` (info).

```log
● 'Keywords' has no valid settings object (ocean.yaml:30:5)
```

**Hex colour validation** -- checks that `foreground` and `background` values are valid hex colours.

```log
● 'not-a-colour' in 'Keywords' (foreground) is not a valid hex colour (#RGB, #RRGGBB, or #RRGGBBAA) (ocean.yaml:33:17)
```

**fontStyle validation** -- checks that fontStyle keywords are recognised (italic, bold, underline, strikethrough).

```log
● fontStyle keyword 'regular' in 'Keywords' is not recognised (valid: italic, bold, underline, strikethrough) (ocean.yaml:34:17)
```

**Deprecated background** -- warns when the `background` property is used, as it has limited support in VS Code.

**Unknown properties** -- flags settings properties that aren't `foreground`, `background`, or `fontStyle`.

**Multiple global defaults** -- warns when more than one scopeless entry exists, since only the last one takes effect.

```log
● 'Global Default A' has no scope and is overridden by a later scopeless entry — only the last global default takes effect
```

See the [Lint Rules](/reference/07-lint-rules/) reference for the full list of tokenColors checks.

### 6. Semantic Token Colour Validation

The linter performs comprehensive validation of your `semanticTokenColors` section. VS Code silently ignores invalid entries here -- no errors, no warnings -- so these checks catch problems you'd otherwise never see.

**Selector syntax** -- validates against VS Code's expected pattern. Catches malformed selectors like `.readonly` (leading dot), `variable..readonly` (double dot), or `variable:ts:js` (multiple languages).

```log
● Selector '.readonly' does not match VS Code's expected pattern
```

**Token types and modifiers** -- checks selectors against VS Code's 23 standard token types and 10 standard modifiers. Typos like `vairable` or `readOnly` (should be `readonly`) are flagged at info level since they could also be extension-contributed types.

```log
● Token type 'vairable' is not a standard VS Code token type (may require an extension)
```

**Value format** -- validates hex colour strings, fontStyle keywords, and style objects. Catches invalid hex values, unrecognised fontStyle keywords, and the common trap where `fontStyle` silently overrides boolean style properties (`bold`, `italic`, etc.) when both are present.

```log
● 'variable.declaration' has both fontStyle and bold — fontStyle overrides the boolean properties
```

**Theme coherence** -- warns when `semanticTokenColors` rules are defined but `semanticHighlighting` is not enabled in `config.custom`. Without it, all your semantic rules are dead code.

```log
● semanticTokenColors rules are defined but semanticHighlighting is not enabled
```

See the [Lint Rules](/reference/07-lint-rules/) reference for the full list of semantic token checks.

## Source Locations

Every lint issue includes a source location — the file, line, and column where the problem originates. This works across imported files, so when a duplicate scope comes from a shared partial, you see exactly where it lives.

```log
● Scope 'keyword' is duplicated in 'Keywords', 'Control Flow' (themes/ocean.yaml:42:5)
```

Unnamed `tokenColors` entries (those without a `name` property) are displayed as `(unnamed rule #N)` rather than a numeric index, making it easier to locate them in the source.

## Reading the Output

Issues are sorted by severity: errors first, then warnings, then info. The summary at the end gives you counts:

```log
2 errors, 3 warnings, 1 info
```

A clean theme produces:

```log
✓ No linting issues found
```

## CI Integration

The lint command exits `1` if any errors are found (undefined variables, cross-rule precedence masking), making it suitable for use in CI pipelines without extra configuration:

```bash
sassy lint my-theme.yaml && echo "theme is clean"
```

To also fail on warnings (duplicate scopes, same-rule precedence notes), use `--strict`:

```bash
sassy lint --strict my-theme.yaml
```

## Tips

- **Lint after refactoring.** When you reorganise variables across files, it's easy to leave behind unused definitions or break references.
- **Lint both themes.** If you have multiple themes sharing a design system, lint each one separately -- they may override different variables.
- **Fix undefined variables first.** They're the only issues that produce visibly broken output.

## Next Steps

When the linter finds an issue but you're not sure _why_ a value resolved the way it did, the resolve command gives you the full picture.
