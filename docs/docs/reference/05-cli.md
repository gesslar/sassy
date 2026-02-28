---
sidebar_position: 5
title: "CLI Reference"
---

import CodeBlock from "@site/src/components/CodeBlock"

## Installation

<CodeBlock lang="bash">{`

    # Global install
    npm install -g @gesslar/sassy

    # Or use via npx
    npx @gesslar/sassy build my-theme.yaml

`}</CodeBlock>

## Commands

### build

Compile one or more theme files into VS Code `.color-theme.json` output.

<CodeBlock lang="bash">{`

    sassy build [options] <file...>

`}</CodeBlock>

| Option | Short | Description |
|--------|-------|-------------|
| `--watch` | `-w` | Watch all source and imported files; rebuild on changes |
| `--output-dir <dir>` | `-o` | Output directory (default: same directory as input file) |
| `--dry-run` | `-n` | Print compiled JSON to stdout instead of writing files |
| `--silent` | `-s` | Suppress all output except errors (and dry-run output) |
| `--nerd` | | Show full error stack traces |

**Examples:**

<CodeBlock lang="bash">{`
    # Build a single theme
    sassy build my-theme.yaml

    # Build multiple themes
    sassy build theme-dark.yaml theme-light.yaml

    # Build with watch mode and custom output directory
    sassy build --watch --output-dir ./dist my-theme.yaml

    # Preview output without writing
    sassy build --dry-run my-theme.json5

`}</CodeBlock>

**Output naming:** An input file named `midnight-ocean.yaml` produces `midnight-ocean.color-theme.json`.

**Hash-based skip:** On subsequent builds, Sassy computes a SHA-256 hash of the output. If the hash matches the existing file on disk, the write is skipped. This avoids unnecessary file-system events.

**Watch mode controls:**

| Key | Action |
|-----|--------|
| `F5` or `r` | Force rebuild all themes |
| `q` or `Ctrl-C` | Quit |

---

### resolve

Inspect the resolution trail of a specific colour, tokenColor scope, or semanticTokenColor.

<CodeBlock lang="bash">{`

    sassy resolve [options] <file>

`}</CodeBlock>

| Option | Short | Description |
|--------|-------|-------------|
| `--color <key>` | `-c` | Resolve a colour property (e.g., `editor.background`) |
| `--tokenColor <scope>` | `-t` | Resolve a tokenColors scope (e.g., `keyword.control`) |
| `--semanticTokenColor <token>` | `-s` | Resolve a semantic token colour |
| `--bg <hex>` | | Background colour for alpha swatch preview (e.g. `1a1a1a` or `'#1a1a1a'`) |
| `--nerd` | | Show full error stack traces |

The resolver options (`--color`, `--tokenColor`, `--semanticTokenColor`) are mutually exclusive -- specify exactly one per invocation.

#### Colour swatches

In colour-capable terminals, resolved hex values are displayed with a colour swatch (`■`) instead of an arrow. When a colour includes an alpha channel, two swatches are shown: the colour composited against black and against white, giving a quick visual sense of how transparency affects the result.

Use `--bg` to composite against a specific background colour instead:

<CodeBlock lang="bash">{`

    # First, find out what the background is
    sassy resolve --color editor.background my-theme.yaml

    # Then use that value to preview an alpha colour in context
    sassy resolve --color listFilterWidget.noMatchesOutline my-theme.yaml --bg 1a1a1a

`}</CodeBlock>

:::tip
Pass the hex value without `#` to avoid shell comment interpretation, or wrap it in quotes: `--bg '#1a1a1a'`.
:::

**Examples:**

<CodeBlock lang="bash">{`

    # Resolve a colour
    sassy resolve --color editor.background my-theme.yaml

    # Resolve a token colour scope
    sassy resolve --tokenColor keyword.control my-theme.yaml

    # Resolve a semantic token colour
    sassy resolve --semanticTokenColor variable.declaration my-theme.yaml

    # When multiple tokenColors entries match the same scope,
    # Sassy prompts for disambiguation:
    sassy resolve --tokenColor entity.name.class.2 my-theme.yaml

    # Resolve a scope that isn't explicitly defined — Sassy finds
    # the best matching broader scope via TextMate precedence:
    sassy resolve --tokenColor comment.block.documentation my-theme.yaml

`}</CodeBlock>

When no exact scope match exists, Sassy uses TextMate precedence rules to find the most specific broader scope that covers the requested scope. The output shows what was requested, what it resolved through, and the full trail.

---

### proof

Display the fully composed theme document after all imports, overrides, and séance operators are applied — but before any variable substitution or colour function evaluation.

<CodeBlock lang="bash">{`

    sassy proof [options] <file>

`}</CodeBlock>

| Option | Description |
|--------|-------------|
| `--nerd` | Show full error stack traces |

The output is YAML — the same language you author in. It shows:

- All imports resolved and merged into a single document
- Séance `^` operators replaced with the actual prior values (e.g. `shade(#4b8ebd, 25)`)
- All variable references (`$(std.bg)`, `$$blue`) left untouched
- All colour functions left unevaluated
- The `config.import` key removed (imports are already applied)

**Examples:**

<CodeBlock lang="bash">{`

    # See what the compiler will evaluate
    sassy proof my-theme.yaml

    # Pipe to a file for diffing
    sassy proof my-theme.yaml > composed.yaml

    # Compare two variants
    diff <(sassy proof blackboard.yaml) <(sassy proof blackboard-hushed.yaml)

`}</CodeBlock>

:::tip
Use `proof` to orient yourself in a layered theme before reaching for `resolve`. Proof is the aerial photograph; resolve is the archaeological dig.
:::

---

### lint

Validate a theme file for common issues.

<CodeBlock lang="bash">{`

    sassy lint [options] <file>

`}</CodeBlock>

| Option | Description |
|--------|-------------|
| `--strict` | Treat warnings (duplicate scopes, precedence issues) as errors — exits `1` if any are found |
| `--nerd` | Show full error stack traces |

**Example:**

<CodeBlock lang="bash">{`

    sassy lint my-theme.yaml

    # Fail on warnings too (useful in CI)
    sassy lint --strict my-theme.yaml

`}</CodeBlock>

See [Lint Rules](./07-lint-rules.md) for details on each check.

---

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success, or `lint` found only warnings/info. |
| `1` | Fatal error during compilation or file I/O; or `lint` found errors; or `lint --strict` found warnings. |
