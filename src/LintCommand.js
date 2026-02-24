/**
 * @file LintCommand.js
 *
 * Defines the LintCommand class for comprehensive theme file validation.
 * Provides static analysis of theme configuration files to identify:
 *   - Duplicate scope definitions across tokenColor rules
 *   - Undefined variable references in theme content
 *   - Unused variables defined in vars but never referenced
 *   - Scope precedence issues where broad scopes mask specific ones
 *   - TextMate scope selector conflicts and redundancies
 *
 * Integrates with the theme compilation pipeline to analyse both source
 * and compiled theme data, ensuring accurate variable resolution tracking.
 * Supports modular themes with import dependencies and provides detailed,
 * colour-coded reporting for different severity levels.
 */

import process from "node:process"

import c from "@gesslar/colours"
// import colorSupport from "color-support"

import Command from "./Command.js"
import Evaluator from "./Evaluator.js"
import Theme from "./Theme.js"
import {Term} from "@gesslar/toolkit"

/**
 * @import {ThemePool} from "./ThemePool.js"
 */

// oops, need to have @gesslar/colours support this, too!
// ansiColors.enabled = colorSupport.hasBasic

/**
 * Command handler for linting theme files for potential issues.
 * Validates tokenColors for duplicate scopes, undefined variables, unused
 * variables, and precedence issues that could cause unexpected theme
 * behaviour.
 */
export default class LintCommand extends Command {

  // Theme section constants
  static SECTIONS = {
    VARS: "vars",
    COLORS: "colors",
    TOKEN_COLORS: "tokenColors",
    SEMANTIC_TOKEN_COLORS: "semanticTokenColors"
  }

  // Issue severity levels
  static SEVERITY = {
    HIGH: "high",
    MEDIUM: "medium",
    LOW: "low"
  }

  // Issue type constants
  static ISSUE_TYPES = {
    DUPLICATE_SCOPE: "duplicate-scope",
    UNDEFINED_VARIABLE: "undefined-variable",
    UNUSED_VARIABLE: "unused-variable",
    PRECEDENCE_ISSUE: "precedence-issue"
  }

  // Template strings for dynamic rule names
  static TEMPLATES = {
    ENTRY_NAME: index => `Entry ${index + 1}`,
    OBJECT_NAME: index => `Object ${index + 1}`,
    VARIABLE_PREFIX: "$"
  }
  /**
   * Creates a new LintCommand instance.
   *
   * @param {object} base - Base configuration containing cwd and packageJson
   */
  constructor(base) {
    super(base)

    this.setCliCommand("lint <file>")
    this.setCliOptions({
      // Future options could include:
      // "fix": ["-f, --fix", "automatically fix issues where possible"],
      "strict": ["--strict", "treat warnings as errors"],
      // "format": ["--format <type>", "output format (text, json)", "text"],
    })
  }

  /**
   * Executes the lint command for a given theme file.
   * Validates the theme and reports any issues found.
   *
   * @param {string} inputArg - Path to the theme file to lint
   * @param {object} options - Linting options
   * @returns {Promise<void>} Resolves when linting is complete
   */
  async execute(inputArg, options = {}) {
    const cwd = this.getCwd()
    const fileObject = await this.resolveThemeFileName(inputArg, cwd)
    const theme = new Theme(fileObject, cwd, options)

    theme.setCache(this.getCache())
    await theme.load()
    await theme.build()

    const issues = await this.#lintTheme(theme)

    this.#reportIssues(issues)

    const exitSeverities = [LC.SEVERITY.HIGH]

    if(options.strict)
      exitSeverities.push(LC.SEVERITY.MEDIUM)

    if(issues.some(i => exitSeverities.includes(i.severity)))
      process.exit(1)
  }

