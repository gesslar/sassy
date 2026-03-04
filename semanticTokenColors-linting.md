# Linting rules for `semanticTokenColors` in VS Code themes

**VS Code's `semanticTokenColors` uses a well-defined selector syntax, a numerical specificity scoring system, and strict-but-silent validation** — making it both powerful and prone to silent failures that a linter can catch. This report synthesizes findings from the VS Code source code (`tokenClassificationRegistry.ts`, `colorThemeSchema.ts`), official documentation, and GitHub issues into a comprehensive set of derivable linting rules.

The core parser, `parseClassifierString()`, scans selectors right-to-left, splitting on `:` for language and `.` for modifiers. Values accept either hex color strings or style objects. Invalid entries never produce runtime errors — they are silently ignored, which makes linting especially valuable since theme authors get no feedback when rules are broken.

## Selector syntax: what the parser actually accepts

The canonical selector format is `(*|tokenType)(.tokenModifier)*(:tokenLanguage)?`. The parser in `tokenClassificationRegistry.ts` processes selectors right-to-left: the segment after the last `:` becomes the language, segments separated by `.` after the first segment become modifiers, and the leftmost segment is the token type (or `*` for wildcard).

**Example:** `variable.readonly.declaration:typescript` parses to type=`variable`, modifiers=[`declaration`, `readonly`], language=`typescript`. Modifier order in the selector is irrelevant — `variable.readonly.declaration` and `variable.declaration.readonly` produce identical normalized IDs because modifiers are sorted alphabetically during ID generation.

The JSON schema validates selector keys against this regex pattern: `^(\w+[-_\w+]*|\*)(\.\w+[-_\w+]*)*(:\w+[-_\w+]*)?$`. This means selectors must use word characters, hyphens, and underscores only. **Derivable linting rules for selectors:**

- **Empty type is invalid.** If parsing produces an empty type string, the selector becomes permanently non-matching (`id: '$invalid'`). Flag selectors like `.readonly` (leading dot), `..readonly` (double dot), or empty strings.
- **Trailing dots are invalid.** `variable.` fails the regex pattern.
- **Double dots are invalid.** `variable..readonly` fails the regex pattern.
- **Multiple language suffixes are invalid.** `variable:typescript:javascript` fails — only zero or one `:language` suffix is allowed per selector.
- **Special characters beyond `\w`, `-`, `_` are invalid.** Selectors containing spaces, `@`, `#`, or other non-word characters (except `.` and `:` as delimiters) fail the pattern.
- **Wildcard `*` is valid only as the type.** `*.readonly` is valid; `variable.*` is not a meaningful construct (the `*` would be parsed as a modifier name, which would never match anything).
- **Warn on duplicate selectors.** Since modifier order is irrelevant (`variable.readonly.static` = `variable.static.readonly`), flag duplicates that differ only in modifier ordering.

## Value syntax: strings, objects, and the fontStyle trap

Values in `semanticTokenColors` accept two formats. A **string** must be a hex color in the format validated by `color-hex` (e.g., `"#ff0000"`, `"#ff0000ff"` with alpha). An **object** supports these properties:

| Property | Type | Notes |
|---|---|---|
| `foreground` | string (`color-hex`) | The token's text color |
| `bold` | boolean | Bold styling |
| `italic` | boolean | Italic styling |
| `underline` | boolean | Underline styling |
| `strikethrough` | boolean | Strikethrough styling |
| `fontStyle` | string | Space-separated: `italic`, `bold`, `underline`, `strikethrough` |
| `background` | string | **Deprecated** — "Token background colors are currently not supported" |

**The critical `fontStyle` vs. boolean trap:** When `fontStyle` is present in the same object as individual boolean properties (`bold`, `italic`, etc.), **`fontStyle` wins completely**. The source code first resets all styles to `false`, then applies only the styles named in the `fontStyle` string via regex `/italic|bold|underline|strikethrough/g`. The booleans are ignored. **Derivable linting rules:**

- **Warn when `fontStyle` and boolean style properties coexist.** This is a common source of confusion — the booleans will be silently ignored.
- **`fontStyle: ""` (empty string) is intentional.** It clears all inherited font styles. Don't flag this as an error, but consider an informational lint noting its effect.
- **Flag invalid `fontStyle` keywords.** Only `italic`, `bold`, `underline`, and `strikethrough` are recognized. The word `regular` is not valid (though it effectively acts like `""` since nothing matches).
- **Flag `background` usage.** It's deprecated and non-functional.
- **Flag `false` as a top-level value.** `"variable": false` is not a valid value format. Only strings and objects are accepted.
- **Validate hex color format.** Both `foreground` (in objects) and string values must be valid hex colors. The schema expects `#RGB`, `#RRGGBB`, or `#RRGGBBAA` format. Warn that transparency in semantic token colors is not supported.
- **Flag empty objects.** A value of `{}` is technically valid but does nothing — worth a warning.

