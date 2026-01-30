---
sidebar_position: 6
title: "Programmatic API"
---

import CodeBlock from "@site/src/components/CodeBlock"

Sassy exposes its core classes for programmatic use. The API is **experimental** and the interface may change between minor versions.

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

    import {FileObject, DirectoryObject, Cache} from '@gesslar/toolkit'
    import {Theme} from '@gesslar/sassy'

    const cwd = DirectoryObject.fromCwd()
    const file = new FileObject('my-theme.yaml', cwd)
    const cache = new Cache()

    const theme = new Theme(file, cwd, {
      outputDir: './dist',
      dryRun: false,
      silent: false,
    })

    theme.setCache(cache)

    await theme.load()
    await theme.build()

    const output = theme.getOutput()  // compiled theme object
    await theme.write()               // write to disk

`}</CodeBlock>

## Exported Classes

| Export | Description |
|--------|-------------|
| `Theme` | Theme lifecycle: load, build, write, dependency tracking |
| `Compiler` | Compilation pipeline (used internally by Theme) |
| `Evaluator` | Variable substitution and colour function evaluation |
| `Command` | Base class for CLI commands |
| `BuildCommand` | Build subcommand implementation |
| `LintCommand` | Lint subcommand and programmatic lint API |
| `ResolveCommand` | Resolve subcommand implementation |
| `Session` | Orchestrates theme processing sessions |
| `Colour` | Colour manipulation utilities (lighten, darken, mix, etc.) |

## Theme Class

### Constructor

<CodeBlock lang="javascript">{`

    new Theme(fileObject, cwd, options)

`}</CodeBlock>

| Parameter | Type | Description |
|-----------|------|-------------|
| `fileObject` | `FileObject` | Source theme file |
| `cwd` | `DirectoryObject` | Working directory for relative path resolution |
| `options` | `object` | Compilation options (`outputDir`, `dryRun`, `silent`, `nerd`) |

### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `setCache(cache)` | `this` | Set the file cache instance (required before `load()`) |
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
| `isReady()` | `boolean` | Check if source and cache are available |
| `isCompiled()` | `boolean` | Check if output, pool, and lookup are present |

## LintCommand (Programmatic Linting)

<CodeBlock lang="javascript">{`

    import {Cache, DirectoryObject, FileObject} from '@gesslar/toolkit'
    import {Theme, LintCommand} from '@gesslar/sassy'

    const cwd = DirectoryObject.fromCwd()
    const cache = new Cache()
    const file = new FileObject('my-theme.yaml', cwd)

    const theme = new Theme(file, cwd, {})
    theme.setCache(cache)
    await theme.load()
    await theme.build()

    const linter = new LintCommand({cwd, packageJson: {}})
    linter.setCache(cache)

    const results = await linter.lint(theme)
    // results.tokenColors          - array of tokenColors issues
    // results.semanticTokenColors  - array of semanticTokenColors issues
    // results.colors               - array of colors issues
    // results.variables            - array of variable issues

`}</CodeBlock>
