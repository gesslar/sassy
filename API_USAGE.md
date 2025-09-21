# Sassy API Usage

This document shows how to use Sassy both as a CLI tool and as a programmatic API.

## CLI Usage (existing functionality)

```bash
# Install globally
npm install -g @gesslar/sassy

# Use the CLI
sassy build my-theme.json5
sassy lint my-theme.json5
sassy resolve my-theme.json5

# Or use with npx
npx @gesslar/sassy build my-theme.json5
```

## API Usage (new functionality)

### Basic Import

```javascript
// Import specific classes
import { Theme, LintCommand, Compiler } from '@gesslar/sassy'

// Or import everything
import * as Sassy from '@gesslar/sassy'
```

### Using Theme Programmatically

```javascript
import { Theme, DirectoryObject, FileObject, Cache } from '@gesslar/sassy'

// Create a theme instance
const cwd = new DirectoryObject(process.cwd())
const cache = new Cache()
const themeFile = new FileObject('my-theme.json5', cwd)

const theme = new Theme(themeFile, { /* options */ })
theme.setCache(cache)

// Load and build the theme
await theme.load()
await theme.build()

// Get the compiled output
const compiledTheme = theme.getOutput()
console.log(JSON.stringify(compiledTheme, null, 2))
```

### Using Commands Programmatically

```javascript
import { LintCommand, DirectoryObject } from '@gesslar/sassy'

// Create a lint command instance
const cwd = new DirectoryObject(process.cwd())
const lintCommand = new LintCommand({ cwd, packageJson: {} })

// Use the command programmatically
// (Note: You may need to adapt this based on the actual LintCommand API)
```

### Available Classes

- **Theme**: Core theme compilation
- **Compiler**: Theme compilation engine  
- **LintCommand**: Theme linting functionality
- **BuildCommand**: Theme building functionality
- **ResolveCommand**: Variable resolution functionality
- **FileObject**: File handling utilities
- **DirectoryObject**: Directory handling utilities
- **Cache**: Caching functionality
- **Data**: Data manipulation utilities
- **Sass**: Error handling
- And more...

### Mixed Usage

You can still access the CLI functionality even when using the API:

```javascript
// Import the CLI if needed (though this is unusual)
import './node_modules/@gesslar/sassy/src/cli.js'
```

## Package.json Exports

The package now supports multiple entry points:

- **Main import** (`import from '@gesslar/sassy'`): API access via `src/index.js`
- **CLI access** (`import from '@gesslar/sassy/cli'`): CLI script via `src/cli.js`
- **Binary**: CLI command via `sassy` command when installed