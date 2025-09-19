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

import c from "@gesslar/colours"
// import colorSupport from "color-support"

import Command from "./Command.js"
import Evaluator from "./Evaluator.js"
import File from "./File.js"
import FileObject from "./FileObject.js"
import Term from "./Term.js"
import Theme from "./Theme.js"
import ThemePool from "./ThemePool.js"

// oops, need to have @gesslar/colours support this, too!
// ansiColors.enabled = colorSupport.hasBasic

/**
 * Command handler for linting theme files for potential issues.
 * Validates tokenColors for duplicate scopes, undefined variables, unused
 * variables, and precedence issues that could cause unexpected theme
 * behaviour.
 */
export default class LintCommand extends Command {
  /**
   * Creates a new LintCommand instance.
   *
   * @param {object} base - Base configuration containing cwd and packageJson
   */
  constructor(base) {
    super(base)

    this.cliCommand = "lint <file>"
    this.cliOptions = {
      // Future options could include:
      // "fix": ["-f, --fix", "automatically fix issues where possible"],
      // "strict": ["--strict", "treat warnings as errors"],
      // "format": ["--format <type>", "output format (text, json)", "text"],
    }
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

    await theme
      .setCache(this.cache)
      .load()
      .build()

    const issues = await this.#lintTheme(theme)

    this.#reportIssues(issues)
  }

  /**
   * Public method to lint a theme and return structured results for external consumption.
   * Returns categorized lint results for tokenColors, semanticTokenColors, and colors.
   *
   * @param {Theme} theme - The compiled theme object
   * @returns {Promise<object>} Object containing categorized lint results
   */
  async lint(theme) {
    const results = {
      tokenColors: [],
      semanticTokenColors: [],
      colors: [],
      variables: []
    }

    const pool = theme.pool

    // Always perform structural linting (works with or without pool)
    if(theme.output?.tokenColors)
      results.tokenColors.push(
        ...this.#lintTokenColorsStructure(theme.output.tokenColors)
      )

    // Only perform variable-dependent linting if pool exists
    if(pool) {
      // Get source data for variable analysis
      const colors = await this.getColors(theme)
      const tokenColors = await this.#getTokenColors(theme)
      const semanticTokenColors = await this.getSemanticTokenColors(theme)

      // Variable-dependent linting
      results.colors.push(...this.#lintColors(colors, pool))
      results.tokenColors.push(...this.lintTokenColors(tokenColors, pool))
      results.semanticTokenColors.push(...this.#lintSemanticTokenColors(semanticTokenColors, pool))
      results.variables.push(...this.#lintVariables(theme, pool))
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
   * @param {Array} sourceTokenColors - Array of source tokenColor entries
   * @param {ThemePool} pool - The theme's variable pool
   * @returns {Array} Array of variable-related issues
   */
  lintTokenColors(sourceTokenColors, pool) {
    return pool
      ? this.#checkUndefinedVariables(sourceTokenColors, pool, "tokenColors")
      : []
  }

  /**
   * Performs variable-dependent linting of semanticTokenColors data.
   * Checks for undefined variable references.
   *
   * @param {Array} semanticTokenColors - Array of source semanticTokenColors entries
   * @param {ThemePool} pool - The theme's variable pool
   * @returns {Array} Array of variable-related issues
   */
  #lintSemanticTokenColors(semanticTokenColors, pool) {
    return pool && semanticTokenColors.length > 0
      ? this.#checkUndefinedVariables(semanticTokenColors, pool, "semanticTokenColors")
      : []
  }

  /**
   * Performs variable-dependent linting of colors data.
   * Checks for undefined variable references.
   *
   * @param {Array} sourceColors - Array of source colors entries
   * @param {ThemePool} pool - The theme's variable pool
   * @returns {Array} Array of variable-related issues
   */
  #lintColors(sourceColors, pool) {
    return pool && sourceColors.length > 0
      ? this.#checkUndefinedVariables(sourceColors, pool, "colors")
      : []
  }

  /**
   * Performs variable-dependent linting for unused variables.
   * Checks for variables defined but never used.
   *
   * @param {Theme} theme - The theme object
   * @param {ThemePool} pool - The theme's variable pool
   * @returns {Array} Array of unused variable issues
   */
  #lintVariables(theme, pool) {
    return pool
      ? this.#checkUnusedVariables(theme, pool)
      : []
  }

  /**
   * Performs comprehensive linting of a theme.
   * Returns an array of issues found during validation.
   *
   * @param {Theme} theme - The compiled theme object
   * @returns {Promise<Array>} Array of lint issues
   */
  async #lintTheme(theme) {
    const results = await this.lint(theme)

    // Flatten all results into a single array for backward compatibility
    return [
      ...results.tokenColors,
      ...results.semanticTokenColors,
      ...results.colors,
      ...results.variables
    ]
  }

  /**
   * Extracts the original source tokenColors data from theme.source and dependencies.
   * Used for variable analysis since we need the uncompiled data with variable references.
   *
   * @param {Theme} theme - The compiled theme object (contains both output and source)
   * @returns {Promise<Array>} Array of source tokenColors entries with variables intact
   */
  async #getTokenColors(theme) {
    const sourceTokenColors = []

    // Get tokenColors from main theme source
    if(theme.source?.theme?.tokenColors)
      sourceTokenColors.push(...theme.source.theme.tokenColors)

    // Get tokenColors from imported files
    if(theme.dependencies) {
      for(const dependency of theme.dependencies) {
        // Skip main file, already processed
        if(dependency.path !== theme.sourceFile.path) {
          try {
            const depData = await theme.cache.loadCachedData(dependency)

            if(depData?.theme?.tokenColors)
              sourceTokenColors.push(...depData.theme.tokenColors)
          } catch {
            // nothing to see here.
          }
        }
      }
    }

    return sourceTokenColors
  }

