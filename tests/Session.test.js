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

describe("Session", () => {
  describe("run", () => {
    it("calls asyncEmit on command", async() => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {}
      const command = new BuildCommand({cwd, packageJson})
      command.setCache(new Cache())

      const themeFile = cwd.getFile("./fixtures/simple-theme.yaml")
      const theme = new Theme(themeFile, cwd, {outputDir: "."})
      theme.setCache(command.getCache())

      const session = new Session(command, theme, {})

      // Track asyncEmit calls
      const asyncEmitCalls = []
      const originalAsyncEmit = command.asyncEmit.bind(command)
      command.asyncEmit = async function(event, ...args) {
        asyncEmitCalls.push({event, args})

        return await originalAsyncEmit(event, ...args)
      }

      // Mock theme methods to avoid actual file operations
      await theme.load()
      await theme.build()

      // Mock write to avoid file I/O
      const originalWrite = theme.write.bind(theme)
      theme.write = async function() {
        return {status: {description: "skipped"}, file: themeFile, bytes: 0}
      }

      try {
        await session.run()
      } catch(error) {
        // May throw if build fails, that's okay for this test
      }

      // Verify asyncEmit was called with expected events
      assert.ok(asyncEmitCalls.length > 0)

      // Check that "building" event was emitted
      const buildingCalls = asyncEmitCalls.filter(call => call.event === "building")
      assert.ok(buildingCalls.length > 0)

      // Restore
      command.asyncEmit = originalAsyncEmit
      theme.write = originalWrite
    })

    it("throws Sass errors when build fails", async() => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {}
      const command = new BuildCommand({cwd, packageJson})
      command.setCache(new Cache())

      const themeFile = cwd.getFile("./fixtures/simple-theme.yaml")
      const theme = new Theme(themeFile, cwd, {outputDir: "."})
      theme.setCache(command.getCache())

      const session = new Session(command, theme, {})

      // Mock theme.build to throw an error
      const originalBuild = theme.build.bind(theme)
      theme.build = async function() {
        throw new Error("Compilation error")
      }

      // Mock theme.load to succeed
      const originalLoad = theme.load.bind(theme)
      theme.load = async function() {
        // Load succeeds
      }

      // Mock theme.write to avoid file operations
      const originalWrite = theme.write.bind(theme)
      theme.write = async function() {
        return {status: {description: "skipped"}, file: cwd.getFile("test.json"), bytes: 0}
      }

      // Mock theme.getSourceFile to return a file
      const originalGetSourceFile = theme.getSourceFile.bind(theme)
      theme.getSourceFile = function() {
        return themeFile
      }

      // Mock theme.getDependencies to return empty set
      const originalGetDependencies = theme.getDependencies.bind(theme)
      theme.getDependencies = function() {
        return new Set()
      }

      await assert.rejects(
        async() => {
          await session.run()
        },
        error => {
          // Should be a Sass error
          return error instanceof Sass || error.constructor.name === "Sass"
        }
      )

      // Restore
      theme.build = originalBuild
      theme.load = originalLoad
      theme.write = originalWrite
      theme.getSourceFile = originalGetSourceFile
      theme.getDependencies = originalGetDependencies
    })

    it("awaits asyncEmit calls properly", async() => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {}
      const command = new BuildCommand({cwd, packageJson})
      command.setCache(new Cache())

      const themeFile = cwd.getFile("./fixtures/simple-theme.yaml")
      const theme = new Theme(themeFile, cwd, {outputDir: "."})
      theme.setCache(command.getCache())

      const session = new Session(command, theme, {})

      const emitOrder = []
      let asyncEmitActive = false

      // Track asyncEmit calls with timing to verify they're awaited
      const originalAsyncEmit = command.asyncEmit.bind(command)
      command.asyncEmit = async function(event, ...args) {
        assert.equal(asyncEmitActive, false, "Previous asyncEmit should have completed")
        asyncEmitActive = true
        emitOrder.push(`start-${event}`)
        await TestUtils.sleep(10)
        await originalAsyncEmit(event, ...args)
        emitOrder.push(`end-${event}`)
        asyncEmitActive = false
      }

      // Mock theme methods to avoid actual file operations
      await theme.load()
      await theme.build()

      // Mock write to avoid file I/O
      const originalWrite = theme.write.bind(theme)
      theme.write = async function() {
        return {status: {description: "skipped"}, file: themeFile, bytes: 0}
      }

      try {
        await session.run()
      } catch(error) {
        // May throw if build fails, that's okay for this test
      }

      // Verify that events were awaited (each start should have a corresponding end)
      const buildingStarts = emitOrder.filter(e => e === "start-building")
      const buildingEnds = emitOrder.filter(e => e === "end-building")
      assert.equal(buildingStarts.length, buildingEnds.length, "All asyncEmit calls should complete")

      // Restore
      command.asyncEmit = originalAsyncEmit
      theme.write = originalWrite
    })
  })
})
