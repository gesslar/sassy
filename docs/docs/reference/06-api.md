---
sidebar_position: 6
title: "Programmatic API"
---

import CodeBlock from "@site/src/components/CodeBlock"

Sassy exposes its core classes for programmatic use. As of v5, the API uses a **builder pattern** for Theme and provides standalone **engine classes** (`Lint`, `Resolve`, `Proof`) that work without CLI infrastructure.

## Installation

<CodeBlock lang="bash">{`

    npm install @gesslar/sassy

`}</CodeBlock>

## Package Exports

| Specifier | Purpose |
|-----------|---------|
| `@gesslar/sassy` | Programmatic API (all exported classes) |
| `@gesslar/sassy` (bin) | CLI entry point (`sassy` command) |

## Basic Usage

<CodeBlock lang="javascript">{`

    import {FileObject, DirectoryObject} from '@gesslar/toolkit'
    import {Theme} from '@gesslar/sassy'

    const cwd = DirectoryObject.fromCwd()
    const file = cwd.getFile('my-theme.yaml')

    const theme = new Theme()
      .setCwd(cwd)
      .setThemeFile(file)
      .setOptions({outputDir: './dist'})

    await theme.load()
    await theme.build()

    const output = theme.getOutput()  // compiled theme object
    await theme.write()               // write to disk

`}</CodeBlock>

:::tip
Cache is optional. Without one, `load()` reads the file directly via `FileObject.loadData()`. Set a cache with `.setCache(cache)` before `load()` when you want cross-theme file caching in a session.
:::

:::tip
Engine methods automatically call `theme.load()` and `theme.build()` if needed. You can pass a freshly constructed Theme directly to any engine — no manual preparation required.
:::

## Exported Classes

**Engine classes** are the preferred API surface for programmatic consumers. They have no CLI dependencies — give them a Theme and they return structured data. Engines automatically load and build as needed.

| Export | Description |
|--------|-------------|
| `Theme` | Theme lifecycle: load, build, write, dependency tracking |
| `Lint` | Lint engine — static analysis, returns structured issue data |
| `Resolve` | Resolve engine — token/scope resolution with trails |
| `Proof` | Proof engine — composed document view (pre-evaluation) |
| `Colour` | Colour manipulation utilities (lighten, darken, mix, etc.) |
| `YamlSource` | YAML source tracking — maps compiled output back to source locations |

## Theme Class

### Builder Pattern

Theme uses a chainable builder. All setters return `this`.

<CodeBlock lang="javascript">{`

    const theme = new Theme()
      .setCwd(cwd)                          // DirectoryObject
      .setThemeFile(file)                   // FileObject
      .setOptions({outputDir: './dist'})   // compilation options
      .setCache(cache)                      // optional Cache instance

`}</CodeBlock>

| Builder Method | Type | Description |
|-----------|------|-------------|
| `setCwd(dir)` | `DirectoryObject` | Working directory for relative path resolution |
| `setThemeFile(file)` | `FileObject` | Source theme file (also derives theme name) |
| `setOptions(opts)` | `object` | Compilation options (`outputDir`, `dryRun`, `silent`, `nerd`) |
| `setCache(cache)` | `Cache` | File cache instance (optional — `load()` falls back to direct file read) |

### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `load()` | `Promise<this>` | Parse and validate the source file |
| `build()` | `Promise<this>` | Run the full compilation pipeline |
| `write(force?)` | `Promise<{status, file}>` | Write output to disk. Skips if hash unchanged unless `force` is true. |
| `wouldWrite()` | `Promise<boolean>` | Check whether the compiled output differs from the existing file on disk. |
| `reset()` | `void` | Clear compiled state for rebuild |
| `getOutput()` | `object \| null` | Get the compiled theme object |
| `getPool()` | `ThemePool \| null` | Get the variable resolution pool |
| `getName()` | `string` | Get the theme name (derived from filename) |
| `getSource()` | `object \| null` | Get the parsed source data |
| `getDependencies()` | `Set` | Get tracked file dependencies |
| `addDependency(file, source)` | `this` | Track an import dependency |
| `getSourceSection(path)` | `unknown` | Get a section of the parsed source by dot-path (e.g. `"theme.colors"`) |
| `getProof(asObject?)` | `string \| object \| null` | Get the cached proof. Returns YAML string by default, object when `asObject` is true. |
| `hasProof()` | `boolean` | True when a cached proof exists |
| `hasOutput()` | `boolean` | True after `build()` — compiled output exists |
| `hasSource()` | `boolean` | True after `load()` — parsed source exists |
| `canBuild()` | `boolean` | True when source is loaded and build can proceed |
| `canWrite()` | `boolean` | True when compiled output is ready for writing |
| `isCompiled()` | `boolean` | True when output, pool, and lookup are all present |
| `isValid()` | `boolean` | True when source file and name are set |
| `findSourceLocation(path)` | `string \| null` | Look up the source file, line, and column for a dot-path in the compiled theme, formatted as `file:line:col` |

## Lint Engine

