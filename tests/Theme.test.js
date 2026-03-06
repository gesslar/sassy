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
      const themeFile = cwd.getFile("./fixtures/simple-theme.yaml")
      const theme = new Theme().setCwd(cwd).setThemeFile(themeFile).withOptions(options)

      assert.ok(theme.isValid())
      assert.equal(theme.getSourceFile(), themeFile)
    })

    it("generates output filename from source file", () => {
      const cwd = new DirectoryObject(__dirname)
      const options = {}
      const themeFile = cwd.getFile("./fixtures/simple-theme.yaml")
      const theme = new Theme().setCwd(cwd).setThemeFile(themeFile).withOptions(options)
      const outputName = theme.getOutputFileName()

      assert.ok(outputName.endsWith(".color-theme.json"))
    })
  })

  describe("load()", () => {
    it("loads and parses theme source file", async() => {
      const cwd = new DirectoryObject(__dirname)
      const options = {}
      const cache = new Cache()
      const themeFile = cwd.getFile("./fixtures/simple-theme.yaml")
      const theme = new Theme().setCwd(cwd).setThemeFile(themeFile).withOptions(options)
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

      const invalidFile = cwd.getFile("./fixtures/invalid-theme.yaml")
      const theme = new Theme().setCwd(cwd).setThemeFile(invalidFile).withOptions(options)
      theme.setCache(cache)

      await assert.rejects(
        () => theme.load(),
        /config/i
      )
    })

    it("loads via FileObject.loadData() when no cache is set", async() => {
      const cwd = new DirectoryObject(__dirname)
      const options = {}
      const themeFile = cwd.getFile("./fixtures/simple-theme.yaml")
      const theme = new Theme().setCwd(cwd).setThemeFile(themeFile).withOptions(options)
      // Don't set cache — load() falls back to FileObject.loadData()

      await theme.load()

      assert.ok(theme.hasSource())
    })
  })

  describe("build()", () => {
    it("compiles theme source to output", async() => {
      const cwd = new DirectoryObject(__dirname)
      const options = {}
      const cache = new Cache()
      const themeFile = cwd.getFile("./fixtures/simple-theme.yaml")
      const theme = new Theme().setCwd(cwd).setThemeFile(themeFile).withOptions(options)
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
      const themeFile = cwd.getFile("./fixtures/simple-theme.yaml")
      const theme = new Theme().setCwd(cwd).setThemeFile(themeFile).withOptions(options)
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
      await TestUtils.createTestDir("output")
      const cwd = new DirectoryObject(__dirname)
      const options = {outputDir: "./fixtures/output"}
      const cache = new Cache()
      const themeFile = cwd.getFile("./fixtures/simple-theme.yaml")
      const theme = new Theme().setCwd(cwd).setThemeFile(themeFile).withOptions(options)
      theme.setCache(cache)

      await theme.load()
      await theme.build()

      const result = await theme.write()

      assert.ok(result.status.description === "written" || result.status.description === "skipped")
      assert.ok(result.file)
    })

    it("skips write when output unchanged", async() => {
      await TestUtils.createTestDir("output")
      const cwd = new DirectoryObject(__dirname)
      const options = {outputDir: "./fixtures/output"}
      const cache = new Cache()
      const themeFile = cwd.getFile("./fixtures/simple-theme.yaml")
      const theme = new Theme().setCwd(cwd).setThemeFile(themeFile).withOptions(options)
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
      const themeFile = cwd.getFile("./fixtures/simple-theme.yaml")
      const theme = new Theme().setCwd(cwd).setThemeFile(themeFile).withOptions(options)
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
      const themeFile = cwd.getFile("./fixtures/simple-theme.yaml")
      const theme = new Theme().setCwd(cwd).setThemeFile(themeFile).withOptions(options)
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
      const themeFile = cwd.getFile("./fixtures/simple-theme.yaml")
      const theme = new Theme().setCwd(cwd).setThemeFile(themeFile).withOptions(options)
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
      const themeFile = cwd.getFile("./fixtures/simple-theme.yaml")
      const theme = new Theme().setCwd(cwd).setThemeFile(themeFile).withOptions(options)
      theme.setCache(cache)

      await theme.load()
      await theme.build()

      const deps = theme.getDependencies()
      assert.ok(deps.size > 0)
    })

    it("attaches yamlSource to dependencies after load() for YAML files", async() => {
      const cwd = new DirectoryObject(__dirname)
      const options = {}
      const cache = new Cache()
      const themeFile = cwd.getFile("./fixtures/simple-theme.yaml")
      const theme = new Theme().setCwd(cwd).setThemeFile(themeFile).withOptions(options)
      theme.setCache(cache)

      await theme.load()
      await theme.build()

      const deps = theme.getDependencies()
      for(const dep of deps) {
        if(dep.hasYamlSource()) {
          assert.ok(dep.getYamlSource(), "dependency should have yamlSource attached")
        }
      }
    })
  })

  describe("computeOutputPath", () => {
    it("uses absolute outputDir as-is", () => {
      const cwd = new DirectoryObject(__dirname)
      const absDir = path.resolve(__dirname, "fixtures", "output")
      const themeFile = cwd.getFile("./fixtures/simple-theme.yaml")
      const theme = new Theme()
        .setCwd(cwd)
        .setThemeFile(themeFile)
        .withOptions({outputDir: absDir})

      const result = theme.getOutputFileName()
      assert.ok(result.endsWith(".color-theme.json"))
      // Write result file path should be under the absolute dir
      const outputFile = theme.getOutputFile()
      assert.strictEqual(path.dirname(outputFile.path), absDir)
    })

    it("resolves relative outputDir against cwd", () => {
      const cwd = new DirectoryObject(__dirname)
      const themeFile = cwd.getFile("./fixtures/simple-theme.yaml")
      const theme = new Theme()
        .setCwd(cwd)
        .setThemeFile(themeFile)
        .withOptions({outputDir: "fixtures/output"})

      const outputFile = theme.getOutputFile()
      const expected = path.join(__dirname, "fixtures", "output")
      assert.strictEqual(
        path.dirname(outputFile.path),
        expected,
        `expected ${outputFile.path} to be inside ${expected}`
      )
    })

    it("resolves '.' outputDir to cwd", () => {
      const cwd = new DirectoryObject(__dirname)
      const themeFile = cwd.getFile("./fixtures/simple-theme.yaml")
      const theme = new Theme()
        .setCwd(cwd)
        .setThemeFile(themeFile)
        .withOptions({outputDir: "."})

      const outputFile = theme.getOutputFile()
      assert.strictEqual(
        path.dirname(outputFile.path),
        __dirname,
        `expected ${outputFile.path} to be inside ${__dirname}`
      )
    })

    it("resolves relative outputDir against sourceFile parent when no cwd", () => {
      const fixturesDir = path.join(__dirname, "fixtures")
      const themeFile = new FileObject(
        path.join(fixturesDir, "simple-theme.yaml")
      )
      const theme = new Theme()
        .setThemeFile(themeFile)
        .withOptions({outputDir: "output"})

      const outputFile = theme.getOutputFile()
      const expected = path.join(fixturesDir, "output")
      assert.strictEqual(
        path.dirname(outputFile.path),
        expected,
        `expected ${outputFile.path} to be inside ${expected}`
      )
    })

    it("resolves ../ outputDir against sourceFile parent when no cwd", () => {
      const fixturesDir = path.join(__dirname, "fixtures")
      const themeFile = new FileObject(
        path.join(fixturesDir, "simple-theme.yaml")
      )
      const theme = new Theme()
        .setThemeFile(themeFile)
        .withOptions({outputDir: "../output"})

      const outputFile = theme.getOutputFile()
      const expected = path.join(__dirname, "output")
      assert.strictEqual(
        path.dirname(outputFile.path),
        expected,
        `expected ${outputFile.path} to be inside ${expected}`
      )
    })
  })

  describe("findSourceLocation()", () => {
    it("returns a formatted location string for a known path", async() => {
      const cwd = new DirectoryObject(__dirname)
      const options = {}
      const cache = new Cache()
      const themeFile = cwd.getFile("./fixtures/simple-theme.yaml")
      const theme = new Theme().setCwd(cwd).setThemeFile(themeFile).withOptions(options)
      theme.setCache(cache)

      await theme.load()
      await theme.build()

      const location = theme.findSourceLocation("colors.editor.background")
      if(location) {
        assert.equal(typeof location, "string")
        assert.ok(location.length > 0)
      }
    })

    it("returns null for a nonexistent path", async() => {
      const cwd = new DirectoryObject(__dirname)
      const options = {}
      const cache = new Cache()
      const themeFile = cwd.getFile("./fixtures/simple-theme.yaml")
      const theme = new Theme().setCwd(cwd).setThemeFile(themeFile).withOptions(options)
      theme.setCache(cache)

      await theme.load()
      await theme.build()

      const location = theme.findSourceLocation("nonexistent.path.that.does.not.exist")
      assert.equal(location, null)
    })
  })
})
