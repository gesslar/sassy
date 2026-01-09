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
      const fixturePath = TestUtils.getFixturePath("simple-theme.yaml")
      const themeFile = new FileObject(fixturePath)
      const theme = new Theme(themeFile, cwd, {})
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
      const fixturePath = TestUtils.getFixturePath("simple-theme.yaml")
      const themeFile = new FileObject(fixturePath)
      const theme = new Theme(themeFile, cwd, {})
      theme.setCache(cache)

      await theme.load()

      const compiler = new Compiler()
      await compiler.compile(theme)

      const output = theme.getOutput()
      // Variables should be resolved to hex values
      assert.ok(output.colors["editor.background"].startsWith("#"))
      assert.ok(output.colors["editor.foreground"].startsWith("#"))
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
      const themeFile = new FileObject(testPath)
      const theme = new Theme(themeFile, cwd, {})
      theme.setCache(cache)

      await theme.load()

      const compiler = new Compiler()
      await compiler.compile(theme)

      const output = theme.getOutput()
      assert.ok(output.colors["editor.background"].startsWith("#"))
    })
  })
})
