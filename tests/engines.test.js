#!/usr/bin/env node

import assert from "node:assert/strict"
import {describe, it} from "node:test"
import {DirectoryObject, Cache} from "@gesslar/toolkit"
import path from "node:path"
import {fileURLToPath} from "node:url"
import Theme from "../src/Theme.js"
import Resolve from "../src/Resolve.js"
import Proof from "../src/Proof.js"
import Lint from "../src/Lint.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Creates a fresh, unprepared theme (not loaded, not compiled).
 *
 * @param {string} fixture - Fixture filename (default: simple-theme.yaml)
 * @returns {Theme}
 */
function freshTheme(fixture = "simple-theme.yaml") {
  const cwd = new DirectoryObject(__dirname)
  const cache = new Cache()
  const file = cwd.getFile(`./fixtures/${fixture}`)

  return new Theme()
    .setCwd(cwd)
    .setThemeFile(file)
    .setOptions({outputDir: "."})
    .setCache(cache)
}

describe("Engine auto-prepare", () => {
  describe("Resolve", () => {
    it("auto-loads and builds an unprepared theme", async() => {
      const theme = freshTheme()

      assert.equal(theme.canBuild(), false)
      assert.equal(theme.isCompiled(), false)

      const resolver = new Resolve()
      const data = await resolver.color(
        theme, "editor.background"
      )

      assert.ok(data.found)
      assert.ok(data.resolution)
      assert.equal(theme.isCompiled(), true)
    })

    it("works with an already-compiled theme", async() => {
      const theme = freshTheme()

      await theme.load()
      await theme.build()

      const resolver = new Resolve()
      const data = await resolver.color(
        theme, "editor.background"
      )

      assert.ok(data.found)
    })

    it("returns not-found for missing colour keys", async() => {
      const theme = freshTheme()
      const resolver = new Resolve()
      const data = await resolver.color(theme, "no.such.key")

      assert.equal(data.found, false)
    })

    it("auto-prepares for tokenColor resolution", async() => {
      const theme = freshTheme()
      const resolver = new Resolve()
      const data = await resolver.tokenColor(
        theme, "no.such.scope"
      )

      assert.equal(data.found, false)
      assert.equal(theme.isCompiled(), true)
    })

    it("auto-prepares for semanticTokenColor resolution",
      async() => {
        const theme = freshTheme()
        const resolver = new Resolve()
        const data = await resolver.semanticTokenColor(
          theme, "no.such.scope"
        )

        assert.equal(data.found, false)
        assert.equal(theme.isCompiled(), true)
      })
  })

  describe("Resolve trail classification", () => {
    it("trail items have { value, type, depth } shape", async() => {
      const theme = freshTheme("function-theme.yaml")
      const resolver = new Resolve()
      const data = await resolver.color(theme, "editor.background")

      assert.equal(data.found, true)
      assert.ok(data.trail.length > 0)

      for(const step of data.trail) {
        assert.ok("value" in step, "trail step missing value")
        assert.ok("type" in step, "trail step missing type")
        assert.ok("depth" in step, "trail step missing depth")
      }
    })

    it("trail step types are valid classifications", async() => {
      const theme = freshTheme("function-theme.yaml")
      const resolver = new Resolve()
      const data = await resolver.color(theme, "editor.background")
      const validTypes = new Set(["variable", "expression", "literal", "resolved", "normalised"])

      for(const step of data.trail) {
        assert.ok(
          validTypes.has(step.type),
          `unexpected trail type "${step.type}" for value "${step.value}"`
        )
      }
    })

    it("classifies variable references as 'variable'", async() => {
      const theme = freshTheme("function-theme.yaml")
      const resolver = new Resolve()
      const data = await resolver.color(theme, "editor.background")
      const varSteps = data.trail.filter(s => s.type === "variable")

      assert.ok(varSteps.length > 0, "should have at least one variable step")

      for(const step of varSteps) {
        assert.ok(
          step.value.startsWith("$"),
          `variable step "${step.value}" should start with $`
        )
      }
    })

    it("classifies function calls as 'expression'", async() => {
      const theme = freshTheme("function-theme.yaml")
      const resolver = new Resolve()
      const data = await resolver.color(theme, "editor.background")
      const exprSteps = data.trail.filter(s => s.type === "expression")

      assert.ok(exprSteps.length > 0, "should have at least one expression step")

      for(const step of exprSteps) {
        assert.match(
          step.value, /\w+\(/,
          `expression step "${step.value}" should be a function call`
        )
      }
    })

    it("classifies computed hex values as 'resolved'", async() => {
      const theme = freshTheme("function-theme.yaml")
      const resolver = new Resolve()
      const data = await resolver.color(theme, "editor.background")
      const resolvedSteps = data.trail.filter(s => s.type === "resolved")

      assert.ok(resolvedSteps.length > 0, "should have at least one resolved step")

      for(const step of resolvedSteps) {
        assert.match(
          step.value, /^#[0-9a-fA-F]+$/,
          `resolved step "${step.value}" should be a hex colour`
        )
      }
    })

    it("classifies authored hex values as 'literal'", async() => {
      const theme = freshTheme("function-theme.yaml")
      const resolver = new Resolve()
      const data = await resolver.color(theme, "editor.background")
      const literalSteps = data.trail.filter(s => s.type === "literal")

      assert.ok(literalSteps.length > 0, "should have at least one literal step")

      for(const step of literalSteps) {
        assert.match(
          step.value, /^#[0-9a-fA-F]+$/,
          `literal step "${step.value}" should be a hex colour`
        )
      }
    })

    it("does not classify expressions or variables as 'resolved'", async() => {
      const theme = freshTheme("function-theme.yaml")
      const resolver = new Resolve()
      const data = await resolver.color(theme, "editor.background")
      const resolvedSteps = data.trail.filter(s => s.type === "resolved")

      for(const step of resolvedSteps) {
        assert.ok(
          !step.value.startsWith("$"),
          `resolved step "${step.value}" should not be a variable`
        )
        assert.doesNotMatch(
          step.value, /^\w+\(/,
          `resolved step "${step.value}" should not be a function call`
        )
      }
    })

    it("classifies normalised short hex as 'normalised'", async() => {
      const theme = freshTheme("short-hex-theme.yaml")
      const resolver = new Resolve()
      const data = await resolver.color(theme, "editor.background")

      // $(bg) -> #abc, normalised to #aabbcc
      // The original should be "literal", the expanded form "normalised"
      const literalSteps = data.trail.filter(s => s.type === "literal")
      const normalisedSteps = data.trail.filter(s => s.type === "normalised")
      const resolvedSteps = data.trail.filter(s => s.type === "resolved")

      assert.ok(
        literalSteps.some(s => s.value === "#abc"),
        "authored short hex should be literal"
      )
      assert.ok(
        normalisedSteps.some(s => s.value === "#aabbcc"),
        "expanded hex should be normalised"
      )
      assert.equal(
        resolvedSteps.length, 0,
        "hex normalisation should not produce resolved steps"
      )
    })

    it("simple variable-to-hex trail has no resolved steps", async() => {
      const theme = freshTheme("simple-theme.yaml")
      const resolver = new Resolve()
      const data = await resolver.color(theme, "editor.background")
      const resolvedSteps = data.trail.filter(s => s.type === "resolved")

      // $(background) -> #1a1a1a is a direct reference to an authored hex
      // so there should be no "resolved" steps — only variable + literal
      assert.equal(
        resolvedSteps.length, 0,
        "direct hex reference should not produce resolved steps"
      )

      const types = data.trail.map(s => s.type)

      assert.ok(types.includes("variable"), "should have a variable step")
      assert.ok(types.includes("literal"), "should have a literal step")
    })
  })

  describe("Proof", () => {
    it("auto-loads an unprepared theme", async() => {
      const theme = freshTheme()

      assert.equal(theme.canBuild(), false)

      const proof = new Proof()
      const result = await proof.run(theme)

      assert.ok(result)
      assert.ok(result.config || result.theme || result.vars)
    })

    it("works with an already-loaded theme", async() => {
      const theme = freshTheme()

      await theme.load()

      const proof = new Proof()
      const result = await proof.run(theme)

      assert.ok(result)
    })
  })

  describe("Lint", () => {
    it("auto-loads and builds an unprepared theme", async() => {
      const theme = freshTheme()

      assert.equal(theme.canBuild(), false)
      assert.equal(theme.isCompiled(), false)

      const lint = new Lint()
      const results = await lint.run(theme)

      assert.ok(results)
      assert.ok(Array.isArray(results[Lint.SECTIONS.TOKEN_COLORS]))
      assert.ok(
        Array.isArray(
          results[Lint.SECTIONS.SEMANTIC_TOKEN_COLORS]
        )
      )
      assert.ok(Array.isArray(results[Lint.SECTIONS.COLORS]))
      assert.equal(theme.isCompiled(), true)
    })

    it("works with an already-compiled theme", async() => {
      const theme = freshTheme()

      await theme.load()
      await theme.build()

      const lint = new Lint()
      const results = await lint.run(theme)

      assert.ok(results)
    })
  })
})
