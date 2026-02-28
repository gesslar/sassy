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
          $(palette.white)
              → #e0e0e0
        → #e0e0e066

  Resolution: #e0e0e066
`}</CodeBlock>

You can read it top to bottom: `std.fg.inactive` is defined as `fade($(std.fg), 60)`. That references `$(std.fg)`, which references `$(main)`, which references `$(palette.white)` (from the `palette` section), which resolves to `#e0e0e0`. Back up the chain, the fade function produces `#e0e0e066`.

Note that `$$` aliases are expanded before resolution, so the trail always shows the canonical `palette.*` form — even if the source file used `$$white`.

### Trace a tokenColors scope

<CodeBlock lang="bash">{`

  npx @gesslar/sassy resolve ocean.yaml --tokenColor keyword

`}</CodeBlock>

This finds the `tokenColors` entry matching the given scope and traces its foreground value:

<CodeBlock lang="log">{`

  keyword (Keywords)

  $(scope.keyword)
    $(accent)
        $(palette.cyan)
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

#### Precedence-based fallback

If no exact match exists for the scope you request, Sassy falls back to TextMate precedence rules. It finds the most specific broader scope that would cover the requested scope:

<CodeBlock lang="bash">{`

  npx @gesslar/sassy resolve ocean.yaml --tokenColor comment.block.documentation

`}</CodeBlock>

If `comment.block.documentation` isn't explicitly defined but `comment` is, Sassy resolves through the broader scope and shows the relationship:

<CodeBlock lang="log">{`

  comment.block.documentation via comment in Universal Comments

  $(scope.comment)
    $(accent)
        $(palette.cyan)
          → #4a9eff
    → #4a9eff

  Resolution: #4a9eff

`}</CodeBlock>

This is useful for debugging which rule would actually apply to a given scope — even when it isn't explicitly listed in your theme.

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

## Seeing the Full Picture with Proof

While `resolve` traces a single token, sometimes you need to see the entire composed document — the full result of all your imports, overrides, and séance operators, before any evaluation happens.

<CodeBlock lang="bash">{`

  npx @gesslar/sassy proof ocean.yaml

`}</CodeBlock>

This outputs the complete merged theme as YAML — with all imports flattened, séance `^` operators replaced with their actual prior values, but all variable references and colour functions left untouched. It's exactly what the compiler sees before it starts evaluating.

This is especially useful when:

- You're working with multiple import layers and need to verify the merge order
- You want to confirm that séance derivations are referencing the right prior values
- Someone new to your theme needs to understand the full structure without reading the import graph
- You want to diff two theme variants to see exactly what changed

<CodeBlock lang="bash">{`

  # Compare a base theme to its hushed variant
  diff <(npx @gesslar/sassy proof blackboard.yaml) <(npx @gesslar/sassy proof blackboard-hushed.yaml)

`}</CodeBlock>

:::tip
Think of `proof` as the aerial photograph and `resolve` as the archaeological dig. Use proof to orient yourself, then resolve to investigate specific tokens.
:::

## What You've Learned

Over these seven pages you've gone from a single-file theme to:

- **Imports** for modular file organisation
- **Design systems** with palette, semantic, and scope layers
- **Multiple themes** from one shared system
- **Colour spaces** beyond hex codes
- **The full function toolkit** for colour manipulation
- **Linting** to catch issues early
- **Proof** to see the full composed document before evaluation
- **Resolve** to debug any value in your theme

You're ready to build anything. For complete specifications of every feature, see the [Reference](/docs/reference/theme-file) section.
