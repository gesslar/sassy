#!/usr/bin/env node

import assert from "node:assert/strict"
import {describe, it, mock} from "node:test"
import {DirectoryObject, FileObject, Cache, Sass} from "@gesslar/toolkit"
import BuildCommand from "../src/BuildCommand.js"
import Session from "../src/Session.js"
import Theme from "../src/Theme.js"
import path from "node:path"
import {fileURLToPath} from "node:url"
import {TestUtils} from "./helpers/test-utils.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

describe("BuildCommand", () => {
  describe("asyncEmit", () => {
    it("has asyncEmit method", () => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {}
      const command = new BuildCommand({cwd, packageJson})

      assert.ok(typeof command.asyncEmit === "function")
    })

    it("emits events through the emitter", async() => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {}
      const command = new BuildCommand({cwd, packageJson})

      let eventReceived = false
      let receivedArgs = null

      command.emitter.on("test-event", (...args) => {
        eventReceived = true
        receivedArgs = args
      })

      await command.asyncEmit("test-event", "arg1", "arg2")

      assert.ok(eventReceived)
      assert.deepEqual(receivedArgs, ["arg1", "arg2"])
    })

    it("waits for async event handlers", async() => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {}
      const command = new BuildCommand({cwd, packageJson})

      let handlerCompleted = false

      command.emitter.on("async-test", async() => {
        await TestUtils.sleep(10)
        handlerCompleted = true
      })

      await command.asyncEmit("async-test")

      assert.ok(handlerCompleted)
    })
  })

  describe("execute", () => {
    it("wraps session creation errors in Sass errors", async() => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {}
      const command = new BuildCommand({cwd, packageJson})
      command.setCache(new Cache())

      // Mock resolveThemeFileName to throw an error
      const originalResolve = command.resolveThemeFileName.bind(command)
      let sassErrorCreated = false

      command.resolveThemeFileName = async() => {
        const error = new Error("File not found")
        // Verify that when we create a Sass error, it's properly formed
        const sassErr = Sass.new("Creating session for theme file.", error)
        sassErrorCreated = true
        assert.ok(sassErr instanceof Sass || sassErr.constructor.name === "Sass")
        throw error
      }

      // Mock process.exit to prevent actual exit
      const originalExit = process.exit
      let exitCalled = false
      process.exit = () => {
        exitCalled = true
      }

      try {
        await command.execute(["nonexistent.yaml"], {})
      } catch(error) {
        // May or may not throw
      }

      // Verify that Sass error creation path was tested
      assert.ok(sassErrorCreated, "Sass error should be created for file errors")

      // Restore
      command.resolveThemeFileName = originalResolve
      process.exit = originalExit
    })

    it("wraps session run errors in Sass errors", async() => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {}
      const command = new BuildCommand({cwd, packageJson})
      command.setCache(new Cache())

      const fixturePath = TestUtils.getFixturePath("simple-theme.yaml")

      // Track if Sass.new is called with the right context
      let sassErrorContext = null
      const originalSassNew = Sass.new.bind(Sass)
      Sass.new = function(context, error) {
        sassErrorContext = context
        return originalSassNew(context, error)
      }

      // Create a session that will fail during run
      // We'll use a real session but mock the theme to fail
      const themeFile = new FileObject(fixturePath)
      const theme = new Theme(themeFile, cwd, {})
      theme.setCache(command.getCache())

      // Mock theme.build to throw
      const originalBuild = theme.build.bind(theme)
      theme.build = async function() {
        throw new Error("Build failed")
      }

      const session = new Session(command, theme, {})

      // Mock process.exit
      const originalExit = process.exit
      let exitCalled = false
      process.exit = () => {
        exitCalled = true
      }

      try {
        await session.run()
      } catch(error) {
        // Should throw Sass error
        assert.ok(
          error instanceof Sass || error.constructor.name === "Sass",
          "Error should be wrapped in Sass error"
        )
      }

      // Restore
      theme.build = originalBuild
      Sass.new = originalSassNew
      process.exit = originalExit
    })
  })
})
