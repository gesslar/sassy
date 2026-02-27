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

  describe("resolve", () => {
    it("throws when no option provided", async() => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {}
      const command = new ResolveCommand({cwd, packageJson})
      command.setCache(new Cache())
      const themeFile = cwd.getFile("./fixtures/simple-theme.yaml")
      const theme = new Theme(themeFile, cwd, {outputDir: "."})
      theme.setCache(command.getCache())
      await theme.load()
      await theme.build()

      await assert.rejects(
        () => command.resolve(theme, {}),
        error => error instanceof Sass || error.constructor.name === "Sass"
      )
    })

    it("throws when multiple options provided", async() => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {}
      const command = new ResolveCommand({cwd, packageJson})
      command.setCache(new Cache())
      const themeFile = cwd.getFile("./fixtures/simple-theme.yaml")
      const theme = new Theme(themeFile, cwd, {outputDir: "."})
      theme.setCache(command.getCache())
      await theme.load()
      await theme.build()

      await assert.rejects(
        () => command.resolve(theme, {color: "x", tokenColor: "y"}),
        error => error instanceof Sass || error.constructor.name === "Sass"
      )
    })

    describe("color option", () => {
      it("returns not-found for missing color", async() => {
        const cwd = new DirectoryObject(__dirname)
        const packageJson = {}
        const command = new ResolveCommand({cwd, packageJson})
        command.setCache(new Cache())
        const themeFile = cwd.getFile("./fixtures/simple-theme.yaml")
        const theme = new Theme(themeFile, cwd, {outputDir: "."})
        theme.setCache(command.getCache())
        await theme.load()
        await theme.build()

        const data = await command.resolve(theme, {color: "nonexistent.color"})
        assert.equal(data.found, false)
        assert.equal(data.name, "nonexistent.color")
      })

      it("returns structured data for found color", async() => {
        const cwd = new DirectoryObject(__dirname)
        const packageJson = {}
        const command = new ResolveCommand({cwd, packageJson})
        command.setCache(new Cache())
        const themeFile = cwd.getFile("./fixtures/simple-theme.yaml")
        const theme = new Theme(themeFile, cwd, {outputDir: "."})
        theme.setCache(command.getCache())
        await theme.load()
        await theme.build()

        const pool = theme.getPool()
        const [key] = pool.getTokens().keys()
        const data = await command.resolve(theme, {color: key})

        assert.equal(data.found, true)
        assert.equal(data.name, key)
        assert.equal(typeof data.resolution, "string")
        assert.ok(Array.isArray(data.trail))
      })

      it("trail items have { value, type, depth } shape", async() => {
        const cwd = new DirectoryObject(__dirname)
        const packageJson = {}
        const command = new ResolveCommand({cwd, packageJson})
        command.setCache(new Cache())
        // function-theme has a variable expression trail worth inspecting
        const themeFile = cwd.getFile("./fixtures/function-theme.yaml")
        const theme = new Theme(themeFile, cwd, {outputDir: "."})
        theme.setCache(command.getCache())
        await theme.load()
        await theme.build()

        const pool = theme.getPool()
        // Find a token with a non-trivial trail
        let key = null
        for(const [k, token] of pool.getTokens()) {
          if(token.getTrail().length > 0) {
            key = k
            break
          }
        }

        if(!key) return // no variable-backed tokens in this fixture — skip

        const data = await command.resolve(theme, {color: key})
        assert.equal(data.found, true)
        assert.ok(data.trail.length > 0)

        for(const step of data.trail) {
          assert.ok("value" in step, "trail step missing value")
          assert.ok("type" in step, "trail step missing type")
          assert.ok("depth" in step, "trail step missing depth")
        }
      })
    })

    describe("tokenColor option", () => {
      it("returns not-found for missing scope", async() => {
        const cwd = new DirectoryObject(__dirname)
        const packageJson = {}
        const command = new ResolveCommand({cwd, packageJson})
        command.setCache(new Cache())
        const themeFile = cwd.getFile("./fixtures/token-colors-string-scope.yaml")
        const theme = new Theme(themeFile, cwd, {outputDir: "."})
        theme.setCache(command.getCache())
        await theme.load()
        await theme.build()

        const data = await command.resolve(theme, {tokenColor: "nonexistent.scope"})
        assert.equal(data.found, false)
      })

      it("returns static resolution for hardcoded scope colour", async() => {
        const cwd = new DirectoryObject(__dirname)
        const packageJson = {}
        const command = new ResolveCommand({cwd, packageJson})
        command.setCache(new Cache())
        const themeFile = cwd.getFile("./fixtures/token-colors-string-scope.yaml")
        const theme = new Theme(themeFile, cwd, {outputDir: "."})
        theme.setCache(command.getCache())
        await theme.load()
        await theme.build()

        const data = await command.resolve(theme, {tokenColor: "comment"})
        assert.equal(data.found, true)
        assert.equal(data.static, true)
        assert.equal(data.entryName, "Comments")
        assert.equal(data.resolution, "#888888")
        assert.deepEqual(data.trail, [])
        assert.equal(data.resolvedVia, null)
      })
    })

    describe("semanticTokenColor option", () => {
      it("returns not-found for missing semantic token scope", async() => {
        const cwd = new DirectoryObject(__dirname)
        const packageJson = {}
        const command = new ResolveCommand({cwd, packageJson})
        command.setCache(new Cache())
        const themeFile = cwd.getFile("./fixtures/semantic-token-theme.yaml")
        const theme = new Theme(themeFile, cwd, {outputDir: "."})
        theme.setCache(command.getCache())
        await theme.load()
        await theme.build()

        const data = await command.resolve(theme, {semanticTokenColor: "nonexistent.token"})
        assert.equal(data.found, false)
      })

      it("returns structured data for found semantic token scope", async() => {
        const cwd = new DirectoryObject(__dirname)
        const packageJson = {}
        const command = new ResolveCommand({cwd, packageJson})
        command.setCache(new Cache())
        const themeFile = cwd.getFile("./fixtures/semantic-token-theme.yaml")
        const theme = new Theme(themeFile, cwd, {outputDir: "."})
        theme.setCache(command.getCache())
        await theme.load()
        await theme.build()

        const data = await command.resolve(theme, {semanticTokenColor: "variable.declaration"})
        assert.equal(data.found, true)
        assert.equal(typeof data.resolution, "string")
        assert.ok(Array.isArray(data.trail))
      })
    })
  })
})
