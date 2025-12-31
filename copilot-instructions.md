# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Sassy is a VS Code theme engine that transforms SCSS-style YAML/JSON5 theme files into complete VS Code color themes. It provides semantic variables, color functions, and modular import systems to make theme development maintainable and expressive.

## Common Development Commands

### Building and Testing

```bash
# Build the package
npm run build

# Execute the CLI locally (for development)
npm run exec -- build examples/simple/midnight-ocean.yaml

# Lint the codebase
npm run lint

# Run examples validator (comprehensive testing)
npm run examples

# Update dependencies
npm run update

# Package for publishing
npm run submit
```

### CLI Commands (Development/Usage)

```bash
# Basic theme compilation
node src/cli.js build my-theme.yaml

# Watch mode for live development
node src/cli.js build my-theme.yaml --watch

# Resolve variable/token debugging
node src/cli.js resolve --color editor.background my-theme.yaml
node src/cli.js resolve --tokenColor keyword.control my-theme.yaml

# Lint themes for issues
node src/cli.js lint my-theme.yaml

# Dry run (output to stdout)
node src/cli.js build my-theme.yaml --dry-run

# Verbose debugging
node src/cli.js build my-theme.yaml --nerd
```

## High-Level Architecture

### Core Classes and Flow

**Theme Class (`src/Theme.js`)**

- Manages the complete lifecycle of a theme compilation unit
- Handles file loading, dependency tracking, watch mode, and output generation
- Each source file becomes a Theme instance with its own compilation context

**Compiler Class (`src/Compiler.js`)**

- Main compilation engine with 6-phase processing:
  1. Import resolution (merging modular files)
  2. Variable decomposition (flattening nested objects)
  3. Token evaluation (resolving `$(variable)` references)
  4. Function application (color manipulation via Culori)
  5. Dependency resolution (correct order resolution)
  6. Theme assembly (VS Code JSON output)

**Evaluator Class (`src/Evaluator.js`)**

- Handles variable substitution and function evaluation
- Works with ThemePool/ThemeToken system for resolution tracking
- Integrates with Culori for comprehensive color format support

**Command Classes (`src/*Command.js`)**

- BuildCommand: Theme compilation and watch mode
- ResolveCommand: Variable/token debugging with visual output
- LintCommand: Theme validation (duplicates, undefined vars, precedence issues)
- All extend base Command class with CLI integration

### Variable Resolution System

**ThemePool & ThemeToken**

- Central registry tracking all tokens and their relationships
- Enables detailed introspection for debugging via resolve command
- Supports circular dependency detection and resolution trails

**Variable Syntax (interchangeable)**

```yaml
$variable.path           # Short form
$(variable.path)         # Recommended (robust)
${variable.path}         # Braced form
```

### Import System Architecture

**Merge Behavior**

- Objects (`vars`, `colors`, `semanticTokenColors`): Deep merge with override semantics
- Arrays (`tokenColors`): Append-only concatenation (imports first, main file appended)
- Import order matters due to VS Code's first-match-wins tokenColors processing

**File Organization Pattern**

```
shared/
  colours.yaml       # Base color palette
  ui-colours.yaml    # VS Code UI color mappings
  syntax.yaml        # Syntax highlighting rules
my-theme.yaml        # Main theme importing shared components
```

## Code Style and Formatting Rules

### ESLint Configuration Philosophy

- **Anti-Prettier stance**: Manual spacing is intentional and aesthetic
- **Specific keyword spacing**: `if(condition)` vs `return value` (no space after `if`)
- **Mandatory padding**: Blank lines after control structures, variable declarations
- **JSDoc enforcement**: All public methods require documentation
- **2-space indentation**: Consistent throughout codebase

### Key Style Rules

- Arrow functions: `c =>` (as-needed parens)
- Braces: 1TBS style, no single-line blocks
- Quotes: Double quotes with template literal freedom
- Semicolons: Never (ASI preferred)
- Max line length: 80 characters (warnings only)

### Code Review Guidelines

- Focus on application logic, not formatting
- ESLint configuration is comprehensive and intentional
- Don't suggest Prettier or generic formatting changes
- Respect author's specific spacing and structure choices

## Testing Philosophy

This project follows "Deployment Driven Development":

- No testing frameworks implemented by design
- Live testing with real projects preferred
- Production deployments are comprehensive chaos engineering experiments
- ESLint and examples validator provide quality assurance
- Fork freely if you want to add testing frameworks

## Terminology and Reserved Words

From `TERMINOLOGY.txt` - RFC 11490 compliant:

- `foo`: Classic placeholder (often with bar/baz)
- `moo`: Enhanced placeholder with personality
- `kakadoodoo`: Sentinel string for impossible/absurd states (hard K pronunciation)

These appear intentionally in code for scaffolding and sentinel logic.

## Dependencies Architecture

**Toolkit Integration**: The project uses `@gesslar/toolkit` as a dependency for shared utilities:

- File operations (globby, json5, yaml parsing)
- Common development utilities
- Currently at version 0.0.3

**Current State**: The refactoring to move classes to toolkit appears to be in progress - some classes may still exist locally while transitioning to the external dependency.

## API Usage

Sassy supports both CLI and programmatic usage:

```javascript
import {Theme, Compiler} from '@gesslar/sassy'
// Note: Some utilities may come from toolkit in future versions
// import {FileObject, DirectoryObject} from '@gesslar/toolkit'

// Currently using local classes during refactoring
const fileObject = new FileObject('theme.yaml', cwd)
const theme = new Theme(fileObject, cwd, options)
await theme.load()
await theme.build()
const output = theme.getOutput()
```

## Development Patterns

### Error Handling

- Use `Sass.new(message, error).trace(context)` for error chain building
- `--nerd` flag provides full stack traces
- Professional ANSI color coding for CLI output

### File Operations

- All file I/O goes through Cache class for optimization
- FileObject/DirectoryObject from toolkit for path handling
- Hash-based output skipping prevents unnecessary writes

### Watch Mode Implementation

- Chokidar with stability controls (100ms threshold)
- Dependency tracking for selective recompilation
- Temporary watcher pausing during compilation to prevent cascades

### Extension Points

- Custom color functions (though Culori auto-support reduces need)
- Phase injectors for compilation pipeline
- Output format plugins for other editors
- Structured profiling/stats emission

## Copilot Instructions Integration

When reviewing PRs, focus on:

- Code quality and best practices alignment with ESLint config
- Performance considerations for compilation pipeline
- Security concerns in file operations and imports
- Architectural consistency with Theme/Compiler pattern