  /**
   * Public method to lint a theme and return structured results for external
   * consumption.
   *
   * Returns categorized lint results for tokenColors, semanticTokenColors, and colors.
   *
   * @param {Theme} theme - The compiled theme object
   * @returns {Promise<object>} Object containing categorized lint results
   */
  async lint(theme) {
    const results = {
      [LC.SECTIONS.TOKEN_COLORS]: [],
      [LC.SECTIONS.SEMANTIC_TOKEN_COLORS]: [],
      [LC.SECTIONS.COLORS]: [],
      variables: []
    }

    const output = theme.getOutput()

    // Always perform structural linting (works with or without pool)
    if(output?.tokenColors)
      results[LC.SECTIONS.TOKEN_COLORS]
        .push(...this.#lintTokenColorsStructure(output.tokenColors))

    const pool = theme.getPool()

    // Only perform variable-dependent linting if pool exists
    if(pool) {
      // Get source data for variable analysis
      const colors = this.#getSection(
        theme, LC.SECTIONS.COLORS)
      const tokenColorTuples = this.#getSection(
        theme, LC.SECTIONS.TOKEN_COLORS)
      const semanticTokenColors = this.#getSection(
        theme, LC.SECTIONS.SEMANTIC_TOKEN_COLORS)

      // Variable-dependent linting
      results[LC.SECTIONS.COLORS]
        .push(...this.#lintColors(colors, pool))
      results[LC.SECTIONS.TOKEN_COLORS]
        .push(...this.#lintTokenColors(tokenColorTuples, pool))
      results[LC.SECTIONS.SEMANTIC_TOKEN_COLORS]
        .push(...this.#lintSemanticTokenColors(semanticTokenColors, pool))
      results.variables
        .push(...await this.#lintVariables(theme, pool))
    }

    return results
  }

  /**
   * Performs structural linting of tokenColors that doesn't require variable
   * information.
   *
   * Checks for duplicate scopes and precedence issues.
   *
   * @param {Array} tokenColors - Array of tokenColor entries
   * @returns {Array} Array of structural issues
   * @private
   */
  #lintTokenColorsStructure(tokenColors) {
    return [
      ...this.#checkDuplicateScopes(tokenColors),
      ...this.#checkPrecedenceIssues(tokenColors),
    ]
  }

  /**
   * Performs variable-dependent linting of tokenColors data.
   * Checks for undefined variable references.
   *
   * @param {Array<[object, Array]>} tokenColorTuples - Array of [file, tokenColors] tuples
   * @param {ThemePool} pool - The theme's variable pool
   * @returns {Array} Array of variable-related issues
   * @private
   */
  #lintTokenColors(tokenColorTuples, pool) {
    if(tokenColorTuples.length === 0)
      return []

    const issues = []

    for(const [_, tokenColors] of tokenColorTuples) {
      if(Array.isArray(tokenColors))
        issues.push(
          ...this.#checkUndefinedVariables(
            tokenColors, pool, LC.SECTIONS.TOKEN_COLORS))
    }

