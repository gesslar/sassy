---
sidebar_position: 1
title: "What is Sassy?"
---

import CodeBlock from "@site/src/components/CodeBlock"

## The Problem

VS Code themes are painful to maintain. A typical theme file is 800+ lines of
disconnected hex codes — no relationships, no structure, just raw values. Want
tweak your accent colour? Good luck finding every place it's used. Want a
slightly darker background for panels? Time to open a colour picker and
eyeball it.

<CodeBlock lang="json">{`

  {
    "editor.background": "#1a1a2e",
    "sideBar.background": "#242440",
    "panel.background": "#1e1e36",
    "statusBar.background": "#16162a"
  }

`}</CodeBlock>

Four shades of the same base colour, but nothing ties them together.
Change one and the others drift.

## The Solution

<CodeBlock lang="yaml">{`

  vars:
    bg: "#1a1a2e"
    bg.panel: lighten($(bg), 15)
    bg.status: darken($(bg), 10)

`}</CodeBlock>

Sassy lets you define themes using **variables**, **colour functions**, and
**semantic layers** — then compiles them into standard `.color-theme.json`
files that VS Code understands.

Instead of scattering hex codes, you build a design system:

Change `bg` once and everything derived from it updates automatically.

Sassy gives you:

- **Variables** with dot-path nesting and cross-references
- **Colour functions** powered by Culori — lighten, darken, mix, fade, and more
- **Imports** for splitting themes across files
- **Watch mode** for live development

## What You'll Build

By the end of this guide, you'll have a complete dark theme built from scratch —
with a colour palette, semantic variables, derived colours, syntax
highlighting, and UI styling. Each page adds one concept and ends with a
working build.

## Prerequisites

- **Node.js 22** or newer
- A terminal
- A text editor

That's it. No installation needed — we'll use `npx` to run Sassy directly.

## Ready?

Let's build your first theme.
