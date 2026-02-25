---
sidebar_position: 1.5
title: "Palette Inheritance"
---

import CodeBlock from "@site/src/components/CodeBlock"

You already know that the main file's `palette` overrides imported values. But sometimes you don't want to replace an imported colour — you want to *derive from it*. The séance operator lets you do exactly that.

## The Problem With Overriding

Say you have a shared palette:

<CodeBlock lang="yaml">{`

    # shared/palette.yaml

    palette:
      blue: oklch(0.5 0.2 210)
      teal: oklch(0.6 0.05 240)

`}</CodeBlock>

And you're building a muted variant. You could write:

<CodeBlock lang="yaml">{`

    # muted.yaml

    palette:
      blue: "#4a5568"
      teal: "#4a6065"

`}</CodeBlock>

But now you're managing two sets of hex codes and hoping they stay in sync. If the shared palette changes, your variant is wrong. You're not describing a *relationship* — you're describing a *copy*.

## Summoning the Past Self

The séance operator (`^`) references the prior value of the same key — whatever was accumulated from imports before this definition ran.

<CodeBlock lang="yaml">{`

    # muted.yaml

    palette:
      blue: desaturate(^, 40)
      teal: desaturate(^, 40)

`}</CodeBlock>

Now `blue` and `teal` are defined as *relationships* to the imported values. If the shared palette changes tomorrow, the muted variant recalculates automatically.

## Syntax Variants

The séance operator comes in three forms, matching the variable reference styles:

| Form | Syntax | Use when |
|------|--------|----------|
| Bare | `^` | Simple, unambiguous position |
| Parenthesised | `^()` | Adjacent to other parentheses |
| Braced | `^{}` | Adjacent to braces |

All three mean the same thing. `darken(^, 10)`, `darken(^(), 10)`, and `darken(^{}, 10)` are identical.

## A Real-World Variant

The grayscale-at-a-percentage use case is where this really shines:

<CodeBlock lang="yaml">{`

    # shared/palette.yaml

      palette:
        blue:   oklch(0.5 0.2 210)
        teal:   oklch(0.6 0.05 240)
        green:  oklch(0.765 0.125 168)
        purple: oklch(0.641 0.21 328)
        red:    oklch(0.672 0.215 25)

`}</CodeBlock>

<CodeBlock lang="yaml">{`

    # grayscale-variant.yaml

    config:
      name: "My Theme (Muted)"
      type: dark
      import:
        - ./shared/palette.yaml
        - ./shared/variables.yaml

    palette:
      blue:   grayscale(^)
      teal:   grayscale(^)
      green:  grayscale(^)
      purple: grayscale(^)
      red:    grayscale(^)

`}</CodeBlock>

Every semantic variable that references these palette entries (`accent`, `scope.keyword`, etc.) automatically resolves to the grayscale version. VS Code never sees the intermediate steps.

## Chaining Across Multiple Imports

The séance operator chains through import layers. Each definition in the chain references the accumulated value to that point:

<CodeBlock lang="yaml">{`

    # palette-base.yaml

    palette:
      teal: oklch(0.6 0.05 240)   # → #65859b

`}</CodeBlock>

<CodeBlock lang="yaml">{`

    # palette-shift.yaml

    palette:
      teal: darken(^, 5)          # → #5c7c92

`}</CodeBlock>

<CodeBlock lang="yaml">{`

    # palette-flip.yaml

    palette:
      teal: complement(^())       # → #8e715a

`}</CodeBlock>

<CodeBlock lang="yaml">{`

    # my-theme.yaml

    config:
      import:
        - ./palette-base.yaml
        - ./palette-shift.yaml
        - ./palette-flip.yaml

    palette:
      teal: lighten(^, 10)        # → #a0826a

`}</CodeBlock>

Each layer only needs to know "take whatever came before me and do this to it." No knowledge of hex codes, no duplication, no manual synchronisation.

## Debugging the Chain

The `resolve` command shows the full derivation trail:

<CodeBlock lang="bash">{`

  npx @gesslar/sassy resolve -c palette.teal my-theme.yaml

`}</CodeBlock>

<CodeBlock lang="text">{`

  palette.teal:

  lighten(^(teal), 10)
  ^(teal)
     complement(^(teal))
     ^(teal)
        darken(^(teal), 5)
        ^(teal)
           oklch(0.6 0.05 240)
              ■ #65859b
        darken(#65859b, 5)
           ■ #5c7c92
     complement(#5c7c92)
        ■ #8e715a
  lighten(#8e715a, 10)
     ■ #a0826a

  Resolution: #a0826a

`}</CodeBlock>

Each `^(teal)` in the output represents one séance step, showing exactly what value was summoned and what was done with it.

## Rules

- **Palette only.** The séance operator works in `palette` definitions. It does not apply in `vars` or `theme`.
- **Leaf values only.** It applies to string values. Object nodes have no prior value to reference.
- **Requires a prior.** If no imported file (or earlier import) has defined this key, `^` has nothing to summon and is left as a literal.
