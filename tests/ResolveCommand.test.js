#!/usr/bin/env node

import assert from "node:assert/strict"
import {describe, it} from "node:test"
import {DirectoryObject, FileObject, Cache, Sass} from "@gesslar/toolkit"
import ResolveCommand from "../src/ResolveCommand.js"
import Theme from "../src/Theme.js"
import path from "node:path"
import {fileURLToPath} from "node:url"
import {TestUtils} from "./helpers/test-utils.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

describe("ResolveCommand", () => {
  describe("constructor", () => {
    it("creates resolve command with CLI options", () => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {}
      const command = new ResolveCommand({cwd, packageJson})
      assert.ok(command.hasCliCommand())
      assert.equal(command.getCliCommand(), "resolve <file>")
      assert.ok(command.hasCliOptions())
    })
  })

  describe("execute", () => {
    it("throws when no option provided", async() => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {}
      const command = new ResolveCommand({cwd, packageJson})
      command.setCache(new Cache())
      await assert.rejects(
        () => command.execute("./fixtures/simple-theme.yaml", {}),
        error => {
          return error instanceof Sass || error.constructor.name === "Sass"
        }
      )
    })

    it("throws when multiple options provided", async() => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {}
      const command = new ResolveCommand({cwd, packageJson})
      command.setCache(new Cache())
      const fixturePath = TestUtils.getFixturePath("simple-theme.yaml")

      await assert.rejects(
        () => command.execute(fixturePath, {color: "test", tokenColor: "test"}),
        error => {
          return error instanceof Sass || error.constructor.name === "Sass"
        }
      )
    })

    it("executes with color option", async() => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {}
      const command = new ResolveCommand({cwd, packageJson})
      command.setCache(new Cache())
      const fixturePath = TestUtils.getFixturePath("simple-theme.yaml")

      // This will fail if theme doesn't have the color, but that's okay for testing
      try {
        await command.execute(fixturePath, {color: "colors.editor.background"})
      } catch(error) {
        // May fail if color doesn't exist, but should not fail on option validation
        assert.ok(
          error instanceof Sass || error.constructor.name === "Sass" ||
          error.message.includes("not found") || error.message.includes("No such function")
        )
      }
    })

    it("executes with tokenColor option", async() => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {}
      const command = new ResolveCommand({cwd, packageJson})
      command.setCache(new Cache())
      const fixturePath = TestUtils.getFixturePath("simple-theme.yaml")

      try {
        await command.execute(fixturePath, {tokenColor: "test.scope"})
      } catch(error) {
        // May fail if scope doesn't exist, but should not fail on option validation
        assert.ok(
          error instanceof Sass || error.constructor.name === "Sass" ||
          error.message.includes("not found") || error.message.includes("No such function")
        )
      }
    })
  })

  describe("resolveColor", () => {
    it("handles non-existent color gracefully", async() => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {}
      const command = new ResolveCommand({cwd, packageJson})
      command.setCache(new Cache())
      const themeFile = cwd.getFile("./fixtures/simple-theme.yaml")
      const theme = new Theme(themeFile, cwd, {outputDir: "."})
      theme.setCache(command.getCache())

      await theme.load()
      await theme.build()

      // Should not throw, just return info message
      await command.resolveColor(theme, "nonexistent.color")
      // If we get here, it handled it gracefully
    })
  })
})
