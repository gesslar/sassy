---
title: "Hex"
---

Hex isn't really part of the Sassy family — think of it more as a neighbour who happens to be handy with a colour wheel. Where Sassy is all about *authoring* themes, Hex is about *validating* them.

**Hex** is a VS Code extension that validates your `.color-theme.json` files against the official VS Code workbench colour schema. It loads the schema directly from your running VS Code instance, so it's always up to date.

Or, as it puts it: *"Because while you may be valid, your theme is questionable."*

## What it does

- **Schema-aware validation** — checks colour format correctness, transparency requirements, deprecated properties, and unknown keys
- **Live revalidation** — watches your theme file and revalidates on every save
- **Filtering and search** — text search, regex, case-sensitive matching, error-only and warning-only filters
- **Click-to-navigate** — click a validation result to jump straight to that property in your editor
- **Coverage statistics** — see how many of VS Code's available colour properties your theme actually defines
- **Export** — export problems or missing properties to markdown

## Why it's useful alongside Sassy

Sassy compiles your YAML definitions into `.color-theme.json`. Hex validates that output. Together they make a nice workflow: author with Sassy, validate with Hex, and catch any gaps or issues before you ship.

That said, Hex works with any `.color-theme.json` — you don't need Sassy at all to use it.

## Get the extension

Install **Hex** from

- [Open VSX Registry](https://open-vsx.org/extension/gesslar/hex-theme-validator)
- [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=gesslar.hex-theme-validator)
