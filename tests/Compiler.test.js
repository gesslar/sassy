#!/usr/bin/env node

import assert from "node:assert/strict"
import {describe, it} from "node:test"
import {FileObject, DirectoryObject, Cache} from "@gesslar/toolkit"
import Theme from "../src/Theme.js"
import Compiler from "../src/Compiler.js"
import path from "node:path"
import {fileURLToPath} from "node:url"
import {TestUtils} from "./helpers/test-utils.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

describe("Compiler", () => {
  describe("compile()", () => {
    it("compiles a simple theme", async() => {
      const cwd = new DirectoryObject(__dirname)
      const cache = new Cache()
      const themeFile = cwd.getFile("./fixtures/simple-theme.yaml")
      const theme = new Theme(themeFile, cwd, {outputDir: "."})
      theme.setCache(cache)

      await theme.load()

      const compiler = new Compiler()
      await compiler.compile(theme)

      assert.ok(theme.hasOutput())
      const output = theme.getOutput()
      assert.ok(output.name)
      assert.ok(output.type)
      assert.ok(output.colors)
    })

    it("resolves variables correctly", async() => {
      const cwd = new DirectoryObject(__dirname)
      const cache = new Cache()
      const themeFile = cwd.getFile("./fixtures/simple-theme.yaml")
      const theme = new Theme(themeFile, cwd, {outputDir: "."})
      theme.setCache(cache)

      await theme.load()

      const compiler = new Compiler()
      await compiler.compile(theme)

      const output = theme.getOutput()
      // Variables should be resolved to hex values
      assert.ok(output.colors["editor.background"].startsWith("#"))
      assert.ok(output.colors["editor.foreground"].startsWith("#"))
    })

    it("resolves palette references via $$ syntax", async() => {
      const testThemeContent = `config:
  $schema: vscode://schemas/color-theme
  name: Palette Test
  type: dark
palette:
  blue: "#2d5a87"
  cyan: "#4a9eff"
vars:
  accent: "$$cyan"
  main: "$$blue"
theme:
  colors:
    "editor.background": $(main)
    "editor.foreground": $(accent)
`

      const testPath = TestUtils.getFixturePath("palette-theme.yaml")
      await TestUtils.createTestFile(testPath, testThemeContent)

      const cwd = new DirectoryObject(__dirname)
      const cache = new Cache()
      const themeFile = cwd.getFile("./fixtures/palette-theme.yaml")
      const theme = new Theme(themeFile, cwd, {outputDir: "."})
      theme.setCache(cache)

      await theme.load()

      const compiler = new Compiler()
      await compiler.compile(theme)

      const output = theme.getOutput()
      assert.equal(output.colors["editor.background"], "#2d5a87")
      assert.equal(output.colors["editor.foreground"], "#4a9eff")
    })

    it("resolves palette self-references and colour functions", async() => {
      const testThemeContent = `config:
  $schema: vscode://schemas/color-theme
  name: Palette Func Test
  type: dark
palette:
  blue: "#2d5a87"
  lightBlue: "lighten($$blue, 20)"
vars:
  accent: "$$lightBlue"
theme:
  colors:
    "editor.background": $(accent)
`

      const testPath = TestUtils.getFixturePath("palette-func-theme.yaml")
      await TestUtils.createTestFile(testPath, testThemeContent)

      const cwd = new DirectoryObject(__dirname)
      const cache = new Cache()
      const themeFile = cwd.getFile("./fixtures/palette-func-theme.yaml")
      const theme = new Theme(themeFile, cwd, {outputDir: "."})
      theme.setCache(cache)

      await theme.load()

      const compiler = new Compiler()
      await compiler.compile(theme)

      const output = theme.getOutput()
      assert.ok(output.colors["editor.background"].startsWith("#"))
      assert.notEqual(output.colors["editor.background"], "#2d5a87")
    })

    it("handles colour functions", async() => {
      const testThemeContent = `config:
  $schema: vscode://schemas/color-theme
  name: Test Theme
  type: dark
vars:
  primary: "#4b8ebd"
  bg: lighten($(primary), 20)
theme:
  colors:
    "editor.background": $(bg)
`

      const testPath = TestUtils.getFixturePath("function-theme.yaml")
      await TestUtils.createTestFile(testPath, testThemeContent)

      const cwd = new DirectoryObject(__dirname)
      const cache = new Cache()
      const themeFile = cwd.getFile("./fixtures/function-theme.yaml")
      const theme = new Theme(themeFile, cwd, {outputDir: "."})
      theme.setCache(cache)

      await theme.load()

      const compiler = new Compiler()
      await compiler.compile(theme)

      const output = theme.getOutput()
      assert.ok(output.colors["editor.background"].startsWith("#"))
    })

    it("compiles semanticTokenColors with object and string values", async() => {
      const testThemeContent = `config:
  $schema: vscode://schemas/color-theme
  name: Semantic Token Test
  type: dark
palette:
  yellow: "#ffd93d"
vars:
  accent: "#4a9eff"
  fg: "#e6e6e6"
theme:
  colors:
    "editor.background": "#1a1a1a"
  semanticTokenColors:
    variable.declaration:
      foreground: $(fg)
      fontStyle: italic
    function.declaration:
      foreground: $(accent)
      fontStyle: bold
    "string:escape": $$yellow
`

      const testPath = TestUtils.getFixturePath("semantic-token-theme.yaml")
      await TestUtils.createTestFile(testPath, testThemeContent)

      const cwd = new DirectoryObject(__dirname)
      const cache = new Cache()
      const themeFile = cwd.getFile("./fixtures/semantic-token-theme.yaml")
      const theme = new Theme(themeFile, cwd, {outputDir: "."})
      theme.setCache(cache)

      await theme.load()

      const compiler = new Compiler()
      await compiler.compile(theme)

      const output = theme.getOutput()

      // Object-style entries should produce nested objects
      assert.deepEqual(output.semanticTokenColors["variable.declaration"], {
        foreground: "#e6e6e6",
        fontStyle: "italic",
      })
      assert.deepEqual(output.semanticTokenColors["function.declaration"], {
        foreground: "#4a9eff",
        fontStyle: "bold",
      })

      // String-style entry should remain a plain string
      assert.equal(output.semanticTokenColors["string:escape"], "#ffd93d")
    })
  })
})
