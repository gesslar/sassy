#!/usr/bin/env node

import assert from "node:assert/strict"
import {describe, it} from "node:test"
import YamlSource from "../src/YamlSource.js"

const SAMPLE_YAML = `\
config:
  name: midnight-ocean
  version: 1.0
vars:
  std:
    fg:
      primary: "#cccccc"
theme:
  tokenColors:
    - name: Comment
      scope: comment
      settings:
        foreground: "#555555"
    - name: String
      scope: string
      settings:
        foreground: "#aaddaa"
`

describe("YamlSource", () => {
  describe("constructor", () => {
    it("parses valid YAML without error", () => {
      const source = new YamlSource(SAMPLE_YAML)
      assert.ok(source)
    })

    it("accepts an optional filePath", () => {
      const source = new YamlSource(SAMPLE_YAML, "/themes/test.yaml")
      assert.equal(source.filePath, "/themes/test.yaml")
    })

    it("throws on invalid YAML", () => {
      const badYaml = "foo:\n  bar: [\ninvalid"
      assert.throws(() => new YamlSource(badYaml))
    })

    it("handles multi-document YAML without crashing", () => {
      const multiDoc = "---\nfoo: bar\n---\nbaz: qux\n"
      const source = new YamlSource(multiDoc)
      assert.ok(source)
    })
  })

  describe("getLocation()", () => {
    it("returns location for a simple scalar", () => {
      const source = new YamlSource(SAMPLE_YAML)
      const loc = source.getLocation("config.name")
      assert.ok(loc)
      assert.equal(typeof loc.line, "number")
      assert.equal(typeof loc.column, "number")
    })

    it("returns location for a nested mapping", () => {
      const source = new YamlSource(SAMPLE_YAML)
      const loc = source.getLocation("vars.std.fg.primary")
      assert.ok(loc)
      assert.equal(typeof loc.line, "number")
    })

    it("returns location for a sequence entry", () => {
      const source = new YamlSource(SAMPLE_YAML)
      const loc = source.getLocation("theme.tokenColors.0")
      assert.ok(loc)
      assert.equal(typeof loc.line, "number")
    })

    it("returns location for a sequence entry mapping value", () => {
      const source = new YamlSource(SAMPLE_YAML)
      const loc = source.getLocation("theme.tokenColors.0.settings.foreground")
      assert.ok(loc)
      assert.equal(typeof loc.line, "number")
    })

    it("returns null for a nonexistent path", () => {
      const source = new YamlSource(SAMPLE_YAML)
      assert.equal(source.getLocation("does.not.exist"), null)
    })
  })

  describe("formatLocation()", () => {
    it("returns file:line:col when filePath is set", () => {
      const source = new YamlSource(SAMPLE_YAML, "/themes/test.yaml")
      const formatted = source.formatLocation("config.name")
      assert.ok(formatted)
      assert.match(formatted, /^\/themes\/test\.yaml:\d+:\d+$/)
    })

    it("returns line:col when no filePath", () => {
      const source = new YamlSource(SAMPLE_YAML)
      const formatted = source.formatLocation("config.name")
      assert.ok(formatted)
      assert.match(formatted, /^\d+:\d+$/)
    })

    it("returns null for a nonexistent path", () => {
      const source = new YamlSource(SAMPLE_YAML)
      assert.equal(source.formatLocation("does.not.exist"), null)
    })
  })

  describe("ast getter", () => {
    it("returns the parsed AST", () => {
      const source = new YamlSource(SAMPLE_YAML)
      const ast = source.ast
      assert.ok(ast)
      assert.ok(ast.body)
      assert.ok(Array.isArray(ast.body))
    })
  })

  describe("filePath getter", () => {
    it("returns the file path when set", () => {
      const source = new YamlSource(SAMPLE_YAML, "/foo/bar.yaml")
      assert.equal(source.filePath, "/foo/bar.yaml")
    })

    it("returns null when no file path", () => {
      const source = new YamlSource(SAMPLE_YAML)
      assert.equal(source.filePath, null)
    })
  })

  describe("locationMap getter", () => {
    it("returns a Map with entries", () => {
      const source = new YamlSource(SAMPLE_YAML)
      const map = source.locationMap
      assert.ok(map instanceof Map)
      assert.ok(map.size > 0)
    })

    it("contains expected paths", () => {
      const source = new YamlSource(SAMPLE_YAML)
      const map = source.locationMap
      assert.ok(map.has("config.name"))
      assert.ok(map.has("vars.std.fg.primary"))
      assert.ok(map.has("theme.tokenColors.0"))
    })
  })
})
