# Wiring up this Project

## When Adding New Features/Classes

### Step 0: Project Snapshot (current state)

- VS Code theme generator shipped as ESM with CLI (`src/cli.js`) and programmatic API (`src/index.js`)
- Package manager: **pnpm**
- Tooling commands (run these whenever you touch code):

  ```bash
  pnpm lint              # ESLint via @gesslar/uglier
  pnpm test              # node:test suite in tests/
  pnpm types             # Regenerate TypeScript definitions from JSDoc
  ```

- Node >= 22 required; repo is `type: "module"`
- CLI uses Commander.js with subcommands: `build`, `resolve`, `lint`

### Step 1: Validate the Logic Thoroughly

Before you write a single test, **audit your implementation**:

- **Edge Cases**: What happens with `null`, `undefined`, empty objects, missing keys?
- **Type Coercion**: Does your method handle non-expected types gracefully?
- **Error Boundaries**: Where can this blow up? Use `Sass.new(msg).trace(context)` for structured errors.
- **Performance**: Any obvious bottlenecks in colour resolution or file I/O?
- **Pattern Consistency**: Does it match the existing codebase's patterns, naming conventions, and style?

**CRITICAL**: Look for patterns like:

- Circular variable references (the ThemePool should detect these)
- Silent type failures (decide: throw or coerce?)
- Missing validation on theme config inputs
- Async operations without proper error handling
- Colour expressions that Culori can't parse

### Step 2: Wire Up Exports

Every new module/class must be exported correctly.

- **New source file**: Create in `src/Foo.js`
- **Export from `src/index.js`**: Use `export {default as Foo} from "./Foo.js"`
- **CLI subcommand**: If adding a new command, register it in `src/cli.js` and create a `FooCommand.js` extending `Command`
- **Keep exports coherent**: Class/file names should match (e.g., `ThemePool` lives in `ThemePool.js`)

### Step 3: Update Type Definitions

Type declarations are generated from JSDoc:

1. Add/adjust JSDoc on any public API you touch.
2. Regenerate: `pnpm types`
3. Check `types/` picked up new exports.

JSDoc expectations:

- Use `object`, `unknown`, `Array<Type>` (avoid `Object`, `Function`, or `any`)
- Prefer explicit function signatures in params/returns
- Keep docstrings concise but present on public APIs (eslint enforces)

### Step 4: Verify Integration

After code changes:

1. `pnpm lint`
2. `pnpm types` (when exports or JSDoc change)
3. `pnpm test`
4. If adding a CLI command, test it manually: `node ./src/cli.js <command> [args]`

### Step 5: Tests (required for this repo)

Tests use the built-in `node:test` runner and live in `tests/`.

- **Run everything**: `pnpm test`
- **Targeted runs**: `node --test tests/Colour.test.js`
- **Helpers**: `tests/helpers/` provides shared test utilities
- **Fixtures**: `tests/fixtures/` contains YAML/JSON5 theme files for testing

#### Test Template

```javascript
#!/usr/bin/env node

import assert from "node:assert/strict"
import {before, after, describe, it} from "node:test"

import {YourClass} from "@gesslar/sassy"

describe("YourClass", () => {
  before(() => {
    // setup if needed
  })

  after(() => {
    // cleanup
  })

  describe("methodName", () => {
    it("handles the happy path", () => {
      assert.equal(YourClass.methodName("input"), "expected")
    })

    it("guards against bad input", () => {
      assert.throws(() => YourClass.methodName(123), /expected/i)
    })
  })
})
```

Focus tests on:

- Edge cases (`null`, `undefined`, empty strings/arrays/objects)
- Error surfaces (message + error type)
- Colour function evaluation (lighten, darken, mix, alpha, etc.)
- Variable resolution chains and circular reference detection
- Theme compilation end-to-end (YAML in, JSON out)
- Import merging behaviour (objects deep merge, arrays append)

---

## Common Code Issues to Avoid

- **Circular variable references** - ThemePool detects these, but verify new variable patterns don't introduce them
- **Colour parsing failures** - Always validate Culori can parse the result; use structured Sass errors
- **Destructuring from `null`** - Use `[]` or `{}` as fallback
- **Silent type failures** - Decide: throw or coerce? Be explicit
- **Watch mode side effects** - Pause watchers during compilation to prevent cascade triggers
- **Hash collisions** - Output skipping relies on sha256; ensure hash covers full output

---

## Code Quality Standards

Every change should:

- Pass eslint (ALWAYS enforced)
- Handle edge cases (null, undefined, empty arrays, etc.)
- Include JSDoc for public APIs
- Match existing patterns in the codebase
- Use `Sass` errors with `.trace()` for meaningful error context

---

*Remember: Lint always, test always, document with JSDoc, and match existing patterns.*