  /**
   * Extracts the original source semanticTokenColors data from theme.source and dependencies.
   * Used for variable analysis since we need the uncompiled data with variable references.
   *
   * @param {Theme} theme - The compiled theme object (contains both output and source)
   * @returns {Promise<Array>} Array of source semanticTokenColors entries with variables intact
   */
  async getSemanticTokenColors(theme) {
    const sourceSemanticTokenColors = []

    // Get semanticTokenColors from main theme source
    if(theme.source?.theme?.semanticTokenColors)
      sourceSemanticTokenColors.push(theme.source.theme.semanticTokenColors)

    // Get semanticTokenColors from imported files
    if(theme.dependencies) {
      for(const dependency of theme.dependencies) {
        // Skip main file, already processed
        if(dependency.path !== theme.sourceFile.path) {
          try {
            const depData = await theme.cache.loadCachedData(dependency)

            if(depData?.theme?.semanticTokenColors)
              sourceSemanticTokenColors.push(depData.theme.semanticTokenColors)
          } catch {
            // nothing to see here.
          }
        }
      }
    }

    return sourceSemanticTokenColors
  }

  /**
   * Extracts the original source colors data from theme.source and dependencies.
   * Used for variable analysis since we need the uncompiled data with variable references.
   *
   * @param {Theme} theme - The compiled theme object (contains both output and source)
   * @returns {Promise<Array>} Array of source colors entries with variables intact
   */
  async getColors(theme) {
    const sourceColors = []

    // Get colors from main theme source
    if(theme.source?.theme?.colors)
      sourceColors.push(theme.source.theme.colors)

    // Get colors from imported files
    if(theme.dependencies) {
      for(const dependency of theme.dependencies) {
        // Skip main file, already processed
        if(dependency.path !== theme.sourceFile.path) {
          try {
            const depData = await theme.cache.loadCachedData(dependency)

            if(depData?.theme?.colors)
              sourceColors.push(depData.theme.colors)
          } catch {
            // nothing to see here.
          }
        }
      }
    }

    return sourceColors
  }

  /**
   * Reports lint issues to the user with appropriate formatting and colors.
   *
   * @param {Array} issues - Array of lint issues to report
   */
  #reportIssues(issues) {
    if(issues.length === 0) {
      Term.info(c`{success}✓{/} No linting issues found`)

      return
    }

    const errors = issues.filter(i => i.severity === "high")
    const warnings = issues.filter(i => i.severity === "medium")
    const infos = issues.filter(i => i.severity === "low")

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

