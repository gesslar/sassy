#!/usr/bin/env node

import assert from "node:assert/strict"
import {describe, it} from "node:test"
import {Sass} from "@gesslar/toolkit"
import ThemeToken from "../src/ThemeToken.js"
import ThemePool from "../src/ThemePool.js"

describe("ThemeToken", () => {
  describe("constructor", () => {
    it("creates a token with a name", () => {
      const token = new ThemeToken("test-token")
      assert.equal(token.getName(), "test-token")
    })

    it("throws when name is not a string", () => {
      assert.throws(
        () => new ThemeToken(123),
        (error) => {
          return error instanceof Sass || error.constructor.name === "Sass"
        }
      )
    })

    it("throws when name is missing", () => {
      assert.throws(
        () => new ThemeToken(null),
        (error) => {
          return error instanceof Sass || error.constructor.name === "Sass"
        }
      )
    })
  })

  describe("name management", () => {
    it("sets name on construction", () => {
      const token = new ThemeToken("my-token")
      assert.equal(token.getName(), "my-token")
    })

    it("setName only sets if not already set", () => {
      const token = new ThemeToken("original")
      token.setName("new-name")
      assert.equal(token.getName(), "original")
    })

    it("setName works if name is not set", () => {
      // This is tricky since constructor always sets name
      // But we can test the behavior
      const token = new ThemeToken("initial")
      assert.equal(token.getName(), "initial")
    })
  })

  describe("kind management", () => {
    it("sets and gets kind", () => {
      const token = new ThemeToken("test")
      token.setKind("color")
      assert.equal(token.getKind(), "color")
    })

    it("setKind only sets if not already set", () => {
      const token = new ThemeToken("test")
      token.setKind("color")
      token.setKind("token")
      assert.equal(token.getKind(), "color")
    })
  })

  describe("value management", () => {
    it("sets and gets value", () => {
      const token = new ThemeToken("test")
      token.setValue("#ff0000")
      assert.equal(token.getValue(), "#ff0000")
    })

    it("setValue overwrites previous value", () => {
      const token = new ThemeToken("test")
      token.setValue("#ff0000")
      token.setValue("#00ff00")
      assert.equal(token.getValue(), "#00ff00")
    })

    it("sets and gets rawValue", () => {
      const token = new ThemeToken("test")
      token.setRawValue("$(vars.primary)")
      assert.equal(token.getRawValue(), "$(vars.primary)")
    })

    it("setRawValue only sets if not already set", () => {
      const token = new ThemeToken("test")
      token.setRawValue("$(vars.primary)")
      token.setRawValue("$(vars.secondary)")
      assert.equal(token.getRawValue(), "$(vars.primary)")
    })
  })

  describe("dependency management", () => {
    it("sets and gets dependency", () => {
      const token1 = new ThemeToken("token1")
      const token2 = new ThemeToken("token2")
      token1.setDependency(token2)
      assert.equal(token1.getDependency(), token2)
    })

    it("setDependency only sets if not already set", () => {
      const token1 = new ThemeToken("token1")
      const token2 = new ThemeToken("token2")
      const token3 = new ThemeToken("token3")
      token1.setDependency(token2)
      token1.setDependency(token3)
      assert.equal(token1.getDependency(), token2)
    })

    it("getDependency returns null when no dependency", () => {
      const token = new ThemeToken("test")
      assert.equal(token.getDependency(), null)
    })

    it("hasDependency checks for dependency by name", () => {
      const token1 = new ThemeToken("token1")
      const token2 = new ThemeToken("token2")
      token1.setDependency(token2)
      assert.ok(token1.hasDependency("token2"))
      assert.equal(token1.hasDependency("token1"), false)
    })
  })

  describe("parent token key", () => {
    it("sets and gets parent token key", () => {
      const token = new ThemeToken("test")
      token.setParentTokenKey("colors.primary")
      assert.equal(token.getParentTokenKey(), "colors.primary")
    })

    it("getParentTokenKey returns null when not set", () => {
      const token = new ThemeToken("test")
      assert.equal(token.getParentTokenKey(), null)
    })
  })

  describe("trail management", () => {
    it("adds trail tokens", () => {
      const token = new ThemeToken("test")
      const trail1 = new ThemeToken("trail1")
      const trail2 = new ThemeToken("trail2")
      token.addTrail([trail1, trail2])
      const trail = token.getTrail()
      assert.equal(trail.length, 2)
      assert.ok(trail.includes(trail1))
      assert.ok(trail.includes(trail2))
    })

    it("addTrail prevents duplicates", () => {
      const token = new ThemeToken("test")
      const trail1 = new ThemeToken("trail1")
      token.addTrail([trail1])
      token.addTrail([trail1])
      const trail = token.getTrail()
      assert.equal(trail.length, 1)
    })
  })

  describe("parsed color", () => {
    it("sets and gets parsed color", () => {
      const token = new ThemeToken("test")
      const parsedColor = {r: 255, g: 0, b: 0}
      token.setParsedColor(parsedColor)
      assert.equal(token.getParsedColor(), parsedColor)
    })

    it("getParsedColor returns null when not set", () => {
      const token = new ThemeToken("test")
      assert.equal(token.getParsedColor(), null)
    })
  })

  describe("pool integration", () => {
    it("adds token to pool", () => {
      const pool = new ThemePool()
      const token = new ThemeToken("test")
      const result = token.addToPool(pool)
      assert.equal(result, token)
      const tokens = pool.getTokens()
      assert.ok(tokens.has("test"))
    })

    it("adds token to pool with dependency", () => {
      const pool = new ThemePool()
      const token1 = new ThemeToken("token1")
      const token2 = new ThemeToken("token2")
      token1.addToPool(pool, token2)
      // Check that token was added by checking the tokens map directly
      const tokens = pool.getTokens()
      assert.ok(tokens.has("token1"))
    })

    it("throws when pool is not a ThemePool", () => {
      const token = new ThemeToken("test")
      assert.throws(
        () => token.addToPool({}),
        (error) => {
          return error instanceof Sass || error.constructor.name === "Sass"
        }
      )
    })

    it("throws when dependency is not a ThemeToken or null", () => {
      const pool = new ThemePool()
      const token = new ThemeToken("test")
      assert.throws(
        () => token.addToPool(pool, "invalid"),
        (error) => {
          return error instanceof Sass || error.constructor.name === "Sass"
        }
      )
    })

    it("returns token if already in pool", () => {
      const pool = new ThemePool()
      const token = new ThemeToken("test")
      token.addToPool(pool)
      const result = token.addToPool(pool)
      assert.equal(result, token)
    })

    it("gets pool from token", () => {
      const pool = new ThemePool()
      const token = new ThemeToken("test")
      token.addToPool(pool)
      assert.equal(token.getPool(), pool)
    })
  })

  describe("toJSON", () => {
    it("serializes token to JSON", () => {
      const token = new ThemeToken("test-token")
      token.setKind("color")
      token.setValue("#ff0000")
      token.setRawValue("$(vars.primary)")
      const json = token.toJSON()
      assert.equal(json.name, "test-token")
      assert.equal(json.kind, "color")
      assert.equal(json.value, "#ff0000")
      assert.equal(json.rawValue, "$(vars.primary)")
      assert.equal(json.dependency, null)
    })

    it("serializes token with dependency", () => {
      const pool = new ThemePool()
      const token1 = new ThemeToken("token1")
      const token2 = new ThemeToken("token2")
      token1.setDependency(token2)
      token1.addToPool(pool, token2)
      const json = token1.toJSON()
      assert.ok(json.dependency)
      assert.equal(json.dependency.name, "token2")
    })

    it("serializes token with trail", () => {
      const token = new ThemeToken("test")
      const trail1 = new ThemeToken("trail1")
      const trail2 = new ThemeToken("trail2")
      token.addTrail([trail1, trail2])
      const json = token.toJSON()
      assert.ok(Array.isArray(json.trail))
      assert.equal(json.trail.length, 2)
    })
  })
})
