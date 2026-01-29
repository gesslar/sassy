---
sidebar_position: 7
title: "Lint Rules"
---

# Lint Rules

The `sassy lint` command performs static analysis on compiled theme data. It reports issues at three severity levels: **error** (high), **warning** (medium), and **info** (low).

Lint always exits with code 0, even when issues are found.

---

## Duplicate Scopes

**Severity:** warning

**What it detects:** The same TextMate scope string appearing in the `scope` field of more than one `tokenColors` entry.

**Why it matters:** VS Code uses first-match semantics for `tokenColors`. When the same scope appears in multiple rules, only the first rule applies. Later rules with the same scope are dead code.

**Example problem:**

```yaml
theme:
  tokenColors:
    - name: Strings
      scope: string
      settings:
        foreground: "#98c379"
    - name: String Literals
      scope: string
      settings:
        foreground: "#e5c07b"
        fontStyle: italic
```

The second rule never applies because `string` was already matched by the first.

**Fix:** Remove the duplicate rule, or use more specific scopes (`string.quoted.double`, `string.template`) to differentiate.

---

## Undefined Variables

**Severity:** error

**What it detects:** A variable reference (`$(var.name)`, `$var.name`, or `${var.name}`) that refers to a name not defined in `vars` or any imported file.

**Why it matters:** Undefined variables are not resolved during compilation. The raw variable syntax passes through to the output, producing broken colour values in the generated theme.

**Example problem:**

```yaml
vars:
  palette:
    blue: "#61afef"

theme:
  colors:
    editor.foreground: $(palette.white)  # "white" not defined
```

**Fix:** Define the missing variable, correct the typo, or remove the reference.

---

## Unused Variables

**Severity:** info

**What it detects:** Variables defined under `vars` that are never referenced in `colors`, `tokenColors`, or `semanticTokenColors` across the theme and its imports.

**Why it matters:** Unused variables are dead code. They may indicate a typo in a variable name or a leftover from a previous revision.

:::note
This check only examines references in the `theme` section (colours, tokenColors, semanticTokenColors). Variables referenced only by other variables are not flagged -- they participate in the variable resolution chain even if they do not appear directly in theme output.
:::

**Example problem:**

```yaml
vars:
  palette:
    cyan: "#56b6c2"
    magenta: "#c678dd"   # never referenced anywhere in theme

theme:
  colors:
    editor.foreground: $(palette.cyan)
```

**Fix:** Remove the unused variable or add a reference where intended.

---

## Precedence Issues

**Severity:** high (cross-rule) or info (within same rule)

**What it detects:** A broad TextMate scope appearing before a more specific scope in `tokenColors` ordering, where the broad scope is a prefix of the specific scope.

**Why it matters:** VS Code evaluates `tokenColors` rules top to bottom and stops at the first match. If a broad scope like `keyword` appears before a specific scope like `keyword.control`, the specific rule is masked and never applies.

When both scopes are in the same rule (same index), the severity is reduced to info, since this is often intentional.

**Example problem:**

```yaml
theme:
  tokenColors:
    - name: All Keywords
      scope: keyword
      settings:
        foreground: "#c678dd"
    - name: Control Keywords
      scope: keyword.control
      settings:
        foreground: "#e06c75"
        fontStyle: bold
```

`keyword.control` is a child of `keyword`. Because the broad `keyword` rule comes first, `keyword.control` never matches.

**Fix:** Reorder rules from most specific to least specific:

```yaml
theme:
  tokenColors:
    - name: Control Keywords
      scope: keyword.control
      settings:
        foreground: "#e06c75"
        fontStyle: bold
    - name: All Keywords
      scope: keyword
      settings:
        foreground: "#c678dd"
```

### Scope Hierarchy

Precedence analysis uses TextMate scope hierarchy rules. A scope `A` is considered broader than scope `B` when every dot-separated segment of `A` is a prefix of `B`:

| Broad Scope | Specific Scope | Relationship |
|-------------|---------------|--------------|
| `keyword` | `keyword.control` | `keyword` masks `keyword.control` |
| `entity.name` | `entity.name.function` | `entity.name` masks `entity.name.function` |
| `keyword` | `string` | No relationship (different roots) |
| `keyword.control` | `keyword.operator` | No relationship (diverges at segment 2) |
