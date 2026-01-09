#!/usr/bin/env node

import assert from "node:assert/strict"
import {describe, it} from "node:test"
import {DirectoryObject, FileObject, Cache} from "@gesslar/toolkit"
import LintCommand from "../src/LintCommand.js"
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

    it("has static constants", () => {
      assert.ok(LintCommand.SECTIONS)
      assert.ok(LintCommand.SECTIONS.VARS)
      assert.ok(LintCommand.SECTIONS.COLORS)
      assert.ok(LintCommand.SECTIONS.TOKEN_COLORS)
      assert.ok(LintCommand.SECTIONS.SEMANTIC_TOKEN_COLORS)

      assert.ok(LintCommand.SEVERITY)
      assert.ok(LintCommand.SEVERITY.HIGH)
      assert.ok(LintCommand.SEVERITY.MEDIUM)
      assert.ok(LintCommand.SEVERITY.LOW)

      assert.ok(LintCommand.ISSUE_TYPES)
      assert.ok(LintCommand.ISSUE_TYPES.DUPLICATE_SCOPE)
      assert.ok(LintCommand.ISSUE_TYPES.UNDEFINED_VARIABLE)
      assert.ok(LintCommand.ISSUE_TYPES.UNUSED_VARIABLE)
      assert.ok(LintCommand.ISSUE_TYPES.PRECEDENCE_ISSUE)
    })
  })

  describe("execute", () => {
    it("lints a valid theme file", async() => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {}
      const command = new LintCommand({cwd, packageJson})
      command.setCache(new Cache())
      const fixturePath = TestUtils.getFixturePath("simple-theme.yaml")

      // Should not throw for valid theme
      await command.execute(fixturePath, {})
    })

    it("throws for non-existent file", async() => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {}
      const command = new LintCommand({cwd, packageJson})
      command.setCache(new Cache())

      await assert.rejects(
        () => command.execute("nonexistent.yaml", {}),
        (error) => {
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
      const fixturePath = TestUtils.getFixturePath("simple-theme.yaml")
      const themeFile = new FileObject(fixturePath)
      const theme = new Theme(themeFile, cwd, {})
      theme.setCache(command.getCache())

      await theme.load()
      await theme.build()

      const results = await command.lint(theme)

      assert.ok(results)
      assert.ok(Array.isArray(results[LintCommand.SECTIONS.TOKEN_COLORS]))
      assert.ok(Array.isArray(results[LintCommand.SECTIONS.SEMANTIC_TOKEN_COLORS]))
      assert.ok(Array.isArray(results[LintCommand.SECTIONS.COLORS]))
      assert.ok(Array.isArray(results.variables))
    })

    it("handles theme without pool", async() => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {}
      const command = new LintCommand({cwd, packageJson})
      command.setCache(new Cache())
      const fixturePath = TestUtils.getFixturePath("simple-theme.yaml")
      const themeFile = new FileObject(fixturePath)
      const theme = new Theme(themeFile, cwd, {})
      theme.setCache(command.getCache())

      await theme.load()
      await theme.build()

      // Even without pool, should return results (structural linting)
      const results = await command.lint(theme)
      assert.ok(results)
    })
  })
})
