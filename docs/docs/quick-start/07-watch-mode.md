---
sidebar_position: 7
title: "Watch Mode"
---

import CodeBlock from "@site/src/components/CodeBlock"

Tweaking colours one build at a time gets old fast. Watch mode rebuilds your theme automatically whenever you save.

## Start Watching

<CodeBlock lang="shell">{`

  npx @gesslar/sassy build ocean.yaml --watch

`}</CodeBlock>

Sassy monitors your theme file (and any imported files) for changes. Save `ocean.yaml` and the output regenerates instantly.

## Smart Output

Sassy computes a SHA-256 hash of the output before writing. If nothing actually changed — say you saved without editing — it skips the write entirely. This avoids triggering unnecessary VS Code reloads when you're working with auto-reload extensions.

## Useful Flags

**`--output-dir`** — Write the compiled theme to a specific directory instead of alongside the source file. Handy for writing directly into your VS Code extensions folder:

<CodeBlock lang="shell">{`

  npx @gesslar/sassy build ocean.yaml --watch --output-dir ~/.vscode/extensions/ocean-theme/

`}</CodeBlock>

**`--dry-run`** — Process the theme and report results without writing any files. Useful for validating your theme before committing changes.

<CodeBlock lang="shell">{`

  npx @gesslar/sassy build ocean.yaml --dry-run

`}</CodeBlock>

## What You've Learned

Over these seven pages, you've built a complete VS Code dark theme using Sassy. Here's what you covered:

1. **Theme structure** — `config`, `vars`, and `theme` sections
2. **Variables** — named values with dot-path nesting
3. **Colour palette** — raw colours and semantic aliases
4. **Colour functions** — `lighten()`, `darken()`, `fade()`, `mix()` for derived colours
5. **Token colours** — syntax highlighting with TextMate scopes
6. **UI styling** — status colours, panels, inputs, and activity bar
7. **Watch mode** — live rebuilds for rapid iteration

## Next Steps

The Quick Start covered the fundamentals. There's more to explore:

- **Imports** — split large themes across multiple files
- **Multiple themes** — share a palette between light and dark variants
- **Advanced colour functions** — the full set of Culori-powered transformations
- **Linting** — catch duplicate scopes, undefined variables, and precedence issues

Head to the **Diving Deeper** section to keep going.
