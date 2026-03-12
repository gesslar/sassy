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
 * @returns {Theme}
 */
function freshTheme() {
  const cwd = new DirectoryObject(__dirname)
  const cache = new Cache()
  const file = cwd.getFile("./fixtures/simple-theme.yaml")

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
