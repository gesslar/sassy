---
sidebar:
  order: 7
title: "Lint Rules"
---

The `sassy lint` command performs static analysis on compiled theme data. It reports issues at three severity levels: **error** (high), **warning** (medium), and **info** (low).

Every issue includes a source location (`file:line:col`) pointing to where the problem originates in your source files. Locations work across imported files — if a duplicate scope comes from a shared partial, the location points into that file. Unnamed `tokenColors` entries are displayed as `(unnamed rule #N)` rather than a numeric index.

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

**What it detects:** A variable reference (`$(var.name)`, `$var.name`, `${var.name}`, or palette alias `$$name`) that refers to a name not defined in `palette`, `vars`, or any imported file.

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

**What it detects:** Leaf variables defined under `vars` that are never referenced anywhere — including in other vars, colors, tokenColors, and semanticTokenColors across the theme and its imports.

**Why it matters:** Unused variables are dead code. They may indicate a typo in a variable name or a leftover from a previous revision.

:::info
Container keys (YAML mappings that hold child keys, like `std` in `std.fg.base`) are not flagged — they are namespaces, not variables. Only leaf values (strings, arrays) are tracked as defined variables.

Variables referenced by other variables in the `vars` section are correctly recognised as used — the linter scans all sections for cross-references.
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

---

## Token Colour Settings Rules

The following rules validate the `settings` object inside each `tokenColors` entry and the overall structure of the tokenColors array.

---

### Missing Settings

**Severity:** error

**What it detects:** A `tokenColors` entry that has no `settings` key, or where `settings` is not an object.

**Why it matters:** Without a valid settings object, the rule does nothing. VS Code silently ignores it.

**Fix:** Add a `settings` object with at least a `foreground` or `fontStyle` property.

---

### Empty Settings

**Severity:** info

**What it detects:** A `tokenColors` entry whose `settings` is an empty object (`{}`).

**Why it matters:** An empty settings object is technically valid but contributes nothing to the theme.

**Fix:** Add colour or style properties, or remove the entry.

---

### Invalid Hex Colour (tokenColors)

**Severity:** error

**What it detects:** A `foreground` or `background` value in `settings` that is not a valid hex colour in `#RGB`, `#RRGGBB`, or `#RRGGBBAA` format.

**Example problem:**

```yaml
theme:
  tokenColors:
    - name: Keywords
      scope: keyword
      settings:
        foreground: "not-a-colour"
```

**Fix:** Use a valid hex colour string.

---

### Invalid fontStyle Keyword (tokenColors)

**Severity:** warning

**What it detects:** A word in the `fontStyle` string that isn't one of the four recognised keywords: `italic`, `bold`, `underline`, `strikethrough`.

**Why it matters:** Unrecognised words like `regular` or `oblique` are silently ignored — they don't cause errors but they don't do anything either.

:::info
`fontStyle: ""` (empty string) is valid and intentional — it clears all inherited font styles.
:::

---

### Deprecated Background (tokenColors)

**Severity:** warning

**What it detects:** The `background` property in a `tokenColors` settings object.

**Why it matters:** Token background colours have limited support in VS Code. The property is accepted by the schema but rarely has a visual effect.

---

### Unknown Settings Property

**Severity:** info

**What it detects:** A property in the `settings` object that isn't `foreground`, `background`, or `fontStyle`.

**Why it matters:** VS Code ignores unknown properties. Common mistakes include `decoration`, `color`, or `font-style` (hyphenated).

**Fix:** Use one of the three valid properties: `foreground`, `background`, `fontStyle`.

---

### Multiple Global Defaults

**Severity:** warning

**What it detects:** More than one `tokenColors` entry without a `scope` property. Scopeless entries act as global defaults. When multiple exist, only the last one takes effect — earlier ones are dead code.

**Example problem:**

```yaml
theme:
  tokenColors:
    - name: Global Default A
      settings:
        foreground: "#cccccc"
    - name: Keywords
      scope: keyword
      settings:
        foreground: "#ff0000"
    - name: Global Default B
      settings:
        foreground: "#dddddd"
```

`Global Default A` is overridden by `Global Default B`.

**Fix:** Keep only one scopeless entry, or consolidate them.

---

## Semantic Token Colour Rules

The following rules validate the `semanticTokenColors` section of your compiled theme. VS Code silently ignores invalid entries in this section — no runtime errors, no warnings — making these checks especially valuable.

---

### Invalid Selector

**Severity:** error

**What it detects:** A selector key that doesn't match VS Code's expected pattern: `(*|tokenType)(.tokenModifier)*(:tokenLanguage)?`

**Why it matters:** VS Code's parser produces an internal `$invalid` selector that never matches anything. The rule is silently dead code.

**Examples of invalid selectors:**

| Selector | Problem |
|----------|---------|
| `.readonly` | Leading dot — empty token type |
| `variable..readonly` | Double dot |
| `variable:typescript:javascript` | Multiple language suffixes |
| `variable·` | Trailing space |

**Fix:** Correct the selector syntax. Valid examples: `variable`, `variable.readonly`, `variable.readonly:typescript`, `*.declaration`.

---

### Unrecognised Token Type

**Severity:** info

**What it detects:** A token type that is not one of VS Code's 23 standard types.