The `Lint` class analyses a compiled theme and returns structured issue data. No CLI infrastructure needed.

<CodeBlock lang="javascript">{`

    import {DirectoryObject} from '@gesslar/toolkit'
    import {Theme, Lint} from '@gesslar/sassy'

    const cwd = DirectoryObject.fromCwd()
    const file = cwd.getFile('my-theme.yaml')

    const theme = new Theme()
      .setCwd(cwd)
      .setThemeFile(file)
      .setOptions({})

    // No manual load()/build() needed — the engine handles it
    const results = await new Lint().run(theme)

`}</CodeBlock>

### Return Value

`Lint.run()` returns an object with four arrays, one per section:

| Key | Contents |
|-----|----------|
| `tokenColors` | Issues from tokenColors rules |
| `semanticTokenColors` | Issues from semanticTokenColors rules |
| `colors` | Issues from colours rules |
| `variables` | Unused variable issues |

:::caution
The return key is `variables`, not `vars`. `Lint.SECTIONS.VARS` (`"vars"`) refers to the source section name used internally — it does not match the return key.
:::

### Issue Shape

Every issue object has these common fields:

| Field | Type | Description |
|-------|------|-------------|
| `type` | `string` | Issue type identifier (e.g. `"duplicate-scope"`, `"invalid-selector"`) |
| `severity` | `string` | One of `"high"`, `"medium"`, or `"low"` |
| `message` | `string` | Human-readable description of the problem |
| `location` | `string \| undefined` | Source location as `file:line:col` (present when YAML source tracking is available) |

Beyond these, each issue type adds fields specific to the problem it describes. For example, `duplicate-scope` includes an `occurrences` array, `precedence-issue` includes `specificScope` and `broadScope`, and `unused-variable` includes the `variable` name. The `type` field is the discriminator — use it to determine which additional fields are present.

### Issue Types

**Core rules** (from `Lint.ISSUE_TYPES`):

| Type | Severity | Section | Description |
|------|----------|---------|-------------|
| `duplicate-scope` | medium | tokenColors | Same scope in multiple entries |
| `undefined-variable` | high | any | Reference to a variable that does not exist |
| `unused-variable` | low | variables | Defined variable never referenced |
| `precedence-issue` | high/low | tokenColors | Broad scope masks a more specific scope |

**tokenColors value/structure rules:**

| Type | Severity | Description |
|------|----------|-------------|
| `tc-missing-settings` | high | Entry has no `settings` object |
| `tc-empty-settings` | low | Settings object is empty |
| `tc-invalid-hex-colour` | high | Foreground/background is not a valid hex colour |
| `tc-invalid-fontstyle` | medium | Unknown fontStyle keyword |
| `tc-invalid-value` | high | Property value has wrong type |
| `tc-deprecated-background` | medium | `background` property has limited support |
| `tc-unknown-settings-property` | low | Unrecognised property in settings |
| `tc-multiple-global-defaults` | medium | Multiple scopeless entries (only last applies) |

**semanticTokenColors rules:**

| Type | Severity | Description |
|------|----------|-------------|
| `invalid-selector` | high | Selector doesn't match VS Code's pattern |
| `unrecognised-token-type` | low | Token type not in the standard set |
| `unrecognised-modifier` | low | Modifier not in the standard set |
| `deprecated-token-type` | medium | Token type has a recommended replacement |
| `duplicate-selector` | medium | Equivalent selector already defined |
| `invalid-hex-colour` | high | Colour value is not valid hex |
| `invalid-fontstyle` | medium | Unknown fontStyle keyword |
| `invalid-value` | high | Value has wrong type |
| `fontstyle-conflict` | medium | `fontStyle` and boolean style properties both set |
| `deprecated-property` | medium | Property is deprecated and non-functional |
| `empty-rule` | low | Style object is empty |
| `missing-semantic-highlighting` | high | Rules defined but `semanticHighlighting` not enabled |
| `shadowed-rule` | low | More specific selector fully shadows this one |

See [Lint Rules](./07-lint-rules.md) for detailed explanations and fix suggestions for each rule.

### Constants

Issue types, severity levels, and section names are available as static properties:

<CodeBlock lang="javascript">{`

    Lint.SECTIONS.TOKEN_COLORS        // "tokenColors"
    Lint.SECTIONS.SEMANTIC_TOKEN_COLORS // "semanticTokenColors"
    Lint.SECTIONS.COLORS              // "colors"
    Lint.SECTIONS.VARS                // "vars"

    Lint.SEVERITY.HIGH                // "high"
    Lint.SEVERITY.MEDIUM              // "medium"
    Lint.SEVERITY.LOW                 // "low"

    Lint.ISSUE_TYPES.DUPLICATE_SCOPE  // "duplicate-scope"
    Lint.ISSUE_TYPES.UNDEFINED_VARIABLE // "undefined-variable"
    Lint.ISSUE_TYPES.UNUSED_VARIABLE  // "unused-variable"
    Lint.ISSUE_TYPES.PRECEDENCE_ISSUE // "precedence-issue"

`}</CodeBlock>

