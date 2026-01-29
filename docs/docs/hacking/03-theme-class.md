---
sidebar_position: 3
title: "Theme Class"
---

`Theme.js` manages the complete lifecycle of a single theme entry file.

## Key Properties

| Property | Type | Description |
|---|---|---|
| `sourceFile` | `FileObject` | The entry theme file |
| `source` | `object` | Parsed YAML/JSON5 content |
| `output` | `object` | Final compiled VS Code theme JSON |
| `dependencies` | `Set<Dependency>` | Tracked import files for watch mode |
| `lookup` | `object` | Variable resolution data |
| `pool` | `ThemePool` | Token registry from compilation |
| `outputFileName` | `string` | Derived output filename (`.color-theme.json`) |

## Methods

### `load()`

Parses the source file. Format is auto-detected from the file extension (JSON5
or YAML). Populates `source` with the parsed content.

### `build(options?)`

Delegates compilation to `Compiler`. The compiler receives the `Theme` instance
and mutates it — setting output, lookup, and pool upon completion.

### `write(forceWrite?)`

Writes the compiled output as `.color-theme.json`. Uses sha256 hashing to skip
writes when the output has not changed. Supports dry-run mode via options.

Returns a `WriteStatus` symbol: `DRY_RUN`, `SKIPPED`, or `WRITTEN`.

### `addDependency(file, themeData)`

Registers an imported file as a dependency. Used by the compiler during import
resolution. Dependencies are tracked for watch mode so that changes to imported
files trigger recompilation.

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
