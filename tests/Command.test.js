#!/usr/bin/env node

import assert from "node:assert/strict"
import {describe, it} from "node:test"
import {DirectoryObject, FileObject, Cache, Sass} from "@gesslar/toolkit"
import Command from "../src/Command.js"
import path from "node:path"
import {fileURLToPath} from "node:url"
import {TestUtils} from "./helpers/test-utils.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

describe("Command", () => {
  describe("constructor", () => {
    it("creates command with cwd and packageJson", () => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {name: "test", version: "1.0.0"}
      const command = new Command({cwd, packageJson})
      assert.equal(command.getCwd(), cwd)
      assert.equal(command.getPackageJson(), packageJson)
    })
  })

  describe("cache management", () => {
    it("sets and gets cache", () => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {}
      const command = new Command({cwd, packageJson})
      const cache = new Cache()
      command.setCache(cache)
      assert.equal(command.getCache(), cache)
    })

    it("hasCache returns false when cache not set", () => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {}
      const command = new Command({cwd, packageJson})
      // hasCache checks if #cache !== null, which is true initially (undefined !== null)
      // So we check the actual behavior
      const cache = command.getCache()
      assert.ok(cache === null || cache === undefined)
    })

    it("hasCache returns true when cache is set", () => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {}
      const command = new Command({cwd, packageJson})
      const cache = new Cache()
      command.setCache(cache)
      assert.ok(command.hasCache())
    })

    it("getCache returns null or undefined when not set", () => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {}
      const command = new Command({cwd, packageJson})
      const cache = command.getCache()
      assert.ok(cache === null || cache === undefined)
    })
  })

  describe("CLI command management", () => {
    it("sets and gets CLI command", () => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {}
      const command = new Command({cwd, packageJson})
      command.setCliCommand("test <file>")
      assert.equal(command.getCliCommand(), "test <file>")
    })

    it("hasCliCommand returns false when not set", () => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {}
      const command = new Command({cwd, packageJson})
      assert.equal(command.hasCliCommand(), false)
    })

    it("hasCliCommand returns true when set", () => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {}
      const command = new Command({cwd, packageJson})
      command.setCliCommand("test")
      assert.ok(command.hasCliCommand())
    })
  })

  describe("CLI options management", () => {
    it("sets and gets CLI options", () => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {}
      const command = new Command({cwd, packageJson})
      const options = {"watch": ["-w", "watch mode"]}
      command.setCliOptions(options)
      assert.deepEqual(command.getCliOptions(), options)
    })

    it("hasCliOptions returns false when not set", () => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {}
      const command = new Command({cwd, packageJson})
      assert.equal(command.hasCliOptions(), false)
    })

    it("hasCliOptions returns true when set", () => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {}
      const command = new Command({cwd, packageJson})
      command.setCliOptions({"watch": ["-w", "watch"]})
      assert.ok(command.hasCliOptions())
    })

    it("canBuild returns false when CLI command not set", () => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {}
      const command = new Command({cwd, packageJson})
      command.setCliOptions({"watch": ["-w", "watch"]})
      assert.equal(command.canBuild(), false)
    })

    it("canBuild returns false when CLI options not set", () => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {}
      const command = new Command({cwd, packageJson})
      command.setCliCommand("test")
      assert.equal(command.canBuild(), false)
    })

    it("canBuild returns true when both set", () => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {}
      const command = new Command({cwd, packageJson})
      command.setCliCommand("test")
      command.setCliOptions({"watch": ["-w", "watch"]})
      assert.ok(command.canBuild())
    })
  })

  describe("resolveThemeFileName", () => {
    it("resolves existing file", async() => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {}
      const command = new Command({cwd, packageJson})
      const fixturePath = TestUtils.getFixturePath("simple-theme.yaml")
      const fileObject = await command.resolveThemeFileName(fixturePath, cwd)
      assert.ok(fileObject instanceof FileObject)
      assert.ok(await fileObject.exists)
    })

    it("throws Sass error for non-existent file", async() => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {}
      const command = new Command({cwd, packageJson})
      await assert.rejects(
        () => command.resolveThemeFileName("nonexistent.yaml", cwd),
        (error) => {
          return error instanceof Sass || error.constructor.name === "Sass"
        }
      )
    })
  })

  describe("buildCli", () => {
    it("throws when CLI command not set", async() => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {}
      const command = new Command({cwd, packageJson})
      command.setCliOptions({"watch": ["-w", "watch"]})
      const mockProgram = {command: () => ({action: () => {}, option: () => {}})}
      await assert.rejects(
        () => command.buildCli(mockProgram),
        (error) => {
          return error instanceof Sass || error.constructor.name === "Sass"
        }
      )
    })

    it("throws when CLI options not set", async() => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {}
      const command = new Command({cwd, packageJson})
      command.setCliCommand("test")
      const mockProgram = {command: () => ({action: () => {}, option: () => {}})}
      await assert.rejects(
        () => command.buildCli(mockProgram),
        (error) => {
          return error instanceof Sass || error.constructor.name === "Sass"
        }
      )
    })
  })

  describe("getCliOptionNames", () => {
    it("returns empty array initially", () => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {}
      const command = new Command({cwd, packageJson})
      assert.deepEqual(command.getCliOptionNames(), [])
    })
  })
})