  #getIndicator(severity) {
    switch(severity) {
      case "high": return c`{error}●{/}`
      case "medium": return c`{warn}●{/}`
      case "low":
      default: return c`{info}●{/}`
    }
  }

  /**
   * Reports a single lint issue with clean, minimal formatting.
   *
   * @param {object} issue - The issue to report
   */
  #reportSingleIssue(issue) {
    const indicator = this.#getIndicator(issue.severity)

    switch(issue.type) {
      case "duplicate-scope": {
        const rules = issue.occurrences.map(occ => `{loc}'${occ.name}{/}'`).join(", ")

        Term.info(c`${indicator} Scope '{context}${issue.scope}{/}' is duplicated in ${rules}`)
        break
      }

      case "undefined-variable": {
        const sectionInfo = issue.section && issue.section !== "tokenColors" ? ` in ${issue.section}` : ""

        Term.info(c`${indicator} Variable '{context}${issue.variable}{/}' is used but not defined in '${issue.rule}' (${issue.property} property)${sectionInfo}`)
        break
      }

      case "unused-variable": {
        Term.info(c`${indicator} Variable '{context}${issue.variable}{/}' is defined in '{loc}${issue.occurence}{/}', but is never used`)
        break
      }

      case "precedence-issue": {
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
   */
  #checkDuplicateScopes(tokenColors) {
    const issues = []
    const scopeOccurrences = new Map()

    tokenColors.forEach((entry, index) => {
      if(!entry.scope)
        return

      const scopes = entry.scope.split(",").map(s => s.trim())

      scopes.forEach(scope => {
        if(!scopeOccurrences.has(scope)) {
          scopeOccurrences.set(scope, [])
        }

        scopeOccurrences.get(scope).push({
          index: index + 1,
          name: entry.name || `Entry ${index + 1}`,
          entry
        })
      })
    })

    // Report duplicate scopes
    for(const [scope, occurrences] of scopeOccurrences) {
      if(occurrences.length > 1) {
        issues.push({
          type: "duplicate-scope",
          severity: "medium",
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
   */
  #checkUndefinedVariables(themeData, pool, section = "tokenColors") {
    const issues = []
    const definedVars = pool ? new Set(pool.getTokens.keys()) : new Set()

    if(section === "tokenColors" && Array.isArray(themeData)) {
      themeData.forEach((entry, index) => {
        const settings = entry.settings || {}

        for(const [key, value] of Object.entries(settings)) {
          if(typeof value === "string") {
            const {none,parens,braces} = Evaluator.sub.exec(value)?.groups ?? {}
            const varName = none || parens || braces

            if(!varName)
              return

            if(!definedVars.has(varName)) {
              issues.push({
                type: "undefined-variable",
                severity: "high",
                variable: value,
                rule: entry.name || `Entry ${index + 1}`,
                property: key,
                section
              })
            }
          }
        }
      })
    } else if((section === "semanticTokenColors" || section === "colors") && Array.isArray(themeData)) {
      // Handle semanticTokenColors and colors as objects
      themeData.forEach((dataObject, objIndex) => {
        if(dataObject && typeof dataObject === "object") {
          this.#checkObjectForUndefinedVariables(dataObject, definedVars, issues, section, `Object ${objIndex + 1}`)
        }
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
   */
  #checkObjectForUndefinedVariables(obj, definedVars, issues, section, ruleName, path = "") {
    for(const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key

      if(typeof value === "string") {
        const {none, parens, braces} = Evaluator.sub.exec(value)?.groups ?? {}
        const varName = none || parens || braces

        if(varName && !definedVars.has(varName)) {
          issues.push({
            type: "undefined-variable",
            severity: "high",
            variable: value,
            rule: ruleName,
            property: currentPath,
            section
          })
        }
      } else if(value && typeof value === "object" && !Array.isArray(value)) {
        this.#checkObjectForUndefinedVariables(value, definedVars, issues, section, ruleName, currentPath)
      }
    }
  }

  /**
   * Checks for unused variables defined in vars section but not referenced in theme content.
   * Returns issues for variables that are defined in vars but never used.
   *
   * @param {Theme} theme - The compiled theme object
   * @param {ThemePool} pool - The theme's variable pool
   * @returns {Array} Array of unused variable issues
   */
  #checkUnusedVariables(theme, pool) {
    const issues = []

    if(!pool || !theme.source)
      return issues

    // Get variables defined in the vars section only
    const definedVars = new Map()
    const {cwd} = this
    const mainFile = new FileObject(theme.sourceFile.path)
    const relativeMainPath = File.relativeOrAbsolutePath(cwd, mainFile)

    this.#collectVarsDefinitions(theme.source.vars, definedVars, "", relativeMainPath)

    // Also check dependencies for vars definitions
    if(theme.dependencies) {
      for(const dependency of theme.dependencies) {
        try {
          const depData = theme.cache?.loadCachedDataSync?.(dependency)

          if(depData?.vars) {
            const depFile = new FileObject(dependency.path)
            const relativeDependencyPath = File.relativeOrAbsolutePath(cwd, depFile)

            this.#collectVarsDefinitions(depData.vars, definedVars, "", relativeDependencyPath)
          }
        } catch {
          // Ignore cache errors
        }
      }
    }

    const usedVars = new Set()

    // Find variable usage in colors, tokenColors, and semanticColors sections
    if(theme.source.colors) {
      this.#findVariableUsage(theme.source.colors, usedVars)
    }

    if(theme.source.tokenColors) {
      this.#findVariableUsage(theme.source.tokenColors, usedVars)
    }

    if(theme.source.semanticColors) {
      this.#findVariableUsage(theme.source.semanticColors, usedVars)
    }

    // Also check dependencies for usage in these sections
    if(theme.dependencies) {
      for(const dependency of theme.dependencies) {
        try {
          const depData = theme.cache?.loadCachedDataSync?.(dependency)

          if(depData) {
            if(depData.colors)
              this.#findVariableUsage(depData.colors, usedVars)

            if(depData.tokenColors)
              this.#findVariableUsage(depData.tokenColors, usedVars)

            if(depData.semanticColors)
              this.#findVariableUsage(depData.semanticColors, usedVars)
          }
        } catch {
          // Ignore cache errors
        }
      }
    }

    // Find vars-defined variables that are never used in content sections
    for(const [varName, filename] of definedVars) {
      if(!usedVars.has(varName)) {
        issues.push({
          type: "unused-variable",
          severity: "low",
          variable: `$${varName}`,
          occurence: filename,
        })
      }
    }

    return issues
  }

  /**
   * Recursively collects variable names defined in the vars section.
   * Adds found variable names to the definedVars map.
   *
   * @param {any} vars - The vars data structure to search
   * @param {Map} definedVars - Map to add found variable names and filenames to
   * @param {string} prefix - Current prefix for nested vars
   * @param {string} filename - The filename where this variable is defined
   */
  #collectVarsDefinitions(vars, definedVars, prefix = "", filename = "") {
    if(!vars || typeof vars !== "object")
      return

    for(const [key, value] of Object.entries(vars)) {
      const varName = prefix ? `${prefix}.${key}` : key

      definedVars.set(varName, filename)

      // If the value is an object, recurse for nested definitions
      if(value && typeof value === "object" && !Array.isArray(value)) {
        this.#collectVarsDefinitions(value, definedVars, varName, filename)
      }
    }
  }

  /**
   * Recursively finds variable usage in any data structure.
   * Adds found variable names to the usedVars set.
   *
   * @param {any} data - The data structure to search
   * @param {Set} usedVars - Set to add found variable names to
   */
  #findVariableUsage(data, usedVars) {
    if(typeof data === "string") {
      if(Evaluator.sub.test(data)) {
        const {none, parens, braces} = Evaluator.sub.exec(data)?.groups ?? {}
        const varName = none || parens || braces

        if(varName) {
          usedVars.add(varName)
        }
      }
    } else if(Array.isArray(data)) {
      data.forEach(item => this.#findVariableUsage(item, usedVars))
    } else if(data && typeof data === "object") {
      Object.values(data).forEach(value => this.#findVariableUsage(value, usedVars))
    }
  }

  /**
   * Checks for precedence issues where broad scopes override specific ones.
   * Returns issues for cases where a general scope appears after a more specific one.
   *
   * @param {Array} tokenColors - Array of tokenColors entries
   * @returns {Array} Array of precedence issue warnings
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
          name: entry.name || `Entry ${index + 1}`,
          entry
        })
      })
    })

    // Check each scope against all later scopes
    for(let i = 0; i < allScopes.length; i++) {
      const current = allScopes[i]

      for(let j = i + 1; j < allScopes.length; j++) {
        const later = allScopes[j]

        // Check if the current (earlier) scope is broader than the later one
        // This means the broad scope will mask the specific scope
        if(this.#isBroaderScope(current.scope, later.scope)) {
          issues.push({
            type: "precedence-issue",
            severity: current.index === later.index ? "low" : "high",
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
   * A broader scope will match the same tokens as a more specific scope, plus others.
   *
   * @param {string} broadScope - The potentially broader scope
   * @param {string} specificScope - The potentially more specific scope
   * @returns {boolean} True if broadScope is broader than specificScope
   */
  #isBroaderScope(broadScope, specificScope) {
    // Simple heuristic: if the specific scope starts with the broad scope + "."
    // then the broad scope is indeed broader
    // e.g., "keyword" is broader than "keyword.control", "keyword.control.import"
    return specificScope.startsWith(broadScope + ".")
  }
}