## Proof Engine

The `Proof` class returns the fully composed theme document (post-import, pre-evaluation).

<CodeBlock lang="javascript">{`

    import {DirectoryObject} from '@gesslar/toolkit'
    import {Theme, Proof} from '@gesslar/sassy'

    const cwd = DirectoryObject.fromCwd()
    const file = cwd.getFile('my-theme.yaml')

    const theme = new Theme()
      .setCwd(cwd)
      .setThemeFile(file)
      .setOptions({})

    // No manual load() needed — the engine handles it
    const composed = await new Proof().run(theme)
    // composed.config             - resolved config
    // composed.palette            - merged palette with séance inlined
    // composed.vars               - merged vars
    // composed.theme.colors       - merged colors
    // composed.theme.tokenColors  - appended tokenColors
    // composed.theme.semanticTokenColors - merged semanticTokenColors

    // The proof is cached on the theme after build() or proof().
    // Subsequent calls return the cached result without recomposing.
    // Use getDependencies() to access the import chain.

`}</CodeBlock>

## Resolve Engine

The `Resolve` class traces token resolution through the variable dependency chain.

<CodeBlock lang="javascript">{`

    import {DirectoryObject} from '@gesslar/toolkit'
    import {Theme, Resolve} from '@gesslar/sassy'

    const cwd = DirectoryObject.fromCwd()
    const file = cwd.getFile('my-theme.yaml')

    const theme = new Theme()
      .setCwd(cwd)
      .setThemeFile(file)
      .setOptions({})

    // No manual load()/build() needed — the engine handles it
    const resolver = new Resolve()

    // Resolve a colour variable
    const colorResult = await resolver.color(theme, 'editor.background')

    // Resolve a tokenColors scope
    const tokenResult = await resolver.tokenColor(theme, 'keyword.control')

    // Resolve a semanticTokenColors scope
    const semanticResult = await resolver.semanticTokenColor(theme, 'variable')

`}</CodeBlock>

### `resolve(theme, options)`

| Parameter | Type | Description |
|-----------|------|-------------|
| `theme` | `Theme` | A Theme instance (auto-loads and builds if needed) |
| `options` | `object` | Exactly one of the keys below |

| Option Key | Type | Description |
|------------|------|-------------|
| `color` | `string` | A colour property key (e.g. `editor.background`) |
| `tokenColor` | `string` | A tokenColors scope (e.g. `keyword.control`) |
| `semanticTokenColor` | `string` | A semanticTokenColors scope (e.g. `variable`) |

The three options are **mutually exclusive** — pass exactly one per call.

### Return Value

The method returns an object whose shape depends on the resolution type and outcome.

**Colour resolution** (`color`):

| Field | Type | Description |
|-------|------|-------------|
| `found` | `boolean` | Whether the colour key exists in the theme |
| `name` | `string` | The requested colour key |
| `resolution` | `string` | Final resolved hex value (when found) |
| `trail` | `array` | Resolution steps, each with `value`, `type`, and `depth` |

**Scope resolution** (`tokenColor` / `semanticTokenColor`):

| Field | Type | Description |
|-------|------|-------------|
| `found` | `boolean` | Whether a matching scope was found |
| `name` | `string` | The requested scope |
| `ambiguous` | `boolean` | `true` when multiple entries match and disambiguation is needed |
| `matches` | `array` | Available disambiguations (when ambiguous) |
| `entryName` | `string` | The matched tokenColors entry name |
| `resolution` | `string` | Final resolved hex value |
| `resolvedVia` | `object` | Present when resolved through precedence fallback (`scope`, `relation`) |
| `noForeground` | `boolean` | `true` when the matched entry has no foreground property |
| `static` | `boolean` | `true` when the value is a static literal (no variable resolution) |
| `trail` | `array` | Resolution steps, each with `value`, `type`, and `depth` |

### Trail Steps

Both return shapes include a `trail` array. Each element is an object with three fields:

| Field | Type | Description |
|-------|------|-------------|
| `value` | `string` | The token value at this point in the chain |
| `type` | `string` | Classification of the value (see below) |
| `depth` | `number` | Nesting level in the dependency tree (0 = top) |

#### Step Types

| Type | Meaning | Example |
|------|---------|---------|
| `variable` | A variable reference | `$(std.fg)`, `$(palette.white)` |
| `expression` | A colour function call | `lighten($(primary), 20)`, `oklch(0.14 0 0)` |
| `literal` | A hex value that was authored directly in the source | `#4b8ebd`, `#f0e` |
| `normalised` | A hex value expanded from shorthand to long form | `#ff00ee` (from authored `#f0e`) |
| `resolved` | A hex value that was computed from a non-hex expression | `#72b5e6` |

The three hex types tell you exactly where a value came from: `literal` is the authored shorthand, `normalised` is its long-form expansion, and `resolved` is a value computed through function evaluation or variable chains. This means you can search your source for `literal` values and render swatches on `normalised` and `resolved` values without regex guesswork.
