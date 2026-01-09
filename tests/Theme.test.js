#!/usr/bin/env node

import assert from "node:assert/strict"
import {describe, it} from "node:test"
import {FileObject, DirectoryObject, Cache} from "@gesslar/toolkit"
import Theme from "../src/Theme.js"
import path from "node:path"
import {fileURLToPath} from "node:url"
import {TestUtils} from "./helpers/test-utils.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

describe("Theme", () => {
  describe("constructor", () => {
    it("creates a theme instance with source file", () => {
      const cwd = new DirectoryObject(__dirname)
      const options = {}
      const fixturePath = TestUtils.getFixturePath("simple-theme.yaml")
      const themeFile = new FileObject(fixturePath)
      const theme = new Theme(themeFile, cwd, options)

      assert.ok(theme.isValid())
      assert.equal(theme.getSourceFile(), themeFile)
    })

    it("generates output filename from source file", () => {
      const cwd = new DirectoryObject(__dirname)
      const options = {}
      const fixturePath = TestUtils.getFixturePath("simple-theme.yaml")
      const themeFile = new FileObject(fixturePath)
      const theme = new Theme(themeFile, cwd, options)
      const outputName = theme.getOutputFileName()

      assert.ok(outputName.endsWith(".color-theme.json"))
    })
  })

  describe("load()", () => {
    it("loads and parses theme source file", async() => {
      const cwd = new DirectoryObject(__dirname)
      const options = {}
      const cache = new Cache()
      const fixturePath = TestUtils.getFixturePath("simple-theme.yaml")
      const themeFile = new FileObject(fixturePath)
      const theme = new Theme(themeFile, cwd, options)
      theme.setCache(cache)

      await theme.load()

      assert.ok(theme.hasSource())
      assert.ok(theme.sourceHasConfig())
      assert.ok(theme.sourceHasVars())
      assert.ok(theme.sourceHasTheme())
    })

    it("throws when source lacks config", async() => {
      const cwd = new DirectoryObject(__dirname)
      const options = {}
      const cache = new Cache()
      const invalidPath = TestUtils.getFixturePath("invalid-theme.yaml")

      // Create an invalid theme file
      await TestUtils.createTestFile(
        invalidPath,
        "vars:\n  primary: '#ff0000'"
      )

      const invalidFile = new FileObject(invalidPath)
      const theme = new Theme(invalidFile, cwd, options)
      theme.setCache(cache)

      await assert.rejects(
        () => theme.load(),
        /config/i
      )
    })

    it("skips loading when no cache is set", async() => {
      const cwd = new DirectoryObject(__dirname)
      const options = {}
      const fixturePath = TestUtils.getFixturePath("simple-theme.yaml")
      const themeFile = new FileObject(fixturePath)
      const theme = new Theme(themeFile, cwd, options)
      // Don't set cache

      await theme.load()

      assert.equal(theme.hasSource(), false)
    })
  })

  describe("build()", () => {
    it("compiles theme source to output", async() => {
      const cwd = new DirectoryObject(__dirname)
      const options = {}
      const cache = new Cache()
      const fixturePath = TestUtils.getFixturePath("simple-theme.yaml")
      const themeFile = new FileObject(fixturePath)
      const theme = new Theme(themeFile, cwd, options)
      theme.setCache(cache)

      await theme.load()
      await theme.build()

      assert.ok(theme.hasOutput())
      assert.ok(theme.isCompiled())
    })

    it("resolves variables in theme colors", async() => {
      const cwd = new DirectoryObject(__dirname)
      const options = {}
      const cache = new Cache()
      const fixturePath = TestUtils.getFixturePath("simple-theme.yaml")
      const themeFile = new FileObject(fixturePath)
      const theme = new Theme(themeFile, cwd, options)
      theme.setCache(cache)

      await theme.load()
      await theme.build()

      const output = theme.getOutput()
      assert.ok(output)
      assert.ok(output.colors)
      assert.ok(output.colors["editor.background"])
      // Should be resolved hex, not variable reference
      assert.ok(output.colors["editor.background"].startsWith("#"))
    })
  })

  describe("write()", () => {
    it("writes compiled theme to file", async() => {
      const testDir = await TestUtils.createTestDir("output")
      const cwd = new DirectoryObject(__dirname)
      const options = {outputDir: testDir}
      const cache = new Cache()
      const fixturePath = TestUtils.getFixturePath("simple-theme.yaml")
      const themeFile = new FileObject(fixturePath)
      const theme = new Theme(themeFile, cwd, options)
      theme.setCache(cache)

      await theme.load()
      await theme.build()

      const result = await theme.write()

      assert.ok(result.status.description === "written" || result.status.description === "skipped")
      assert.ok(result.file)
    })

    it("skips write when output unchanged", async() => {
      const testDir = await TestUtils.createTestDir("output")
      const cwd = new DirectoryObject(__dirname)
      const options = {outputDir: testDir}
      const cache = new Cache()
      const fixturePath = TestUtils.getFixturePath("simple-theme.yaml")
      const themeFile = new FileObject(fixturePath)
      const theme = new Theme(themeFile, cwd, options)
      theme.setCache(cache)

      await theme.load()
      await theme.build()

      const result1 = await theme.write()
      const result2 = await theme.write()

      assert.ok(result1.status.description === "written" || result1.status.description === "skipped")
      assert.ok(result2.status.description === "skipped")
    })

    it("outputs to stdout in dry-run mode", async() => {
      const cwd = new DirectoryObject(__dirname)
      const options = {dryRun: true}
      const cache = new Cache()
      const fixturePath = TestUtils.getFixturePath("simple-theme.yaml")
      const themeFile = new FileObject(fixturePath)
      const theme = new Theme(themeFile, cwd, options)
      theme.setCache(cache)

      await theme.load()
      await theme.build()

      const result = await theme.write()

      assert.ok(result.status.description === "dry-run")
    })
  })

  describe("state management", () => {
    it("tracks source state correctly", async() => {
      const cwd = new DirectoryObject(__dirname)
      const options = {}
      const cache = new Cache()
      const fixturePath = TestUtils.getFixturePath("simple-theme.yaml")
      const themeFile = new FileObject(fixturePath)
      const theme = new Theme(themeFile, cwd, options)
      theme.setCache(cache)

      assert.equal(theme.hasSource(), false)
      assert.equal(theme.sourceHasColors(), false)

      await theme.load()

      assert.ok(theme.hasSource())
      assert.ok(theme.sourceHasColors())
    })

    it("resets state correctly", async() => {
      const cwd = new DirectoryObject(__dirname)
      const options = {}
      const cache = new Cache()
      const fixturePath = TestUtils.getFixturePath("simple-theme.yaml")
      const themeFile = new FileObject(fixturePath)
      const theme = new Theme(themeFile, cwd, options)
      theme.setCache(cache)

      await theme.load()
      await theme.build()

      assert.ok(theme.hasOutput())

      theme.reset()

      assert.equal(theme.hasOutput(), false)
    })
  })

  describe("dependencies", () => {
    it("tracks theme dependencies", async() => {
      const cwd = new DirectoryObject(__dirname)
      const options = {}
      const cache = new Cache()
      const fixturePath = TestUtils.getFixturePath("simple-theme.yaml")
      const themeFile = new FileObject(fixturePath)
      const theme = new Theme(themeFile, cwd, options)
      theme.setCache(cache)

      await theme.load()
      await theme.build()

      const deps = theme.getDependencies()
      assert.ok(deps.size > 0)
    })
  })
})
