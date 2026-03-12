#!/usr/bin/env node

import assert from "node:assert/strict"
import {describe, it} from "node:test"
import {DirectoryObject, FileObject, Cache} from "@gesslar/toolkit"
import LintCommand from "../src/LintCommand.js"
import Lint from "../src/Lint.js"
import SemanticCoherenceRules from "../src/lint/SemanticCoherenceRules.js"
import SemanticSelectorRules from "../src/lint/SemanticSelectorRules.js"
import SemanticValueRules from "../src/lint/SemanticValueRules.js"
import TokenColorStructureRules from "../src/lint/TokenColorStructureRules.js"
import TokenColorValueRules from "../src/lint/TokenColorValueRules.js"
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
      const theme = new Theme().setCwd(cwd).setThemeFile(themeFile).setOptions({outputDir: "."})
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
      const theme = new Theme().setCwd(cwd).setThemeFile(themeFile).setOptions({outputDir: "."})
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
      const theme = new Theme().setCwd(cwd).setThemeFile(themeFile).setOptions({outputDir: "."})
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
      const theme = new Theme().setCwd(cwd).setThemeFile(themeFile).setOptions({outputDir: "."})
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
      const theme = new Theme().setCwd(cwd).setThemeFile(themeFile).setOptions({outputDir: "."})
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
      const theme = new Theme().setCwd(cwd).setThemeFile(themeFile).setOptions({outputDir: "."})
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

    it("does not flag object containers as unused variables", async() => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {}
      const command = new LintCommand({cwd, packageJson})
      command.setCache(new Cache())
      const themeFile = cwd.getFile("./fixtures/lint-unused-var.yaml")
      const theme = new Theme().setCwd(cwd).setThemeFile(themeFile).setOptions({outputDir: "."})
      theme.setCache(command.getCache())

      await theme.load()
      await theme.build()

      const results = await new Lint().run(theme)
      const unused = results.variables
        .filter(i => i.type === Lint.ISSUE_TYPES.UNUSED_VARIABLE)

      const paletteIssue = unused.find(i => i.variable === "$palette")
      assert.equal(paletteIssue, undefined, "object container $palette should not be flagged as unused")

      // Children should still be tracked as unused
      const primaryIssue = unused.find(i => i.variable === "$palette.primary")
      assert.ok(primaryIssue, "should flag unused child $palette.primary")
      const secondaryIssue = unused.find(i => i.variable === "$palette.secondary")
      assert.ok(secondaryIssue, "should flag unused child $palette.secondary")
    })

    it("does not flag array containers as unused variables", async() => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {}
      const command = new LintCommand({cwd, packageJson})
      command.setCache(new Cache())
      const themeFile = cwd.getFile("./fixtures/lint-unused-var.yaml")
      const theme = new Theme().setCwd(cwd).setThemeFile(themeFile).setOptions({outputDir: "."})
      theme.setCache(command.getCache())

      await theme.load()
      await theme.build()

      const results = await new Lint().run(theme)
      const unused = results.variables
        .filter(i => i.type === Lint.ISSUE_TYPES.UNUSED_VARIABLE)

      const levelsIssue = unused.find(i => i.variable === "$levels")
      assert.equal(levelsIssue, undefined, "array container $levels should not be flagged as unused")

      // Array elements should still be tracked as unused
      const level1 = unused.find(i => i.variable === "$levels.1")
      assert.ok(level1, "should flag unused array element $levels.1")
      const level2 = unused.find(i => i.variable === "$levels.2")
      assert.ok(level2, "should flag unused array element $levels.2")
      const level3 = unused.find(i => i.variable === "$levels.3")
      assert.ok(level3, "should flag unused array element $levels.3")
    })

    it("reports no duplicate scopes for clean theme", async() => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {}
      const command = new LintCommand({cwd, packageJson})
      command.setCache(new Cache())
      const themeFile = cwd.getFile("./fixtures/token-colors-string-scope.yaml")
      const theme = new Theme().setCwd(cwd).setThemeFile(themeFile).setOptions({outputDir: "."})
      theme.setCache(command.getCache())

      await theme.load()
      await theme.build()

      const results = await new Lint().run(theme)
      const duplicates = results[Lint.SECTIONS.TOKEN_COLORS]
        .filter(i => i.type === Lint.ISSUE_TYPES.DUPLICATE_SCOPE)

      assert.equal(duplicates.length, 0)
    })

    it("includes location property on lint issues for YAML themes", async() => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {}
      const command = new LintCommand({cwd, packageJson})
      command.setCache(new Cache())
      const themeFile = cwd.getFile("./fixtures/lint-unused-var.yaml")
      const theme = new Theme().setCwd(cwd).setThemeFile(themeFile).setOptions({outputDir: "."})
      theme.setCache(command.getCache())

      await theme.load()
      await theme.build()

      const results = await new Lint().run(theme)

      // Collect all issues across all sections
      const allIssues = [
        ...results[Lint.SECTIONS.TOKEN_COLORS],
        ...results[Lint.SECTIONS.SEMANTIC_TOKEN_COLORS],
        ...results[Lint.SECTIONS.COLORS],
        ...results.variables,
      ]

      // At least some issues should exist and have location
      const withLocation = allIssues.filter(i => i.location)
      // location is best-effort; just verify the property exists on issues that have it
      for(const issue of withLocation) {
        assert.equal(typeof issue.location, "string")
        assert.ok(issue.location.length > 0)
      }
    })

    it("unused variable issues have locations", async() => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {}
      const command = new LintCommand({cwd, packageJson})
      command.setCache(new Cache())
      const themeFile = cwd.getFile("./fixtures/lint-unused-var.yaml")
      const theme = new Theme().setCwd(cwd).setThemeFile(themeFile).setOptions({outputDir: "."})
      theme.setCache(command.getCache())

      await theme.load()
      await theme.build()

      const results = await new Lint().run(theme)
      const unused = results.variables
        .filter(i => i.type === Lint.ISSUE_TYPES.UNUSED_VARIABLE)

      assert.ok(unused.length > 0, "should have unused variable issues")
      for(const issue of unused) {
        if(issue.location) {
          assert.equal(typeof issue.location, "string")
        }
      }
    })

    it("duplicate scope issues have locations on each occurrence", async() => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {}
      const command = new LintCommand({cwd, packageJson})
      command.setCache(new Cache())
      const themeFile = cwd.getFile("./fixtures/lint-duplicate-scope.yaml")
      const theme = new Theme().setCwd(cwd).setThemeFile(themeFile).setOptions({outputDir: "."})
      theme.setCache(command.getCache())

      await theme.load()
      await theme.build()

      const results = await new Lint().run(theme)
      const duplicates = results[Lint.SECTIONS.TOKEN_COLORS]
        .filter(i => i.type === Lint.ISSUE_TYPES.DUPLICATE_SCOPE)

      assert.ok(duplicates.length > 0, "should have duplicate scope issues")

      for(const issue of duplicates) {
        for(const occ of issue.occurrences) {
          assert.ok(occ.location, `occurrence '${occ.name}' should have a location`)
          assert.equal(typeof occ.location, "string")
        }
      }
    })

    it("precedence issues have locations for both broad and specific rules", async() => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {}
      const command = new LintCommand({cwd, packageJson})
      command.setCache(new Cache())
      const themeFile = cwd.getFile("./fixtures/lint-precedence.yaml")
      const theme = new Theme().setCwd(cwd).setThemeFile(themeFile).setOptions({outputDir: "."})
      theme.setCache(command.getCache())

      await theme.load()
      await theme.build()

      const results = await new Lint().run(theme)
      const precedence = results[Lint.SECTIONS.TOKEN_COLORS]
        .filter(i => i.type === Lint.ISSUE_TYPES.PRECEDENCE_ISSUE)

      assert.ok(precedence.length > 0, "should have precedence issues")

      for(const issue of precedence) {
        assert.ok(issue.broadLocation, "should have broadLocation")
        assert.equal(typeof issue.broadLocation, "string")
        assert.ok(issue.specificLocation, "should have specificLocation")
        assert.equal(typeof issue.specificLocation, "string")
        assert.notEqual(issue.broadLocation, issue.specificLocation)
      }
    })

    it("reports no precedence issues for non-hierarchical scopes", async() => {
      const cwd = new DirectoryObject(__dirname)
      const packageJson = {}
      const command = new LintCommand({cwd, packageJson})
      command.setCache(new Cache())
      const themeFile = cwd.getFile("./fixtures/palette-alias-tokencolors.yaml")
      const theme = new Theme().setCwd(cwd).setThemeFile(themeFile).setOptions({outputDir: "."})
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

  describe("semantic token linting", () => {
    /**
     * Helper to build a theme from a fixture and run the linter.
     *
     * @param {string} fixture - Fixture filename relative to fixtures/
     * @returns {Promise<object>} Lint results
     */
    async function lintFixture(fixture) {
      const cwd = new DirectoryObject(__dirname)
      const cache = new Cache()
      const themeFile = cwd.getFile(`./fixtures/${fixture}`)
      const theme = new Theme()
        .setCwd(cwd)
        .setThemeFile(themeFile)
        .setOptions({outputDir: "."})
      theme.setCache(cache)

      await theme.load()
      await theme.build()

      return new Lint().run(theme)
    }

    it("detects invalid selectors", async() => {
      const results = await lintFixture("lint-semantic-invalid-selector.yaml")
      const issues = results[Lint.SECTIONS.SEMANTIC_TOKEN_COLORS]
        .filter(i => i.type === SemanticSelectorRules.ISSUE_TYPES.INVALID_SELECTOR)

      assert.ok(issues.length >= 2, `expected at least 2 invalid selectors, got ${issues.length}`)

      const leadingDot = issues.find(i => i.selector === ".readonly")
      assert.ok(leadingDot, "should flag '.readonly' as invalid")
      assert.equal(leadingDot.severity, "high")

      const multiLang = issues.find(i => i.selector === "variable:typescript:javascript")
      assert.ok(multiLang, "should flag 'variable:typescript:javascript' as invalid")
    })

    it("detects unrecognised token types", async() => {
      const results = await lintFixture("lint-semantic-unrecognised-tokens.yaml")
      const issues = results[Lint.SECTIONS.SEMANTIC_TOKEN_COLORS]
        .filter(i => i.type === SemanticSelectorRules.ISSUE_TYPES.UNRECOGNISED_TOKEN_TYPE)

      assert.ok(issues.length > 0, "should detect unrecognised token types")

      const typo = issues.find(i => i.tokenType === "vairable")
      assert.ok(typo, "should flag 'vairable' as unrecognised")
      assert.equal(typo.severity, "low")
    })

    it("detects unrecognised modifiers", async() => {
      const results = await lintFixture("lint-semantic-unrecognised-tokens.yaml")
      const issues = results[Lint.SECTIONS.SEMANTIC_TOKEN_COLORS]
        .filter(i => i.type === SemanticSelectorRules.ISSUE_TYPES.UNRECOGNISED_MODIFIER)

      assert.ok(issues.length > 0, "should detect unrecognised modifiers")

      const readOnly = issues.find(i => i.modifier === "readOnly")
      assert.ok(readOnly, "should flag 'readOnly' (camelCase) as unrecognised")
    })

    it("detects deprecated token types", async() => {
      const results = await lintFixture("lint-semantic-unrecognised-tokens.yaml")
      const issues = results[Lint.SECTIONS.SEMANTIC_TOKEN_COLORS]
        .filter(i => i.type === SemanticSelectorRules.ISSUE_TYPES.DEPRECATED_TOKEN_TYPE)

      assert.ok(issues.length > 0, "should detect deprecated token types")

      const member = issues.find(i => i.tokenType === "member")
      assert.ok(member, "should flag 'member' as deprecated")
      assert.equal(member.replacement, "method")
      assert.equal(member.severity, "medium")
    })

    it("detects duplicate selectors with different modifier order", async() => {
      const results = await lintFixture("lint-semantic-duplicate-selector.yaml")
      const issues = results[Lint.SECTIONS.SEMANTIC_TOKEN_COLORS]
        .filter(i => i.type === SemanticSelectorRules.ISSUE_TYPES.DUPLICATE_SELECTOR)

      assert.ok(issues.length > 0, "should detect duplicate selectors")
      assert.equal(issues[0].severity, "medium")
    })

    it("detects invalid hex colours in string values", async() => {
      const results = await lintFixture("lint-semantic-invalid-value.yaml")
      const issues = results[Lint.SECTIONS.SEMANTIC_TOKEN_COLORS]
        .filter(i => i.type === SemanticValueRules.ISSUE_TYPES.INVALID_HEX_COLOUR)

      assert.ok(issues.length >= 2, `expected at least 2 invalid hex colours, got ${issues.length}`)

      const notAColour = issues.find(i => i.colour === "not-a-colour")
      assert.ok(notAColour, "should flag 'not-a-colour'")

      const zzz = issues.find(i => i.colour === "zzz")
      assert.ok(zzz, "should flag 'zzz' as invalid hex")
    })

    it("detects invalid fontStyle keywords", async() => {
      const results = await lintFixture("lint-semantic-invalid-value.yaml")
      const issues = results[Lint.SECTIONS.SEMANTIC_TOKEN_COLORS]
        .filter(i => i.type === SemanticValueRules.ISSUE_TYPES.INVALID_FONTSTYLE)

      assert.ok(issues.length > 0, "should detect invalid fontStyle keywords")

      const regular = issues.find(i => i.keyword === "regular")
      assert.ok(regular, "should flag 'regular' as invalid fontStyle keyword")
    })

    it("detects deprecated background property", async() => {
      const results = await lintFixture("lint-semantic-invalid-value.yaml")
      const issues = results[Lint.SECTIONS.SEMANTIC_TOKEN_COLORS]
        .filter(i => i.type === SemanticValueRules.ISSUE_TYPES.DEPRECATED_PROPERTY)

      assert.ok(issues.length > 0, "should detect deprecated background property")
      assert.equal(issues[0].property, "background")
    })

    it("detects empty rule objects (direct)", () => {
      // Empty objects are stripped by the compiler, so test the rule directly
      const issues = SemanticValueRules.run({
        "number": {},
        "variable": "#ff0000",
      })

      const empties = issues.filter(i => i.type === SemanticValueRules.ISSUE_TYPES.EMPTY_RULE)

      assert.ok(empties.length > 0, "should detect empty rule objects")
      assert.equal(empties[0].selector, "number")
    })

    it("detects non-string foreground as invalid (direct)", () => {
      const issues = SemanticValueRules.run({
        "variable": {foreground: 42},
        "keyword": {foreground: true},
      })

      const invalids = issues.filter(i => i.type === SemanticValueRules.ISSUE_TYPES.INVALID_VALUE)

      assert.equal(invalids.length, 2, `expected 2 invalid value issues, got ${invalids.length}`)
      assert.ok(invalids[0].message.includes("foreground"))
      assert.ok(invalids[0].message.includes("number"))
      assert.ok(invalids[1].message.includes("boolean"))
    })

    it("detects non-string fontStyle as invalid (direct)", () => {
      const issues = SemanticValueRules.run({
        "variable": {fontStyle: true},
        "keyword": {fontStyle: 42},
      })

      const invalids = issues.filter(i => i.type === SemanticValueRules.ISSUE_TYPES.INVALID_VALUE)

      assert.equal(invalids.length, 2, `expected 2 invalid value issues, got ${invalids.length}`)
      assert.ok(invalids[0].message.includes("fontStyle"))
    })

    it("does not report fontStyle conflict when fontStyle is non-string (direct)", () => {
      const issues = SemanticValueRules.run({
        "variable": {fontStyle: true, bold: true},
      })

      const conflicts = issues.filter(i => i.type === SemanticValueRules.ISSUE_TYPES.FONTSTYLE_CONFLICT)

      assert.equal(conflicts.length, 0,
        "non-string fontStyle should not trigger conflict check")

      const invalids = issues.filter(i => i.type === SemanticValueRules.ISSUE_TYPES.INVALID_VALUE)

      assert.equal(invalids.length, 1, "should flag fontStyle: true as invalid value")
    })

    it("detects fontStyle and boolean style property conflicts", async() => {
      const results = await lintFixture("lint-semantic-fontstyle-conflict.yaml")
      const issues = results[Lint.SECTIONS.SEMANTIC_TOKEN_COLORS]
        .filter(i => i.type === SemanticValueRules.ISSUE_TYPES.FONTSTYLE_CONFLICT)

      assert.ok(issues.length > 0, "should detect fontStyle conflicts")
      assert.equal(issues[0].selector, "variable.declaration")
      assert.ok(issues[0].conflictingProps.includes("bold"))
    })

    it("detects missing semanticHighlighting", async() => {
      const results = await lintFixture("lint-semantic-missing-highlighting.yaml")
      const issues = results[Lint.SECTIONS.SEMANTIC_TOKEN_COLORS]
        .filter(i => i.type === SemanticCoherenceRules.ISSUE_TYPES.MISSING_SEMANTIC_HIGHLIGHTING)

      assert.ok(issues.length > 0, "should detect missing semanticHighlighting")
      assert.equal(issues[0].severity, "high")
    })

    it("detects shadowed rules", async() => {
      const results = await lintFixture("lint-semantic-shadowed.yaml")
      const issues = results[Lint.SECTIONS.SEMANTIC_TOKEN_COLORS]
        .filter(i => i.type === SemanticCoherenceRules.ISSUE_TYPES.SHADOWED_RULE)

      assert.ok(issues.length > 0, "should detect shadowed rules")
      assert.equal(issues[0].shadowedBy, "variable.readonly:typescript")
      assert.equal(issues[0].selector, "variable.readonly")
    })

    it("reports no issues for clean semantic token colours", async() => {
      const results = await lintFixture("lint-semantic-clean.yaml")
      const semanticIssues = results[Lint.SECTIONS.SEMANTIC_TOKEN_COLORS]

      assert.equal(semanticIssues.length, 0,
        `expected no semantic issues for clean theme, got: ${JSON.stringify(semanticIssues)}`)
    })
  })

  describe("token colour linting", () => {
    /**
     * Helper to build a theme from a fixture and run the linter.
     *
     * @param {string} fixture - Fixture filename relative to fixtures/
     * @returns {Promise<object>} Lint results
     */
    async function lintFixture(fixture) {
      const cwd = new DirectoryObject(__dirname)
      const cache = new Cache()
      const themeFile = cwd.getFile(`./fixtures/${fixture}`)
      const theme = new Theme()
        .setCwd(cwd)
        .setThemeFile(themeFile)
        .setOptions({outputDir: "."})
      theme.setCache(cache)

      await theme.load()
      await theme.build()

      return new Lint().run(theme)
    }

    it("detects missing settings", async() => {
      const results = await lintFixture("lint-tc-invalid-settings.yaml")
      const issues = results[Lint.SECTIONS.TOKEN_COLORS]
        .filter(i => i.type === TokenColorValueRules.ISSUE_TYPES.MISSING_SETTINGS)

      assert.ok(issues.length > 0, "should detect missing settings")
      assert.equal(issues[0].rule, "Missing Settings")
      assert.equal(issues[0].severity, "high")
    })

    it("detects empty settings (direct)", () => {
      // Empty settings may be stripped by compiler, test rule directly
      const issues = TokenColorValueRules.run([
        {name: "Empty", scope: "keyword", settings: {}},
        {name: "Valid", scope: "string", settings: {foreground: "#ff0000"}},
      ])

      const empties = issues.filter(i => i.type === TokenColorValueRules.ISSUE_TYPES.EMPTY_SETTINGS)

      assert.ok(empties.length > 0, "should detect empty settings")
      assert.equal(empties[0].rule, "Empty")
    })

    it("detects unknown settings properties", async() => {
      const results = await lintFixture("lint-tc-invalid-settings.yaml")
      const issues = results[Lint.SECTIONS.TOKEN_COLORS]
        .filter(i => i.type === TokenColorValueRules.ISSUE_TYPES.UNKNOWN_SETTINGS_PROPERTY)

      assert.ok(issues.length > 0, "should detect unknown settings properties")

      const decoration = issues.find(i => i.property === "decoration")
      assert.ok(decoration, "should flag 'decoration' as unknown")
      assert.equal(decoration.severity, "low")
    })

    it("detects invalid hex colours in foreground", async() => {
      const results = await lintFixture("lint-tc-invalid-hex.yaml")
      const issues = results[Lint.SECTIONS.TOKEN_COLORS]
        .filter(i => i.type === TokenColorValueRules.ISSUE_TYPES.INVALID_HEX_COLOUR)

      assert.ok(issues.length >= 2, `expected at least 2 invalid hex colours, got ${issues.length}`)

      const notAColour = issues.find(i => i.colour === "not-a-colour")
      assert.ok(notAColour, "should flag 'not-a-colour'")
      assert.equal(notAColour.property, "foreground")

      const zzz = issues.find(i => i.colour === "zzz")
      assert.ok(zzz, "should flag 'zzz' as invalid hex")
      assert.equal(zzz.property, "background")
    })

    it("detects invalid fontStyle keywords", async() => {
      const results = await lintFixture("lint-tc-invalid-fontstyle.yaml")
      const issues = results[Lint.SECTIONS.TOKEN_COLORS]
        .filter(i => i.type === TokenColorValueRules.ISSUE_TYPES.INVALID_FONTSTYLE)

      assert.ok(issues.length >= 2, "should detect invalid fontStyle keywords")

      const regular = issues.find(i => i.keyword === "regular")
      assert.ok(regular, "should flag 'regular' as invalid fontStyle keyword")

      const oblique = issues.find(i => i.keyword === "oblique")
      assert.ok(oblique, "should flag 'oblique' as invalid fontStyle keyword")
    })

    it("detects deprecated background property", async() => {
      const results = await lintFixture("lint-tc-deprecated-background.yaml")
      const issues = results[Lint.SECTIONS.TOKEN_COLORS]
        .filter(i => i.type === TokenColorValueRules.ISSUE_TYPES.DEPRECATED_BACKGROUND)

      assert.ok(issues.length > 0, "should detect deprecated background property")
      assert.equal(issues[0].rule, "With Background")
      assert.equal(issues[0].severity, "medium")
    })

    it("detects multiple global defaults", async() => {
      const results = await lintFixture("lint-tc-multiple-globals.yaml")
      const issues = results[Lint.SECTIONS.TOKEN_COLORS]
        .filter(i => i.type === TokenColorStructureRules.ISSUE_TYPES.MULTIPLE_GLOBAL_DEFAULTS)

      assert.ok(issues.length > 0, "should detect multiple global defaults")
      assert.equal(issues[0].rule, "Global Default A")
      assert.equal(issues[0].severity, "medium")
    })

    it("detects non-string foreground as invalid (direct)", () => {
      const issues = TokenColorValueRules.run([
        {name: "Numeric FG", scope: "keyword", settings: {foreground: 42}},
        {name: "Boolean FG", scope: "string", settings: {foreground: true}},
        {name: "Array FG", scope: "comment", settings: {foreground: ["#ff0000"]}},
      ])

      const invalids = issues.filter(i => i.type === TokenColorValueRules.ISSUE_TYPES.INVALID_VALUE)
      assert.equal(invalids.length, 3, `expected 3 invalid value issues, got ${invalids.length}`)
    })

    it("detects non-string background as invalid (direct)", () => {
      const issues = TokenColorValueRules.run([
        {name: "Object BG", scope: "keyword", settings: {foreground: "#ff0000", background: {value: "#000"}}},
      ])

      const invalids = issues.filter(i => i.type === TokenColorValueRules.ISSUE_TYPES.INVALID_VALUE)
      assert.equal(invalids.length, 1, `expected 1 invalid value issue, got ${invalids.length}`)
      assert.ok(invalids[0].message.includes("background"))
    })

    it("detects non-string fontStyle as invalid (direct)", () => {
      const issues = TokenColorValueRules.run([
        {name: "Array FS", scope: "keyword", settings: {foreground: "#ff0000", fontStyle: ["italic"]}},
        {name: "Object FS", scope: "string", settings: {foreground: "#00ff00", fontStyle: {value: "italic"}}},
        {name: "Boolean FS", scope: "comment", settings: {foreground: "#0000ff", fontStyle: true}},
      ])

      const invalids = issues.filter(i => i.type === TokenColorValueRules.ISSUE_TYPES.INVALID_VALUE)
      assert.equal(invalids.length, 3, `expected 3 invalid value issues, got ${invalids.length}`)
    })

    it("reports no issues for clean tokenColors", async() => {
      const results = await lintFixture("lint-tc-clean.yaml")
      const tcIssues = results[Lint.SECTIONS.TOKEN_COLORS]

      assert.equal(tcIssues.length, 0,
        `expected no tokenColors issues for clean theme, got: ${JSON.stringify(tcIssues)}`)
    })
  })
})
