#!/usr/bin/env node

import assert from "node:assert/strict"
import {describe, it} from "node:test"
import Evaluator from "../src/Evaluator.js"

describe("Evaluator", () => {
  describe("extractVariableName()", () => {
    it("extracts variable name from $(var) syntax", () => {
      const result = Evaluator.extractVariableName("$(primary)")
      assert.equal(result, "primary")
    })

    it("extracts variable name from $var syntax", () => {
      const result = Evaluator.extractVariableName("$primary")
      assert.equal(result, "primary")
    })

    it("extracts variable name from ${var} syntax", () => {
      const result = Evaluator.extractVariableName("${primary}")
      assert.equal(result, "primary")
    })

    it("extracts nested variable paths", () => {
      const result = Evaluator.extractVariableName("$(std.bg.accent)")
      assert.equal(result, "std.bg.accent")
    })

    it("returns null for strings without variables", () => {
      const result = Evaluator.extractVariableName("plain text")
      assert.equal(result, null)
    })
  })

  describe("extractFunctionCall()", () => {
    it("extracts function name and args", () => {
      // Note: The regex [^()]+ doesn't match nested parentheses
      // So this will only match the outer function, not nested ones
      const result = Evaluator.extractFunctionCall("lighten(#ff0000, 20)")
      assert.ok(result)
      assert.equal(result.func, "lighten")
      assert.equal(result.args, "#ff0000, 20")
    })

    it("extracts function with single argument", () => {
      const result = Evaluator.extractFunctionCall("invert(#ff0000)")
      assert.ok(result)
      assert.equal(result.func, "invert")
      assert.equal(result.args, "#ff0000")
    })

    it("returns null for strings without functions", () => {
      const result = Evaluator.extractFunctionCall("plain text")
      assert.equal(result, null)
    })
  })

  describe("evaluate()", () => {
    it("resolves simple variable references", () => {
      const evaluator = new Evaluator()
      const decomposed = [
        {flatPath: "vars.primary", value: "#4b8ebd"},
        {flatPath: "theme.colors.background", value: "$(vars.primary)"}
      ]

      evaluator.evaluate(decomposed)

      assert.equal(decomposed[1].value, "#4b8ebd")
    })

    it("resolves nested variable references", () => {
      const evaluator = new Evaluator()
      const decomposed = [
        {flatPath: "vars.primary", value: "#4b8ebd"},
        {flatPath: "vars.std.accent", value: "$(vars.primary)"},
        {flatPath: "theme.colors.background", value: "$(vars.std.accent)"}
      ]

      evaluator.evaluate(decomposed)

      assert.equal(decomposed[2].value, "#4b8ebd")
    })

    it("resolves colour functions", () => {
      const evaluator = new Evaluator()
      const decomposed = [
        {flatPath: "vars.primary", value: "#4b8ebd"},
        {flatPath: "theme.colors.background", value: "lighten($(vars.primary), 20)"}
      ]

      evaluator.evaluate(decomposed)

      assert.ok(decomposed[1].value.startsWith("#"))
      assert.notEqual(decomposed[1].value, "$(vars.primary)")
    })

    it("handles multiple passes for complex dependencies", () => {
      const evaluator = new Evaluator()
      const decomposed = [
        {flatPath: "vars.base", value: "#1a1a1a"},
        {flatPath: "vars.lighter", value: "lighten($(vars.base), 20)"},
        {flatPath: "theme.colors.background", value: "darken($(vars.lighter), 10)"}
      ]

      evaluator.evaluate(decomposed)

      assert.ok(decomposed[2].value.startsWith("#"))
    })

    it("throws on circular references", () => {
      const evaluator = new Evaluator()
      const decomposed = [
        {flatPath: "vars.a", value: "$(vars.b)"},
        {flatPath: "vars.b", value: "$(vars.a)"}
      ]

      assert.throws(
        () => evaluator.evaluate(decomposed),
        /circular|unresolved/i
      )
    })
  })
})
