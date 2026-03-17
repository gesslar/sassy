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
    // results.tokenColors          - array of tokenColors issues
    // results.semanticTokenColors  - array of semanticTokenColors issues
    // results.colors               - array of colors issues
    // results.variables            - array of variable issues
    //
    // Each issue object includes a location property (string):
    // "path/to/file.yaml:42:5"

`}</CodeBlock>

Constants for issue types, severity levels, and section names are static properties on `Lint`:

<CodeBlock lang="javascript">{`

    Lint.SECTIONS.TOKEN_COLORS        // "tokenColors"
    Lint.SEVERITY.HIGH                // "high"
    Lint.ISSUE_TYPES.DUPLICATE_SCOPE  // "duplicate-scope"

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