    return issues
  }

  /**
   * Performs variable-dependent linting of semanticTokenColors data.
   * Checks for undefined variable references.
   *
   * @param {Array<[object, object]>} semanticTokenColorTuples - Array of [file, semanticTokenColors] tuples
   * @param {ThemePool} pool - The theme's variable pool
   * @returns {Array} Array of variable-related issues
   * @private
   */
  #lintSemanticTokenColors(semanticTokenColorTuples, pool) {
    if(semanticTokenColorTuples.length === 0)
      return []

    const issues = []

    for(const [_, semanticTokenColors] of semanticTokenColorTuples)
      issues.push(...this.#checkUndefinedVariables(
        [semanticTokenColors], pool, LC.SECTIONS.SEMANTIC_TOKEN_COLORS)
      )

    return issues
  }

  /**
   * Performs variable-dependent linting of colors data.
   * Checks for undefined variable references.
   *
   * @param {Array<[object, object]>} colorTuples - Array of [file, colors] tuples
   * @param {ThemePool} pool - The theme's variable pool
   * @returns {Array} Array of variable-related issues
   * @private
   */
  #lintColors(colorTuples, pool) {
    if(colorTuples.length === 0)
      return []

    const issues = []

    for(const [_, colors] of colorTuples)
      issues.push(...this.#checkUndefinedVariables(
        [colors], pool, LC.SECTIONS.COLORS)
      )

    return issues
  }

  /**
   * Performs variable-dependent linting for unused variables.
   * Checks for variables defined but never used.
   *
   * @param {Theme} theme - The theme object
   * @param {ThemePool} pool - The theme's variable pool
   * @returns {Promise<Array>} Array of unused variable issues
   * @private
   */
  async #lintVariables(theme, pool) {
    return pool
      ? await this.#checkUnusedVariables(theme, pool)
      : []
  }

  /**
   * Performs comprehensive linting of a theme.
   * Returns an array of issues found during validation.
   *
   * @param {Theme} theme - The compiled theme object
   * @returns {Promise<Array>} Array of lint issues
   * @private
   */
  async #lintTheme(theme) {
    const results = await this.lint(theme)

    // Flatten all results into a single array for backward compatibility
    return [
      ...results[LC.SECTIONS.TOKEN_COLORS],
      ...results[LC.SECTIONS.SEMANTIC_TOKEN_COLORS],
      ...results[LC.SECTIONS.COLORS],
      ...results.variables
    ]
  }

  /**
   * Extracts a specific section from all theme dependencies (including main theme).
   *
   * Returns an array of [FileObject, sectionData] tuples for linting methods that need
   * to track which file each piece of data originated from for proper error reporting.
   *
   * @param {Theme} theme - The theme object with dependencies
   * @param {string} section - The section name to extract (vars, colors, tokenColors, semanticTokenColors)
   * @returns {Array<[object, object|Array]>} Array of [file, sectionData] tuples
   * @private
   */
  #getSection(theme, section) {
    return Array.from(theme.getDependencies()).map(dep => {
      const source = dep.getSource()

      if(source?.has(section))
        return [dep.getSourceFile(),source.get(section)]

      return false
    }).filter(Boolean)
  }

  /**
   * Reports lint issues to the user with appropriate formatting and colors.
   *
   * @param {Array} issues - Array of lint issues to report
   * @private
   */
  #reportIssues(issues) {
    if(issues.length === 0) {
      Term.info(c`{success}✓{/} No linting issues found`)

      return
    }

    const errors = issues.filter(i => i.severity === LC.SEVERITY.HIGH)
    const warnings = issues.filter(i => i.severity === LC.SEVERITY.MEDIUM)
    const infos = issues.filter(i => i.severity === LC.SEVERITY.LOW)
    const allIssues = errors.concat(warnings, infos)

    allIssues.forEach(issue => this.#reportSingleIssue(issue))

    // Clean summary
    const parts = []

    if(errors.length > 0)
      parts.push(`${errors.length} error${errors.length === 1 ? "" : "s"}`)

    if(warnings.length > 0)
      parts.push(`${warnings.length} warning${warnings.length === 1 ? "" : "s"}`)

    if(infos.length > 0)
      parts.push(`${infos.length} info`)

    Term.info(`\n${parts.join(", ")}`)
  }

  /**
   * Returns a colour-coded bullet indicator for a given severity level.
   *
   * @private
   * @param {"high"|"medium"|"low"} severity - Severity level to represent
   * @returns {string} A pre-coloured "●" character for terminal output
   */
  #getIndicator(severity) {
    switch(severity) {
      case LC.SEVERITY.HIGH: return c`{error}●{/}`
      case LC.SEVERITY.MEDIUM: return c`{warn}●{/}`
      case LC.SEVERITY.LOW:
      default: return c`{info}●{/}`
    }
  }

  /**
   * Reports a single lint issue with clean, minimal formatting.
   *
   * @param {object} issue - The issue to report
   * @private
   */
  #reportSingleIssue(issue) {
    const indicator = this.#getIndicator(issue.severity)

    switch(issue.type) {
      case LC.ISSUE_TYPES.DUPLICATE_SCOPE: {
        const rules = issue.occurrences.map(occ => `{loc}'${occ.name}{/}'`).join(", ")

        Term.info(c`${indicator} Scope '{context}${issue.scope}{/}' is duplicated in ${rules}`)
        break
      }

      case LC.ISSUE_TYPES.UNDEFINED_VARIABLE: {
        const sectionInfo = issue.section && issue.section !== LC.SECTIONS.TOKEN_COLORS ? ` in ${issue.section}` : ""

        Term.info(c`${indicator} Variable '{context}${issue.variable}{/}' is used but not defined in '${issue.rule}' (${issue.property} property)${sectionInfo}`)
        break
      }

      case LC.ISSUE_TYPES.UNUSED_VARIABLE: {
        Term.info(c`${indicator} Variable '{context}${issue.variable}{/}' is defined in '{loc}${issue.occurrence}{/}', but is never used`)
        break
      }

      case LC.ISSUE_TYPES.PRECEDENCE_ISSUE: {
        if(issue.broadIndex === issue.specificIndex) {
          Term.info(c`${indicator} Scope '{context}${issue.broadScope}{/}' makes more specific '{context}${issue.specificScope}{/}' redundant in '{loc}${issue.broadRule}{/}'`)
        } else {
          Term.info(c`${indicator} Scope '{context}${issue.broadScope}{/}' in '{loc}${issue.broadRule}{/}' masks more specific '{context}${issue.specificScope}{/}' in '{loc}${issue.specificRule}{/}'`)
        }

        break
      }
    }
  }

  /**
   * Checks for duplicate scopes across tokenColors rules.
   * Returns issues for scopes that appear in multiple rules.
   *
   * @param {Array} tokenColors - Array of tokenColors entries
   * @returns {Array} Array of duplicate scope issues
   * @private
   */
  #checkDuplicateScopes(tokenColors) {
    const issues = []
    const scopeOccurrences = new Map()

    tokenColors.forEach((entry, index) => {
      if(!entry.scope)
        return

      const scopes = entry.scope.split(",").map(s => s.trim())

      scopes.forEach(scope => {
        if(!scopeOccurrences.has(scope))
          scopeOccurrences.set(scope, [])

        scopeOccurrences.get(scope).push({
          index: index + 1,
          name: entry.name || LC.TEMPLATES.ENTRY_NAME(index),
          entry
        })
      })
    })

    // Report duplicate scopes
    for(const [scope, occurrences] of scopeOccurrences) {
      if(occurrences.length > 1) {
        issues.push({
          type: LC.ISSUE_TYPES.DUPLICATE_SCOPE,
          severity: LC.SEVERITY.MEDIUM,
          scope,
          occurrences
        })
      }
    }

    return issues
  }

  /**
   * Checks for undefined variables referenced in theme data.
   * Returns issues for variables that are used but not defined.
   *
   * @param {Array|object} themeData - Array of entries or object containing theme data
   * @param {ThemePool} pool - The theme's variable pool
   * @param {string} section - The section name (tokenColors, semanticTokenColors, colors)
   * @returns {Array} Array of undefined variable issues
   * @private
   */
  #checkUndefinedVariables(themeData, pool, section=LC.SECTIONS.TOKEN_COLORS) {
    const issues = []
    const definedVars = pool ? new Set(pool.getTokens().keys()) : new Set()

    if(section === LC.SECTIONS.TOKEN_COLORS && Array.isArray(themeData)) {
      themeData.forEach((entry, index) => {
        const settings = entry.settings || {}

        for(const [key, value] of Object.entries(settings)) {
          if(typeof value === "string") {
            const varName = Evaluator.extractVariableName(
              Evaluator.expandPaletteAliases(value))

            if(!varName)
              continue

            if(!definedVars.has(varName)) {
              issues.push({
                type: LC.ISSUE_TYPES.UNDEFINED_VARIABLE,
                severity: LC.SEVERITY.HIGH,
                variable: value,
                rule: entry.name || LC.TEMPLATES.ENTRY_NAME(index),
                property: key,
                section
              })
            }
          }
        }
      })
    } else if((section === LC.SECTIONS.SEMANTIC_TOKEN_COLORS ||
                section === LC.SECTIONS.COLORS)
                && Array.isArray(themeData)) {
      // Handle semanticTokenColors and colors as objects
      themeData.forEach((dataObject, objIndex) => {
        this.#checkObjectForUndefinedVariables(
          dataObject,
          definedVars,
          issues,
          section,
          LC.TEMPLATES.OBJECT_NAME(objIndex)
        )
      })
    }

    return issues
  }

  /**
   * Recursively checks an object for undefined variable references.
   *
   * @param {object} obj - The object to check
   * @param {Set} definedVars - Set of defined variable names
   * @param {Array} issues - Array to push issues to
   * @param {string} section - The section name
   * @param {string} ruleName - The rule/object name for reporting
   * @param {string} path - The current path in the object (for nested properties)
   * @private
   */
  #checkObjectForUndefinedVariables(obj, definedVars, issues, section, ruleName, path = "") {
    for(const [key, value] of Object.entries(obj ?? {})) {
      const currentPath = path ? `${path}.${key}` : key

      if(typeof value === "string") {
        const varName = Evaluator.extractVariableName(
          Evaluator.expandPaletteAliases(value))

        if(varName && !definedVars.has(varName)) {
          issues.push({
            type: LC.ISSUE_TYPES.UNDEFINED_VARIABLE,
            severity: LC.SEVERITY.HIGH,
            variable: value,
            rule: ruleName,
            property: currentPath,
            section
          })
        }
      } else if(typeof value === "object" && !Array.isArray(value)) {
        this.#checkObjectForUndefinedVariables(
          value, definedVars, issues, section, ruleName, currentPath
        )
      }
    }
  }

  /**
   * Checks for unused variables defined in vars section but not referenced in
   * theme content.
   *
   * Returns issues for variables that are defined in vars but never used.
   *
   * @param {Theme} theme - The compiled theme object
   * @param {ThemePool} pool - The theme's variable pool
   * @returns {Promise<Array>} Array of unused variable issues
   * @private
   */
  async #checkUnusedVariables(theme, pool) {
    const issues = []

    if(!pool || !theme.getSource())
      return issues

    // Get variables defined in the vars section only
    const definedVars = new Map()
    const cwd = this.getCwd()

    const usedVars = new Set()

    for(const dependency of theme.getDependencies()) {
      try {
        const depData = dependency.getSource()
        const depFile = dependency.getSourceFile()

        // Collect vars definitions
        if(depData?.vars) {
          const relativeDependencyPath =
            File.relativeOrAbsolutePath(cwd, depFile)

          this.#collectVarsDefinitions(
            depData.vars,
            definedVars,
            "",
            relativeDependencyPath
          )
        }

        // Find variable usage in colors, tokenColors, and semanticTokenColors sections
        this.#findVariableUsage(depData
          ?.get(LC.SECTIONS.COLORS), usedVars)
        this.#findVariableUsage(depData
          ?.get(LC.SECTIONS.TOKEN_COLORS), usedVars)
        this.#findVariableUsage(depData
          ?.get(LC.SECTIONS.SEMANTIC_TOKEN_COLORS), usedVars)
      } catch {
        // Ignore cache errors
      }
    }

    // Find vars-defined variables that are never used in content sections
    for(const [varName, filename] of definedVars) {
      if(!usedVars.has(varName)) {
        issues.push({
          type: LC.ISSUE_TYPES.UNUSED_VARIABLE,
          severity: LC.SEVERITY.LOW,
          variable: `${LC.TEMPLATES.VARIABLE_PREFIX}${varName}`,
          occurrence: filename,
        })
      }
    }

    return issues
  }

  /**
   * Recursively collects variable names defined in the vars section.
   * Adds found variable names to the definedVars map.
   *
   * @param {object|null} vars - The vars data structure to search
   * @param {Map} definedVars - Map to add found variable names and filenames to
   * @param {string} prefix - Current prefix for nested vars
   * @param {string} filename - The filename where this variable is defined
   * @private
   */
  #collectVarsDefinitions(vars, definedVars, prefix = "", filename = "") {
    for(const [key, value] of Object.entries(vars ?? {})) {
      const varName = prefix ? `${prefix}.${key}` : key

      definedVars.set(varName, filename)

      // If the value is an object, recurse for nested definitions
      if(typeof value === "object" && !Array.isArray(value))
        this.#collectVarsDefinitions(value, definedVars, varName, filename)
    }
  }

  /**
   * Recursively finds variable usage in any data structure.
   *
   * Adds found variable names to the usedVars set.
   *
   * @param {string|Array|object} data - The data structure to search
   * @param {Set} usedVars - Set to add found variable names to
   * @private
   */
  #findVariableUsage(data, usedVars) {
    if(!data)
      return

    if(typeof data === "string") {
      if(Evaluator.sub.test(data)) {
        const varName = Evaluator.extractVariableName(data)

        if(varName) {
          usedVars.add(varName)
        }
      }
    } else if(Array.isArray(data)) {
      data.forEach(item => this.#findVariableUsage(item, usedVars))
    } else if(typeof data === "object") {
      Object.values(data).forEach(
        value => this.#findVariableUsage(value, usedVars)
      )
    }
  }

  /**
   * Checks for precedence issues where broad scopes override specific ones.
   *
   * Returns issues for cases where a general scope appears after a more
   * specific one.
   *
   * @param {Array} tokenColors - Array of tokenColors entries
   * @returns {Array} Array of precedence issue warnings
   * @private
   */
  #checkPrecedenceIssues(tokenColors) {
    const issues = []
    const allScopes = []

    // Build a flat list of all scopes with their rule info
    tokenColors.forEach((entry, index) => {
      if(!entry.scope)
        return

      const scopes = entry.scope.split(",").map(s => s.trim())

      scopes.forEach(scope => {
        allScopes.push({
          scope,
          index: index + 1,
          name: entry.name || LC.TEMPLATES.ENTRY_NAME(index),
          entry
        })
      })
    })

    const {LOW,HIGH} = LC.SEVERITY

    // Check each scope against all later scopes
    for(let i = 0; i < allScopes.length; i++) {
      const current = allScopes[i]

      for(let j = i + 1; j < allScopes.length; j++) {
        const later = allScopes[j]

        // Check if the current (earlier) scope is broader than the later one
        // This means the broad scope will mask the specific scope
        if(this.#isBroaderScope(current.scope, later.scope)) {
          issues.push({
            type: LC.ISSUE_TYPES.PRECEDENCE_ISSUE,
            severity: current.index === later.index ? LOW : HIGH,
            specificScope: later.scope,
            broadScope: current.scope,
            specificRule: later.name,
            broadRule: current.name,
            specificIndex: later.index,
            broadIndex: current.index
          })
        }
      }
    }

    return issues
  }

  /**
   * Determines if one scope is broader than another.
   *
   * A broader scope will match the same tokens as a more specific scope, plus
   * others. Uses proper TextMate scope hierarchy rules.
   *
   * @param {string} broadScope - The potentially broader scope
   * @param {string} specificScope - The potentially more specific scope
   * @returns {boolean} True if broadScope is broader than specificScope
   * @private
   */
  #isBroaderScope(broadScope, specificScope) {
    // Scopes must be different to have a precedence relationship
    if(broadScope === specificScope)
      return false

    // Split both scopes into segments for proper comparison
    const broadSegments = broadScope.split(".")
    const specificSegments = specificScope.split(".")

    // A broader scope must have fewer or equal segments
    if(broadSegments.length > specificSegments.length)
      return false

    // All segments of the broad scope must match the specific scope's prefix
    return broadSegments.every((segment, index) =>
      segment === specificSegments[index]
    )
  }
}

// Aliases
const LC = LintCommand
