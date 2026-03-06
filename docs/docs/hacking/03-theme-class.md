---
sidebar_position: 3
title: "Theme Class"
---

`Theme.js` manages the complete lifecycle of a single theme entry file.

## Builder Pattern

As of v5, Theme uses a chainable builder instead of a constructor with arguments:

```javascript
const theme = new Theme()
  .setCwd(cwd)                          // DirectoryObject
  .setThemeFile(file)                   // FileObject (also derives theme name)
  .withOptions({outputDir: './dist'})   // compilation options
  .setCache(cache)                      // optional — load() falls back to direct file read
```

This makes Theme usable from both the CLI (which provides a cwd and options) and from an API consumer (which may only have a `FileObject`).

## Key Properties

| Property | Type | Description |
|---|---|---|
| `sourceFile` | `FileObject` | The entry theme file (set via `setThemeFile`) |
| `source` | `object` | Parsed YAML content |
| `output` | `object` | Final compiled VS Code theme JSON |
| `dependencies` | `Set<Dependency>` | Tracked import files for watch mode (each may carry a `YamlSource`) |
| `lookup` | `object` | Variable resolution data |
| `pool` | `ThemePool` | Token registry from compilation |
| `outputFileName` | `string` | Derived output filename (`.color-theme.json`) |
| `name` | `string` | Theme name, derived from `file.module` in `setThemeFile` |

## Methods

### `load()`

Parses the YAML source file. Uses `Cache.loadCachedData()` when a cache is set,
otherwise falls back to `FileObject.loadData()`. Populates `source` with the
parsed content. A `YamlSource` is created and attached so that source locations
are available for error reporting.

### `build(options?)`

Delegates compilation to `Compiler`. The compiler receives the `Theme` instance
and mutates it — setting output, lookup, and pool upon completion.

### `write(forceWrite?)`

Writes the compiled output as `.color-theme.json`. Uses sha256 hashing to skip
writes when the output has not changed. Supports dry-run mode via options.
Guards against missing output configuration (no cwd or outputDir).

Returns a `WriteStatus` symbol: `DRY_RUN`, `SKIPPED`, or `WRITTEN`.

### `addDependency(file, themeData)`

Registers an imported file as a dependency. Used by the compiler during import
resolution. Dependencies are tracked for watch mode so that changes to imported
files trigger recompilation.

### `findSourceLocation(dottedPath)`

Searches all dependencies (and the entry file itself) for a `YamlSource` that
maps the given dotted path to a source location. Returns `{file, line, column}`
when found, or `undefined` otherwise. Used by the Evaluator to enrich error
messages with precise origin information.

### `reset()`

Clears compilation state (output, lookup, pool, dependencies) for a clean
rebuild. Called before recompilation in watch mode.

## Watch Mode

Watch mode uses chokidar with stability controls:

- **`awaitWriteFinish`**: 100ms stability threshold with 50ms poll interval.
  Prevents triggering on partial writes.
- **Entry file changes**: trigger a full reload (re-parse source) plus
  dependency re-scan.
- **Import file changes**: trigger recompilation of affected themes.
- **During compilation**: watchers are paused to prevent cascading rebuilds
  from output file writes.
- **Output file**: explicitly excluded from the watch set.