**Why it matters:** Unrecognised types silently never match any tokens unless an extension registers them. Common causes are typos (`vairable` instead of `variable`) or assuming a type exists when it doesn't.

**Standard types:** `comment`, `string`, `keyword`, `number`, `regexp`, `operator`, `namespace`, `type`, `struct`, `class`, `interface`, `enum`, `typeParameter`, `function`, `method`, `macro`, `variable`, `parameter`, `property`, `enumMember`, `event`, `decorator`, `label`

**Why info, not error:** Extensions can contribute custom token types via `semanticTokenTypes` in their `package.json`. A type like `templateType` is valid when the contributing extension is installed.

---

### Unrecognised Modifier

**Severity:** info

**What it detects:** A modifier that is not one of VS Code's 10 standard modifiers.

**Why it matters:** Same as unrecognised types — the rule silently never matches. Watch for camelCase mistakes like `readOnly` (should be `readonly`) or `defaultlibrary` (should be `defaultLibrary`).

**Standard modifiers:** `declaration`, `definition`, `readonly`, `static`, `deprecated`, `abstract`, `async`, `modification`, `documentation`, `defaultLibrary`

---

### Deprecated Token Type

**Severity:** warning

**What it detects:** The `member` token type, which still exists in VS Code's registry but is deprecated.

**Fix:** Use `method` instead. VS Code defines `member` with `superType: method`, so `method` covers the same tokens.

---

### Duplicate Selector

**Severity:** warning

**What it detects:** Two selectors that resolve to the same internal ID after modifier normalisation. VS Code sorts modifiers alphabetically when generating IDs, so `variable.readonly.static` and `variable.static.readonly` are identical.

**Fix:** Remove the duplicate entry — only one can take effect.

---

### Invalid Hex Colour

**Severity:** error

**What it detects:** A colour value (either a string shorthand or the `foreground` property in a style object) that is not a valid hex colour in `#RGB`, `#RRGGBB`, or `#RRGGBBAA` format.

**Example problem:**

```yaml
theme:
  semanticTokenColors:
    "keyword": "zzz"
    "variable":
      foreground: "not-a-colour"
```

**Fix:** Use a valid hex colour string.

---

### Invalid fontStyle Keyword

**Severity:** warning

**What it detects:** A word in the `fontStyle` string property that isn't one of the four recognised keywords: `italic`, `bold`, `underline`, `strikethrough`.

**Why it matters:** VS Code extracts keywords from fontStyle using a regex match. Unrecognised words like `regular` are silently ignored — they don't cause errors but they also don't do anything.

:::info
`fontStyle: ""` (empty string) is valid and intentional — it clears all inherited font styles from higher-level rules.
:::

---

### fontStyle Conflict

**Severity:** warning

**What it detects:** A style object that contains both a `fontStyle` string property and individual boolean style properties (`bold`, `italic`, `underline`, `strikethrough`).

**Why it matters:** When `fontStyle` is present, VS Code resets all styles to `false` and then applies only the keywords named in the `fontStyle` string. The boolean properties are silently ignored.

**Example problem:**

```yaml
theme:
  semanticTokenColors:
    "variable.declaration":
      foreground: "#e6e6e6"
      fontStyle: "italic"
      bold: true          # silently ignored — fontStyle wins
```

**Fix:** Either use `fontStyle: "italic bold"` to combine styles, or remove `fontStyle` and use only boolean properties.

---

### Deprecated Property

**Severity:** warning

**What it detects:** The `background` property in a style object.

**Why it matters:** Token background colours are not supported in VS Code. The property is accepted by the schema but has no visual effect.

---

### Empty Rule

**Severity:** info

**What it detects:** A style object with no properties (`{}`).

**Why it matters:** An empty object is technically valid but does nothing — it doesn't set any colour or style.

---

### Missing Semantic Highlighting

**Severity:** error

**What it detects:** `semanticTokenColors` rules are defined in the theme but `semanticHighlighting` is not set to `true`.

**Why it matters:** This is the most common `semanticTokenColors` mistake. Without `semanticHighlighting: true` (set via `config.custom` in Sassy), VS Code's default behaviour (`editor.semanticHighlighting.enabled: "configuredByTheme"`) means your semantic rules are never evaluated. All your carefully crafted `semanticTokenColors` entries become dead code.

**Fix:** Add `semanticHighlighting: true` to your `config.custom` section:

```yaml
config:
  name: My Theme
  type: dark
  custom:
    semanticHighlighting: true
```

---

### Shadowed Rule

**Severity:** info

**What it detects:** A rule whose style properties are completely overridden by a higher-specificity rule for every token that matches it.

**Why it matters:** The lower-specificity rule's properties are unreachable for the subset of tokens that also match the higher-specificity rule. This may be intentional (language-specific overrides) but is worth knowing about.

**Example:**

```yaml
theme:
  semanticTokenColors:
    "variable.readonly":
      foreground: "#ff0000"
    "variable.readonly:typescript":
      foreground: "#00ff00"    # shadows the rule above for TypeScript files
```

VS Code uses a numerical specificity scoring system: exact type match adds 100, each modifier adds 100, and a language suffix adds 10. The highest-scoring rule wins for each style property independently.
