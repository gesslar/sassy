---
sidebar_position: 5
title: "CLI Reference"
---

# CLI Reference

## Installation

```bash
# Global install
npm install -g @gesslar/sassy

# Or use via npx
npx @gesslar/sassy build my-theme.yaml
```

## Commands

### build

Compile one or more theme files into VS Code `.color-theme.json` output.

```
sassy build [options] <file...>
```

| Option | Short | Description |
|--------|-------|-------------|
| `--watch` | `-w` | Watch all source and imported files; rebuild on changes |
| `--output-dir <dir>` | `-o` | Output directory (default: same directory as input file) |
| `--dry-run` | `-n` | Print compiled JSON to stdout instead of writing files |
| `--silent` | `-s` | Suppress all output except errors (and dry-run output) |
| `--nerd` | | Show full error stack traces |

**Examples:**

```bash
# Build a single theme
sassy build my-theme.yaml

# Build multiple themes
sassy build theme-dark.yaml theme-light.yaml

# Build with watch mode and custom output directory
sassy build --watch --output-dir ./dist my-theme.yaml

# Preview output without writing
sassy build --dry-run my-theme.json5
```

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

```
sassy resolve [options] <file>
```

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

```bash
# First, find out what the background is
sassy resolve --color editor.background my-theme.yaml

# Then use that value to preview an alpha colour in context
sassy resolve --color listFilterWidget.noMatchesOutline my-theme.yaml --bg 1a1a1a
```

:::tip
Pass the hex value without `#` to avoid shell comment interpretation, or wrap it in quotes: `--bg '#1a1a1a'`.
:::

**Examples:**

```bash
# Resolve a colour
sassy resolve --color editor.background my-theme.yaml

# Resolve a token colour scope
sassy resolve --tokenColor keyword.control my-theme.yaml

# When multiple tokenColors entries match the same scope,
# Sassy prompts for disambiguation:
sassy resolve --tokenColor entity.name.class.2 my-theme.yaml
```

---

### lint

Validate a theme file for common issues.

```
sassy lint [options] <file>
```

| Option | Description |
|--------|-------------|
| `--nerd` | Show full error stack traces |

**Example:**

```bash
sassy lint my-theme.yaml
```

See [Lint Rules](./07-lint-rules.md) for details on each check.

---

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success. `lint` always exits 0, even when issues are found. |
| `1` | Fatal error during compilation or file I/O. |
