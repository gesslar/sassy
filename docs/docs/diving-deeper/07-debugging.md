---
sidebar_position: 7
title: "Debugging with Resolve"
---

import CodeBlock from "@site/src/components/CodeBlock"

When a colour doesn't look right and you're not sure why, `resolve` traces the
entire computation chain from your source expression down to the final hex
value.

## Three Resolution Modes

The resolve command takes your theme file and one of three flags:

### Trace a colour property

<CodeBlock lang="bash">{`

  npx @gesslar/sassy resolve ocean.yaml --color std.fg.inactive

`}</CodeBlock>

This resolves a variable from your `vars` or `colors` sections. The output shows every step:

<CodeBlock lang="log">{`
  std.fg.inactive:

  fade($(std.fg), 60)
    $(std.fg)
        $(main)
          $(colors.white)
              → #e0e0e0
        → #e0e0e066

  Resolution: #e0e0e066
`}</CodeBlock>

You can read it top to bottom: `std.fg.inactive` is defined as `fade($(std.fg), 60)`. That references `$(std.fg)`, which references `$(main)`, which references `$(colors.white)`, which resolves to `#e0e0e0`. Back up the chain, the fade function produces `#e0e0e066`.

### Trace a tokenColors scope

<CodeBlock lang="bash">{`

  npx @gesslar/sassy resolve ocean.yaml --tokenColor keyword

`}</CodeBlock>

This finds the `tokenColors` entry matching the given scope and traces its foreground value:

<CodeBlock lang="log">{`

  keyword (Keywords)

  $(scope.keyword)
    $(accent)
        $(colors.cyan)
          → #4a9eff
    → #4a9eff

  Resolution: #4a9eff

`}</CodeBlock>

If multiple `tokenColors` entries match the same scope, Sassy shows a disambiguation list:

<CodeBlock lang="log">{`

  Multiple entries found for 'keyword', please try again with the specific query:

  Keywords: keyword.1
  Control Flow: keyword.2

`}</CodeBlock>

Then resolve the specific one:

<CodeBlock lang="bash">{`

  npx @gesslar/sassy resolve ocean.yaml --tokenColor keyword.1

`}</CodeBlock>

### Trace a semanticTokenColors scope

<CodeBlock lang="bash">{`

  npx @gesslar/sassy resolve ocean.yaml --semanticTokenColor variable.readonly

`}</CodeBlock>

Works identically to `--tokenColor`, but looks in the `semanticTokenColors` section of your theme output.

## Reading the Output

The tree structure shows the dependency chain:

- **Top level** -- the expression as written in your source
- **Indented lines** -- variables being resolved, each level deeper
- **Resolved values** -- hex values at that point in the chain, shown with a colour swatch (`■`) in supported terminals or an arrow (`→`) otherwise

When something looks wrong, the tree tells you exactly where the unexpected value entered the chain.

## Alpha Colour Previews

When a resolved colour includes an alpha channel, Sassy shows two swatches: the colour composited against black and against white. This gives an immediate visual sense of how transparency affects the result.

To preview against a specific background instead, use `--bg`:

<CodeBlock lang="bash">{`

# Resolve the background colour first

  npx @gesslar/sassy resolve my-theme.yaml --color editor.background

# Then use it to preview an alpha colour in context

  npx @gesslar/sassy resolve my-theme.yaml --color listFilterWidget.noMatchesOutline --bg 1a1a1a

`}</CodeBlock>

:::tip
Pass the hex value without `#` to avoid shell comment interpretation, or wrap it in quotes: `--bg '#1a1a1a'`.
:::

## What You've Learned

Over these seven pages you've gone from a single-file theme to:

- **Imports** for modular file organisation
- **Design systems** with palette, semantic, and scope layers
- **Multiple themes** from one shared system
- **Colour spaces** beyond hex codes
- **The full function toolkit** for colour manipulation
- **Linting** to catch issues early
- **Resolve** to debug any value in your theme

You're ready to build anything. For complete specifications of every feature, see the [Reference](/docs/reference/theme-file) section.
