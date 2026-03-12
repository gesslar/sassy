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
Engine methods will automatically call `theme.load()` if the Theme is not ready. They do not automatically call `theme.build()`, so build first when you need compiled output (e.g. Resolve, full linting).
:::

## Exported Classes

**Engine classes** are the preferred API surface for programmatic consumers. They have no CLI dependencies — give them a compiled Theme and they return structured data.

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
| `reset()` | `void` | Clear compiled state for rebuild |
| `getOutput()` | `object \| null` | Get the compiled theme object |
| `getPool()` | `ThemePool \| null` | Get the variable resolution pool |
| `getName()` | `string` | Get the theme name (derived from filename) |
| `getSource()` | `object \| null` | Get the parsed source data |
| `getDependencies()` | `Set` | Get tracked file dependencies |
| `addDependency(file, source)` | `this` | Track an import dependency |
| `hasOutput()` | `boolean` | Check if compilation produced output |
| `isReady()` | `boolean` | Check if source data is available |
| `isCompiled()` | `boolean` | Check if output, pool, and lookup are present |
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
    await theme.load()
    await theme.build()

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
    await theme.load()

    const composed = await new Proof().run(theme)
    // composed.config             - resolved config
    // composed.palette            - merged palette with séance inlined
    // composed.vars               - merged vars
    // composed.theme.colors       - merged colors
    // composed.theme.tokenColors  - appended tokenColors
    // composed.theme.semanticTokenColors - merged semanticTokenColors

    // Pass withImports=true to include the import list in the output.
    // Useful for discovering imports and dependencies as recorded during
    // composition/compile/proof, without requiring a full evaluation.
    const withImports = await new Proof().run(theme, true)
    // withImports.config.import   - imports derived from config.import after composition

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
    await theme.load()
    await theme.build()

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
| `theme` | `Theme` | A compiled theme (must have been loaded and built) |
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