## Specificity scoring: a numerical system, not CSS

VS Code resolves conflicts between matching selectors using a **numerical scoring system** implemented in `parseTokenSelector().match()`. The highest score wins. A score of `-1` means no match. The formula:

**`score = languageBonus + typeScore + (modifierCount × 100)`**

| Factor | Score contribution | Details |
|---|---|---|
| Language match (`:lang`) | **+10** | Only if selector specifies a language and it matches |
| Language mismatch | **-1** (no match) | Immediate rejection |
| Exact type match | **+100** | Token type exactly equals selector type |
| SuperType match | **+100 − level** | e.g., `method` matching `function` selector = +99 |
| Wildcard type (`*`) | **+0** | Matches any type but adds nothing to score |
| Each modifier | **+100** per modifier | All selector modifiers must be present on the token |
| Missing modifier | **-1** (no match) | Any absent modifier causes immediate rejection |

**Concrete example:** For a `variable` token with modifier `readonly` in TypeScript, `variable.readonly:typescript` scores **210** (10+100+100), `variable.readonly` scores **200**, `variable` scores **100**, `*.readonly` scores **100**, and `*` scores **0**.

**Tie-breaking edge case:** When two selectors produce identical scores (e.g., `*.readonly` = 100 and `variable` = 100), style properties are merged independently — foreground, bold, italic, underline, and strikethrough are each taken from the highest-scoring rule that defines that specific property. **Derivable linting rules:**

- **Warn on selectors that will never match due to being shadowed.** If `variable.readonly` defines a `foreground` and `variable.readonly:typescript` also defines `foreground`, note that the former is shadowed for TypeScript files.
- **Warn on wildcard rules that may be unintentionally low-priority.** `*` has score 0 — it loses to every other matching rule.
- **Flag identical-score conflicts.** When two rules have the same specificity score and define the same style property, the behavior is order-dependent and potentially surprising.

## Runtime enforcement: silent failures everywhere

VS Code performs **schema-level validation** in the JSON editor (showing squiggly warnings for invalid patterns or color formats) but **no runtime validation** of semantic correctness. The source code reveals several layers of silent failure:

**Unregistered token types:** `parseClassifierString` does not validate whether a type name exists in the registry. It simply splits the string. During `match()`, `getTypeHierarchy()` builds the hierarchy chain, and if the type is unknown, `hierarchy.indexOf(selector.type)` returns `-1` — the rule silently never matches. **Unregistered modifiers** similarly cause the rule to silently never match because the token won't have the unknown modifier.

**Malformed selectors:** If parsing produces an empty type, the selector becomes `{ match: () => -1, id: '$invalid' }`. In `SemanticTokenRule.fromJSONObject()`, any exception during parsing is caught and silently swallowed (`catch (_ignore)`), returning `undefined`. **Derivable linting rules:**

- **Warn on unrecognized token types.** A selector using `vairable` (typo) will silently never match. Lint against the known set of standard types (see next section) plus any extension-contributed types.
- **Warn on unrecognized modifiers.** Same silent-failure problem for typos in modifiers.
- **Warn on selectors that parse to empty type.** These become `$invalid` internally.
- **Info-level note for extension-contributed types.** If a selector uses a non-standard type that could come from an extension (e.g., `templateType`), note that the rule only works when that extension is installed.

## All 23 standard token types and 10 standard modifiers

VS Code registers these token types in `tokenClassificationRegistry.ts`, aligned with (but not identical to) the LSP 3.17/3.18 specification:

**Standard token types:** `comment`, `string`, `keyword`, `number`, `regexp`, `operator`, `namespace`, `type`, `struct`, `class`, `interface`, `enum`, `typeParameter`, `function`, `method`, `macro`, `variable`, `parameter`, `property`, `enumMember`, `event`, `decorator`, `label`. The deprecated `member` type still exists with `superType: method` — a linter should **flag `member` usage and suggest `method` instead**.

**Standard token modifiers:** `declaration`, `definition`, `readonly`, `static`, `deprecated`, `abstract`, `async`, `modification`, `documentation`, `defaultLibrary`.

