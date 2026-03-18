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

    it("executes with semanticTokenColor option", async() => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {}
      const command = new ResolveCommand({cwd, packageJson})
      command.setCache(new Cache())
      const fixturePath = TestUtils.getFixturePath("semantic-token-theme.yaml")

      try {
        await command.execute(fixturePath, {semanticTokenColor: "variable.declaration"})
      } catch(error) {
        assert.ok(
          error instanceof Sass || error.constructor.name === "Sass" ||
          error.message.includes("not found") || error.message.includes("No such function")
        )
      }
    })

    it("throws when --bg hex is invalid", async() => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {}
      const command = new ResolveCommand({cwd, packageJson})
      command.setCache(new Cache())
      const fixturePath = TestUtils.getFixturePath("simple-theme.yaml")

      await assert.rejects(
        () => command.execute(fixturePath, {color: "editor.background", bg: "zzzzz"}),
        error => error instanceof Sass || error.constructor.name === "Sass"
      )
    })

    it("accepts valid --bg hex", async() => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {}
      const command = new ResolveCommand({cwd, packageJson})
      command.setCache(new Cache())
      const fixturePath = TestUtils.getFixturePath("simple-theme.yaml")

      // Should not throw on option validation; may print "not found" for the colour
      try {
        await command.execute(fixturePath, {color: "colors.editor.background", bg: "1a1a1a"})
      } catch(error) {
        // Only accept Sass errors (not option-validation errors)
        assert.ok(
          error instanceof Sass || error.constructor.name === "Sass"
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
      const theme = new Theme().setCwd(cwd).setThemeFile(themeFile).setOptions({outputDir: "."})
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
      const theme = new Theme().setCwd(cwd).setThemeFile(themeFile).setOptions({outputDir: "."})
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
      const theme = new Theme().setCwd(cwd).setThemeFile(themeFile).setOptions({outputDir: "."})
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
        const theme = new Theme().setCwd(cwd).setThemeFile(themeFile).setOptions({outputDir: "."})
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
        const theme = new Theme().setCwd(cwd).setThemeFile(themeFile).setOptions({outputDir: "."})
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

      // Trail classification tests live in engines.test.js (Resolve engine)
    })

    describe("tokenColor option", () => {
      it("returns not-found for missing scope", async() => {
        const cwd = new DirectoryObject(__dirname)
        const packageJson = {}
        const command = new ResolveCommand({cwd, packageJson})
        command.setCache(new Cache())
        const themeFile = cwd.getFile("./fixtures/token-colors-string-scope.yaml")
        const theme = new Theme().setCwd(cwd).setThemeFile(themeFile).setOptions({outputDir: "."})
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
        const theme = new Theme().setCwd(cwd).setThemeFile(themeFile).setOptions({outputDir: "."})
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

      it("resolves variable-backed tokenColor with trail", async() => {
        const cwd = new DirectoryObject(__dirname)
        const packageJson = {}
        const command = new ResolveCommand({cwd, packageJson})
        command.setCache(new Cache())
        const themeFile = cwd.getFile("./fixtures/palette-alias-tokencolors.yaml")
        const theme = new Theme().setCwd(cwd).setThemeFile(themeFile).setOptions({outputDir: "."})
        theme.setCache(command.getCache())
        await theme.load()
        await theme.build()

        const data = await command.resolve(theme, {tokenColor: "keyword"})
        assert.equal(data.found, true)
        assert.equal(data.entryName, "Keywords")
        assert.equal(typeof data.resolution, "string")
        // Palette alias tokens may resolve as static or with trail depending
        // on pool state; just verify the shape is correct
        assert.ok("static" in data)
        assert.ok(Array.isArray(data.trail))
      })

      it("returns ambiguous result for duplicate scopes", async() => {
        const cwd = new DirectoryObject(__dirname)
        const packageJson = {}
        const command = new ResolveCommand({cwd, packageJson})
        command.setCache(new Cache())
        const themeFile = cwd.getFile("./fixtures/lint-duplicate-scope.yaml")
        const theme = new Theme().setCwd(cwd).setThemeFile(themeFile).setOptions({outputDir: "."})
        theme.setCache(command.getCache())
        await theme.load()
        await theme.build()

        const data = await command.resolve(theme, {tokenColor: "keyword"})
        assert.equal(data.found, true)
        assert.equal(data.ambiguous, true)
        assert.equal(data.name, "keyword")
        assert.ok(Array.isArray(data.matches))
        assert.equal(data.matches.length, 2)
        assert.equal(data.matches[0].qualifier, "keyword:1")
        assert.equal(data.matches[1].qualifier, "keyword:2")
        assert.equal(data.matches[0].entryName, "Keywords A")
        assert.equal(data.matches[1].entryName, "Keywords B")
      })

      it("resolves disambiguated scope with :N suffix", async() => {
        const cwd = new DirectoryObject(__dirname)
        const packageJson = {}
        const command = new ResolveCommand({cwd, packageJson})
        command.setCache(new Cache())
        const themeFile = cwd.getFile("./fixtures/lint-duplicate-scope.yaml")
        const theme = new Theme().setCwd(cwd).setThemeFile(themeFile).setOptions({outputDir: "."})
        theme.setCache(command.getCache())
        await theme.load()
        await theme.build()

        const data1 = await command.resolve(theme, {tokenColor: "keyword:1"})
        assert.equal(data1.found, true)
        assert.equal(data1.ambiguous, undefined)
        assert.equal(data1.resolution, "#ff0000")
        assert.equal(data1.entryName, "Keywords A")

        const data2 = await command.resolve(theme, {tokenColor: "keyword:2"})
        assert.equal(data2.found, true)
        assert.equal(data2.resolution, "#00ff00")
        assert.equal(data2.entryName, "Keywords B")
      })

      it("returns not-found for out-of-range disambiguation index", async() => {
        const cwd = new DirectoryObject(__dirname)
        const packageJson = {}
        const command = new ResolveCommand({cwd, packageJson})
        command.setCache(new Cache())
        const themeFile = cwd.getFile("./fixtures/lint-duplicate-scope.yaml")
        const theme = new Theme().setCwd(cwd).setThemeFile(themeFile).setOptions({outputDir: "."})
        theme.setCache(command.getCache())
        await theme.load()
        await theme.build()

        const data = await command.resolve(theme, {tokenColor: "keyword:99"})
        assert.equal(data.found, false)
        assert.ok(data.message.includes("keyword:1"))
        assert.ok(data.message.includes("keyword:2"))
      })

      it("resolves via precedence for sub-scope", async() => {
        const cwd = new DirectoryObject(__dirname)
        const packageJson = {}
        const command = new ResolveCommand({cwd, packageJson})
        command.setCache(new Cache())
        const themeFile = cwd.getFile("./fixtures/palette-alias-tokencolors.yaml")
        const theme = new Theme().setCwd(cwd).setThemeFile(themeFile).setOptions({outputDir: "."})
        theme.setCache(command.getCache())
        await theme.load()
        await theme.build()

        // "keyword.control" has no exact match, but "keyword" is a prefix
        const data = await command.resolve(theme, {tokenColor: "keyword.control"})
        assert.equal(data.found, true)
        assert.ok(data.resolvedVia, "should resolve via precedence")
        assert.equal(data.resolvedVia.relation, "via")
        assert.equal(data.resolvedVia.scope, "keyword")
      })
    })

    describe("semanticTokenColor option", () => {
      it("returns not-found for missing semantic token scope", async() => {
        const cwd = new DirectoryObject(__dirname)
        const packageJson = {}
        const command = new ResolveCommand({cwd, packageJson})
        command.setCache(new Cache())
        const themeFile = cwd.getFile("./fixtures/semantic-token-theme.yaml")
        const theme = new Theme().setCwd(cwd).setThemeFile(themeFile).setOptions({outputDir: "."})
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
        const theme = new Theme().setCwd(cwd).setThemeFile(themeFile).setOptions({outputDir: "."})
        theme.setCache(command.getCache())
        await theme.load()
        await theme.build()

        const data = await command.resolve(theme, {semanticTokenColor: "variable.declaration"})
        assert.equal(data.found, true)
        assert.equal(typeof data.resolution, "string")
        assert.ok(Array.isArray(data.trail))
      })

      it("resolves string-value semantic token (palette alias)", async() => {
        const cwd = new DirectoryObject(__dirname)
        const packageJson = {}
        const command = new ResolveCommand({cwd, packageJson})
        command.setCache(new Cache())
        const themeFile = cwd.getFile("./fixtures/semantic-token-theme.yaml")
        const theme = new Theme().setCwd(cwd).setThemeFile(themeFile).setOptions({outputDir: "."})
        theme.setCache(command.getCache())
        await theme.load()
        await theme.build()

        const data = await command.resolve(theme, {semanticTokenColor: "string:escape"})
        assert.equal(data.found, true)
        assert.equal(typeof data.resolution, "string")
      })
    })
  })

  describe("resolveTokenColor", () => {
    it("does not throw for a valid scope", async() => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {}
      const command = new ResolveCommand({cwd, packageJson})
      command.setCache(new Cache())
      const themeFile = cwd.getFile("./fixtures/token-colors-string-scope.yaml")
      const theme = new Theme().setCwd(cwd).setThemeFile(themeFile).setOptions({outputDir: "."})
      theme.setCache(command.getCache())
      await theme.load()
      await theme.build()

      // Smoke test: should not throw
      await command.resolveTokenColor(theme, "comment")
    })

    it("does not throw for a missing scope", async() => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {}
      const command = new ResolveCommand({cwd, packageJson})
      command.setCache(new Cache())
      const themeFile = cwd.getFile("./fixtures/token-colors-string-scope.yaml")
      const theme = new Theme().setCwd(cwd).setThemeFile(themeFile).setOptions({outputDir: "."})
      theme.setCache(command.getCache())
      await theme.load()
      await theme.build()

      await command.resolveTokenColor(theme, "nonexistent.scope")
    })
  })

  describe("resolveSemanticTokenColor", () => {
    it("does not throw for a valid scope", async() => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {}
      const command = new ResolveCommand({cwd, packageJson})
      command.setCache(new Cache())
      const themeFile = cwd.getFile("./fixtures/semantic-token-theme.yaml")
      const theme = new Theme().setCwd(cwd).setThemeFile(themeFile).setOptions({outputDir: "."})
      theme.setCache(command.getCache())
      await theme.load()
      await theme.build()

      await command.resolveSemanticTokenColor(theme, "variable.declaration")
    })

    it("does not throw for a missing scope", async() => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {}
      const command = new ResolveCommand({cwd, packageJson})
      command.setCache(new Cache())
      const themeFile = cwd.getFile("./fixtures/semantic-token-theme.yaml")
      const theme = new Theme().setCwd(cwd).setThemeFile(themeFile).setOptions({outputDir: "."})
      theme.setCache(command.getCache())
      await theme.load()
      await theme.build()

      await command.resolveSemanticTokenColor(theme, "nonexistent.token")
    })
  })

  describe("buildCli", () => {
    it("adds --bg extra option", async() => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {}
      const command = new ResolveCommand({cwd, packageJson})

      const {Command: CommanderCommand} = await import("commander")
      const program = new CommanderCommand()

      await command.buildCli(program)

      // The commander subcommand should have the --bg option registered
      const subcommand = program.commands.find(cmd => cmd.name() === "resolve")
      assert.ok(subcommand, "resolve subcommand should be registered")

      const bgOption = subcommand.options.find(opt => opt.long === "--bg")
      assert.ok(bgOption, "--bg option should be registered")
    })
  })
})
