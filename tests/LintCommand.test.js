#!/usr/bin/env node

import assert from "node:assert/strict"
import {describe, it} from "node:test"
import {DirectoryObject, FileObject, Cache} from "@gesslar/toolkit"
import LintCommand, {Lint} from "../src/LintCommand.js"
import Theme from "../src/Theme.js"
import path from "node:path"
import {fileURLToPath} from "node:url"
import {TestUtils} from "./helpers/test-utils.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

describe("LintCommand", () => {
  describe("constructor", () => {
    it("creates lint command with CLI options", () => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {}
      const command = new LintCommand({cwd, packageJson})
      assert.ok(command.hasCliCommand())
      assert.equal(command.getCliCommand(), "lint <file>")
      assert.ok(command.hasCliOptions())
    })

    it("has static constants on Lint engine", () => {
      assert.ok(Lint.SECTIONS)
      assert.ok(Lint.SECTIONS.VARS)
      assert.ok(Lint.SECTIONS.COLORS)
      assert.ok(Lint.SECTIONS.TOKEN_COLORS)
      assert.ok(Lint.SECTIONS.SEMANTIC_TOKEN_COLORS)

      assert.ok(Lint.SEVERITY)
      assert.ok(Lint.SEVERITY.HIGH)
      assert.ok(Lint.SEVERITY.MEDIUM)
      assert.ok(Lint.SEVERITY.LOW)

      assert.ok(Lint.ISSUE_TYPES)
      assert.ok(Lint.ISSUE_TYPES.DUPLICATE_SCOPE)
      assert.ok(Lint.ISSUE_TYPES.UNDEFINED_VARIABLE)
      assert.ok(Lint.ISSUE_TYPES.UNUSED_VARIABLE)
      assert.ok(Lint.ISSUE_TYPES.PRECEDENCE_ISSUE)
    })
  })

  describe("execute", () => {
    it("lints a valid theme file", async() => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {}
      const command = new LintCommand({cwd, packageJson})
      command.setCache(new Cache())
      // Should not throw for valid theme
      await command.execute("./fixtures/simple-theme.yaml", {})
    })

    it("throws for non-existent file", async() => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {}
      const command = new LintCommand({cwd, packageJson})
      command.setCache(new Cache())

      await assert.rejects(
        () => command.execute("nonexistent.yaml", {}),
        error => {
          return error instanceof Error
        }
      )
    })
  })

  describe("lint", () => {
    it("returns structured lint results", async() => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {}
      const command = new LintCommand({cwd, packageJson})
      command.setCache(new Cache())
      const themeFile = cwd.getFile("./fixtures/simple-theme.yaml")
      const theme = new Theme().setCwd(cwd).setThemeFile(themeFile).withOptions({outputDir: "."})
      theme.setCache(command.getCache())

      await theme.load()
      await theme.build()

      const results = await new Lint().run(theme)

      assert.ok(results)
      assert.ok(Array.isArray(results[Lint.SECTIONS.TOKEN_COLORS]))
      assert.ok(Array.isArray(results[Lint.SECTIONS.SEMANTIC_TOKEN_COLORS]))
      assert.ok(Array.isArray(results[Lint.SECTIONS.COLORS]))
      assert.ok(Array.isArray(results.variables))
    })

    it("does not report false positives for palette alias syntax in tokenColors", async() => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {}
      const command = new LintCommand({cwd, packageJson})
      command.setCache(new Cache())
      const themeFile = cwd.getFile("./fixtures/palette-alias-tokencolors.yaml")
      const theme = new Theme().setCwd(cwd).setThemeFile(themeFile).withOptions({outputDir: "."})
      theme.setCache(command.getCache())

      await theme.load()
      await theme.build()

      const results = await new Lint().run(theme)
      const undefinedVarIssues = results[Lint.SECTIONS.TOKEN_COLORS]
        .filter(i => i.type === Lint.ISSUE_TYPES.UNDEFINED_VARIABLE)

      assert.equal(undefinedVarIssues.length, 0,
        `Expected no undefined-variable issues for palette aliases, got: ${JSON.stringify(undefinedVarIssues)}`)
    })

    it("handles theme without pool", async() => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {}
      const command = new LintCommand({cwd, packageJson})
      command.setCache(new Cache())
      const themeFile = cwd.getFile("./fixtures/simple-theme.yaml")
      const theme = new Theme().setCwd(cwd).setThemeFile(themeFile).withOptions({outputDir: "."})
      theme.setCache(command.getCache())

      await theme.load()
      await theme.build()

      // Even without pool, should return results (structural linting)
      const results = await new Lint().run(theme)
      assert.ok(results)
    })

    it("detects duplicate scopes across tokenColors entries", async() => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {}
      const command = new LintCommand({cwd, packageJson})
      command.setCache(new Cache())
      const themeFile = cwd.getFile("./fixtures/lint-duplicate-scope.yaml")
      const theme = new Theme().setCwd(cwd).setThemeFile(themeFile).withOptions({outputDir: "."})
      theme.setCache(command.getCache())

      await theme.load()
      await theme.build()

      const results = await new Lint().run(theme)
      const duplicates = results[Lint.SECTIONS.TOKEN_COLORS]
        .filter(i => i.type === Lint.ISSUE_TYPES.DUPLICATE_SCOPE)

      assert.ok(duplicates.length > 0, "should detect duplicate scopes")
      assert.equal(duplicates[0].scope, "keyword")
      assert.equal(duplicates[0].severity, Lint.SEVERITY.MEDIUM)
      assert.equal(duplicates[0].occurrences.length, 2)
      assert.equal(duplicates[0].occurrences[0].name, "Keywords A")
      assert.equal(duplicates[0].occurrences[1].name, "Keywords B")
    })

    it("detects precedence issues where broad scope masks specific scope", async() => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {}
      const command = new LintCommand({cwd, packageJson})
      command.setCache(new Cache())
      const themeFile = cwd.getFile("./fixtures/lint-precedence.yaml")
      const theme = new Theme().setCwd(cwd).setThemeFile(themeFile).withOptions({outputDir: "."})
      theme.setCache(command.getCache())

      await theme.load()
      await theme.build()

      const results = await new Lint().run(theme)
      const precedence = results[Lint.SECTIONS.TOKEN_COLORS]
        .filter(i => i.type === Lint.ISSUE_TYPES.PRECEDENCE_ISSUE)

      assert.ok(precedence.length > 0, "should detect precedence issues")
      assert.equal(precedence[0].broadScope, "keyword")
      assert.equal(precedence[0].specificScope, "keyword.control")
      assert.equal(precedence[0].severity, Lint.SEVERITY.HIGH)
      assert.equal(precedence[0].broadRule, "General Keywords")
      assert.equal(precedence[0].specificRule, "Control Keywords")
    })

    it("detects unused variables defined in vars", async() => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {}
      const command = new LintCommand({cwd, packageJson})
      command.setCache(new Cache())
      const themeFile = cwd.getFile("./fixtures/lint-unused-var.yaml")
      const theme = new Theme().setCwd(cwd).setThemeFile(themeFile).withOptions({outputDir: "."})
      theme.setCache(command.getCache())

      await theme.load()
      await theme.build()

      const results = await new Lint().run(theme)
      const unused = results.variables
        .filter(i => i.type === Lint.ISSUE_TYPES.UNUSED_VARIABLE)

      assert.ok(unused.length > 0, "should detect unused variables")

      // orphan is genuinely unused
      const orphanIssue = unused.find(i => i.variable === "$orphan")
      assert.ok(orphanIssue, "should flag $orphan as unused")
      assert.equal(orphanIssue.severity, Lint.SEVERITY.LOW)
    })

    it("reports no duplicate scopes for clean theme", async() => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {}
      const command = new LintCommand({cwd, packageJson})
      command.setCache(new Cache())
      const themeFile = cwd.getFile("./fixtures/token-colors-string-scope.yaml")
      const theme = new Theme().setCwd(cwd).setThemeFile(themeFile).withOptions({outputDir: "."})
      theme.setCache(command.getCache())

      await theme.load()
      await theme.build()

      const results = await new Lint().run(theme)
      const duplicates = results[Lint.SECTIONS.TOKEN_COLORS]
        .filter(i => i.type === Lint.ISSUE_TYPES.DUPLICATE_SCOPE)

      assert.equal(duplicates.length, 0)
    })

    it("reports no precedence issues for non-hierarchical scopes", async() => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {}
      const command = new LintCommand({cwd, packageJson})
      command.setCache(new Cache())
      const themeFile = cwd.getFile("./fixtures/palette-alias-tokencolors.yaml")
      const theme = new Theme().setCwd(cwd).setThemeFile(themeFile).withOptions({outputDir: "."})
      theme.setCache(command.getCache())

      await theme.load()
      await theme.build()

      const results = await new Lint().run(theme)
      const precedence = results[Lint.SECTIONS.TOKEN_COLORS]
        .filter(i => i.type === Lint.ISSUE_TYPES.PRECEDENCE_ISSUE)

      assert.equal(precedence.length, 0,
        "keyword, string, comment are not hierarchically related")
    })
  })
})