The LSP 3.17 spec includes `modifier` as a token type that VS Code does *not* register. VS Code includes `decorator` and `label` which were added in LSP 3.18. Extensions can contribute additional types via `semanticTokenTypes` (with optional `superType` for inheritance) and modifiers via `semanticTokenModifiers` in `package.json`, using IDs matching `^\w+[-_\w+]*$`.

## How `semanticTokenColors` overrides `tokenColors`

The cascade operates in strict priority order. **User settings** (`editor.semanticTokenColorCustomizations.rules`) override **theme `semanticTokenColors`** rules, which override the **Semantic Token Scope Map fallback** (built-in mappings from semantic tokens to TextMate scopes like `variable.readonly` → `variable.other.constant`), which finally falls back to **`tokenColors`** (TextMate grammar rules).

**The override is per-property, not all-or-nothing.** A semantic rule defining only `foreground` leaves `bold`/`italic`/`underline`/`strikethrough` to be determined by other rules or defaults. However, when a semantic token does match a rule, it **completely replaces** the TextMate grammar color for that token's text range — semantic highlighting is applied "on top of" syntax highlighting by design.

**The `semanticHighlighting: true` requirement is critical.** This is a top-level theme property (not inside `semanticTokenColors`) that defaults to `false`. Without it, `semanticTokenColors` rules exist but are never evaluated when the user's `editor.semanticHighlighting.enabled` is set to `"configuredByTheme"` (the default). **A linter should warn if `semanticTokenColors` is present but `semanticHighlighting` is not set to `true`.**

## Language-scoped selectors and the `:language` suffix

The `:language` suffix restricts a rule to files of a specific VS Code language ID. Valid identifiers correspond to VS Code's language identifiers (e.g., `typescript`, `javascript`, `python`, `java`, `cpp`, `csharp`, `rust`, `go`). Only **one** language can be specified per selector — to target multiple languages, separate rules are required.

Language scoping adds **+10** to the specificity score, making language-scoped rules always beat their non-scoped equivalents (assuming equal type and modifier specificity). A linter could validate language identifiers against VS Code's known language ID list, though extensions can contribute new language IDs.

## Edge cases and gotchas worth flagging in a linter

**The top mistakes theme authors make**, drawn from GitHub issues and documentation analysis:

- **Missing `semanticHighlighting: true`** is the #1 error. The `semanticTokenColors` section is defined but the theme never opts into semantic highlighting, so all rules are dead code.
- **Putting `semanticTokenColors` in `package.json`** instead of the theme JSON file. The extension manifest (`package.json`) uses `semanticTokenTypes`, `semanticTokenModifiers`, and `semanticTokenScopes` — but `semanticTokenColors` belongs exclusively in the color theme file.
- **SuperType scope mappings are not inherited.** When an extension defines `templateType` with `superType: type`, the TextMate scope fallback for `type` does NOT automatically apply to `templateType`. Subtypes need explicit `semanticTokenScopes` entries.
- **Semantic tokens override TextMate unexpectedly.** A broad semantic rule like `"string": "#ff0000"` will override highly specific TextMate scopes like `constant.character.escape.cs` for string escape sequences. A linter could warn about broad semantic rules that may unintentionally suppress TextMate specificity.
- **Delayed loading.** Semantic tokens load after the language server initializes, creating a visible "flash" from TextMate colors to semantic colors. Themes relying exclusively on `semanticTokenColors` without matching `tokenColors` will show plain gray text until the language server is ready.

## Conclusion

A comprehensive `semanticTokenColors` linter should enforce rules across five categories. **Syntax validation:** regex-match selectors against `^(\w+[-_\w+]*|\*)(\.\w+[-_\w+]*)*(:\w+[-_\w+]*)?$`, validate hex colors, reject invalid `fontStyle` keywords, and flag the `fontStyle`-plus-booleans conflict. **Semantic validation:** warn on unrecognized token types or modifiers (against the 23+10 standard set), flag the deprecated `member` type, and note extension-dependent types. **Specificity analysis:** detect shadowed rules, identical-score conflicts, and overly broad wildcard rules. **Theme coherence:** require `semanticHighlighting: true` when `semanticTokenColors` is present, warn on `background` usage, and flag empty/no-op rules. **Cross-section analysis:** warn when broad semantic rules may unintentionally override specific TextMate scopes in `tokenColors`. The scoring formula (`languageBonus + (100 − typeLevel) + modifierCount × 100`) is the foundation for all specificity-related linting.