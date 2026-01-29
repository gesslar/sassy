---
sidebar_position: 6
title: "Linting Your Theme"
---

# Linting Your Theme

Sassy includes a built-in linter that catches common problems before they become mysterious visual bugs in VS Code.

## Running the Linter

```bash
npx @gesslar/sassy lint ocean.yaml
```

The linter compiles your theme (including all imports) and then analyses the result for issues.

## What It Checks

### 1. Duplicate Scopes (warning)

The same TextMate scope appearing in more than one `tokenColors` entry. VS Code uses the last matching rule, so earlier entries are silently ignored.

```
● Scope 'keyword' is duplicated in 'Keywords', 'Control Flow'
```

This usually means you have two rules that should be consolidated, or one should use a more specific scope like `keyword.control`.

### 2. Undefined Variables (error)

Referencing a variable that doesn't exist in your `vars` section or any imported file.

```
● Variable '$(scope.operator)' is used but not defined in 'Operators' (foreground property)
```

This is the most critical issue -- it means a value in your output will be a literal string like `$(scope.operator)` instead of a colour, and VS Code will ignore it.

### 3. Unused Variables (info)

Variables defined in `vars` but never referenced anywhere in `colors`, `tokenColors`, or `semanticTokenColors`.

```
● Variable '$scope.operator' is defined in './shared/variables.yaml', but is never used
```

Not a bug, but it's clutter. If you're maintaining a shared design system, unused variables might indicate a scope mapping that lost its consumer.

### 4. Precedence Issues (warning)

A broad TextMate scope appearing before a more specific one. Because VS Code processes tokenColors top-to-bottom with last-match-wins behaviour, a broad scope listed _after_ a specific one can mask it. But when a broad scope is in the _same rule_ as a specific one, it's a lower-severity note about redundancy.

```
● Scope 'keyword' in 'Base Syntax' masks more specific 'keyword.control' in 'Control Flow'
```

```
● Scope 'entity.name' makes more specific 'entity.name.function' redundant in 'Entities'
```

The linter checks proper TextMate scope hierarchy -- `keyword` is broader than `keyword.control` because every `keyword.control` scope also matches `keyword`.

## Reading the Output

Issues are sorted by severity: errors first, then warnings, then info. The summary at the end gives you counts:

```
2 errors, 3 warnings, 1 info
```

A clean theme produces:

```
✓ No linting issues found
```

## CI Integration

The lint command always exits cleanly. To use it in CI, parse the output for error indicators or count the issues reported. A future `--strict` flag to treat warnings as errors is planned.

## Tips

- **Lint after refactoring.** When you reorganise variables across files, it's easy to leave behind unused definitions or break references.
- **Lint both themes.** If you have multiple themes sharing a design system, lint each one separately -- they may override different variables.
- **Fix undefined variables first.** They're the only issues that produce visibly broken output.

## Next Steps

When the linter finds an issue but you're not sure _why_ a value resolved the way it did, the resolve command gives you the full picture.
