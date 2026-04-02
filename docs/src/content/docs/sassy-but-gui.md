---
title: "Sassy, but GUI"
---

**Sassy, but GUI** is a VS Code extension that brings Sassy directly into your editor as an interactive panel.

Open a `.sassy.yaml` file, click the colour-mode icon in the editor title bar (or run **Show Sassy Panel** from the command palette), and a live panel appears beside your editor.

## Features

### Diagnostics

Linting results organised by category: variables, workbench colours, token colours, and semantic token colours. Each issue is severity-tagged and expandable. Click links to jump directly to the source location in your theme file.

Workbench colour diagnostics are validated against the official VS Code theme schema via `@gesslar/vscode-theme-schema`, catching unknown properties, deprecated keys, and invalid values.

### Resolve

Pick any colour, token colour, or semantic token colour from your compiled theme output and trace its resolution chain step-by-step through variable references, palette lookups, seances, and colour expressions. Each step shows its type, value, a colour swatch, and a link to jump to its definition in source.

### Proof

View the fully composed YAML before evaluation. See how your theme file merges with all its dependencies — imports, palette inheritance, variable layering — and verify that everything resolves the way you expect.

### Palette

A visual swatch grid of every colour in your theme's palette, showing colour name, raw expression, and resolved hex value.

### Auto-Build

Toggle automatic theme compilation on every edit. A visual "dirty" indicator highlights when the on-disk JSON is stale. Manual build button available for one-off compiles.

### File Watching

The extension watches your theme file and all of its dependencies. Edit an imported palette or shared variables file and the panel rebuilds automatically.

## Commands

| Command | Description |
| --- | --- |
| **Show Sassy Panel** | Open the Sassy panel for the current theme file |
| **Build Theme** | Write the compiled theme JSON to disk |
| **Enable Auto-Build** | Automatically write on every rebuild |
| **Disable Auto-Build** | Stop automatic writes |

These commands appear in the editor title bar and explorer context menu when a `.sassy.yaml` file is selected.

## How it relates to the CLI

Sassy, but GUI doesn't replace the CLI — it complements it:

- **Sassy CLI** — batch processing, CI/CD, command-line workflows
- **Sassy, but GUI** — interactive development, real-time feedback, visual diagnostics

Both use the same underlying theme compilation engine (`@gesslar/sassy`), so a theme authored in the GUI behaves identically when compiled via the CLI.

## Get the extension

Install **Sassy, but GUI** from

- [Open VSX Registry](https://open-vsx.org/extension/gesslar/sassy-but-gui)
- [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=gesslar.sassy-but-gui)
