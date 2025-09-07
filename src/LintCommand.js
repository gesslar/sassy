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

import AuntyCommand from "./components/AuntyCommand.js"
import Theme from "./components/Theme.js"
import Term from "./components/Term.js"
import ThemePool from "./components/ThemePool.js"

import ansiColors from "ansi-colors"
import colorSupport from "color-support"
import Evaluator from "./components/Evaluator.js"

ansiColors.enabled = colorSupport.hasBasic

/**
 * Command handler for linting theme files for potential issues.
 * Validates tokenColors for duplicate scopes, undefined variables, unused
 * variables, and precedence issues that could cause unexpected theme
 * behaviour.
 */
export default class LintCommand extends AuntyCommand {
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

    // Set up color aliases for minimal, clean output
    ansiColors.alias("success", ansiColors.green)
    ansiColors.alias("error", ansiColors.red)
    ansiColors.alias("warning", ansiColors.yellowBright)
    ansiColors.alias("info", ansiColors.blackBright)
    ansiColors.alias("context", ansiColors.whiteBright)
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
    const {cwd} = this
    const fileObject = await this.resolveThemeFileName(inputArg, cwd)
    const theme = new Theme(fileObject, cwd, options)

    theme.cache = this.cache

    await theme.load()
    await theme.build()

    const issues = await this.lintTheme(theme)

    this.reportIssues(issues)
  }

  /**
   * Performs comprehensive linting of a theme.
   * Returns an array of issues found during validation.
   *
   * @param {Theme} theme - The compiled theme object
   * @returns {Promise<Array>} Array of lint issues
   */
  async lintTheme(theme) {
    const issues = []
    const tokenColors = theme.output?.tokenColors || []
    const pool = theme.pool

    // Get source tokenColors data (before compilation) for variable usage analysis
    const sourceTokenColors = await this.getSourceTokenColors(theme)

    // 1. Check for duplicate scopes
    issues.push(...this.checkDuplicateScopes(tokenColors))

    // 2. Check for undefined variables
    issues.push(...this.checkUndefinedVariables(sourceTokenColors, pool))

    // 3. Check for unused variables
    issues.push(...this.checkUnusedVariables(theme, pool))

    // 4. Check for precedence issues
    issues.push(...this.checkPrecedenceIssues(tokenColors))

    return issues
  }

  /**
   * Extracts source tokenColors data before compilation for variable analysis.
   * This includes data from the main theme file and all imported files.
   *
   * @param {Theme} theme - The compiled theme object
   * @returns {Promise<Array>} Array of source tokenColors entries
   */
  async getSourceTokenColors(theme) {
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
   * Reports lint issues to the user with appropriate formatting and colors.
   *
   * @param {Array} issues - Array of lint issues to report
   */
  reportIssues(issues) {
    if(issues.length === 0) {
      Term.info(ansiColors.success("✓ No linting issues found"))
      return
    }

    const errors = issues.filter(i => i.severity === "high")
    const warnings = issues.filter(i => i.severity === "medium")
    const infos = issues.filter(i => i.severity === "low")

    const allIssues = errors.concat(warnings, infos)
    allIssues.forEach(issue => this.reportSingleIssue(issue))

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
      case "high": return ansiColors.error("●")
      case "medium": return ansiColors.warning("●")
      case "low": return ansiColors.info("●")
      default: return ansiColors.info("●")
    }
  }

  /**
   * Reports a single lint issue with clean, minimal formatting.
   *
   * @param {object} issue - The issue to report
   */
  reportSingleIssue(issue) {
    const indicator = this.#getIndicator(issue.severity)
    const context = ansiColors.context

    switch(issue.type) {
      case "duplicate-scope": {
        const rules = issue.occurrences.map(occ => `'${occ.name}'`).join(", ")
        Term.info(`${indicator} Scope '${context(issue.scope)}' is duplicated in ${rules}`)
        break
      }

      case "undefined-variable": {
        Term.info(`${indicator} Variable '${context(issue.variable)}' is used but not defined in '${issue.rule}' (${issue.property} property)`)
        break
      }

      case "unused-variable": {
        Term.info(`${indicator} Variable '${context(issue.variable)}' is defined but never used`)
        break
      }

      case "precedence-issue": {
        if(issue.broadIndex === issue.specificIndex) {
          Term.info(`${indicator} Scope '${context(issue.broadScope)}' makes more specific '${context(issue.specificScope)}' redundant in '${issue.broadRule}'`)
        } else {
          Term.info(`${indicator} Scope '${context(issue.broadScope)}' in '${issue.broadRule}' masks more specific '${context(issue.specificScope)}' in '${issue.specificRule}'`)
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
  checkDuplicateScopes(tokenColors) {
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
   * Checks for undefined variables referenced in tokenColors.
   * Returns issues for variables that are used but not defined.
   *
   * @param {Array} tokenColors - Array of tokenColors entries
   * @param {ThemePool} pool - The theme's variable pool
   * @returns {Array} Array of undefined variable issues
   */
  checkUndefinedVariables(tokenColors, pool) {
    const issues = []
    const definedVars = pool ? new Set(pool.getTokens.keys()) : new Set()

    tokenColors.forEach((entry, index) => {
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
              property: key
            })
          }
        }
      }
    })

    return issues
  }

  /**
   * Checks for unused variables defined in vars section but not referenced in theme content.
   * Returns issues for variables that are defined in vars but never used.
   *
   * @param {Theme} theme - The compiled theme object
   * @param {ThemePool} pool - The theme's variable pool
   * @returns {Array} Array of unused variable issues
   */
  checkUnusedVariables(theme, pool) {
    const issues = []

    if(!pool || !theme.source)
      return issues

    // Get variables defined in the vars section only
    const definedVars = new Set()
    this.collectVarsDefinitions(theme.source.vars, definedVars)

    // Also check dependencies for vars definitions
    if(theme.dependencies) {
      for(const dependency of theme.dependencies) {
        try {
          const depData = theme.cache?.loadCachedDataSync?.(dependency)
          if(depData?.vars) {
            this.collectVarsDefinitions(depData.vars, definedVars)
          }
        } catch {
          // Ignore cache errors
        }
      }
    }

    const usedVars = new Set()

    // Find variable usage in colors, tokenColors, and semanticColors sections
    if(theme.source.colors) {
      this.findVariableUsage(theme.source.colors, usedVars)
    }

    if(theme.source.tokenColors) {
      this.findVariableUsage(theme.source.tokenColors, usedVars)
    }

    if(theme.source.semanticColors) {
      this.findVariableUsage(theme.source.semanticColors, usedVars)
    }

    // Also check dependencies for usage in these sections
    if(theme.dependencies) {
      for(const dependency of theme.dependencies) {
        try {
          const depData = theme.cache?.loadCachedDataSync?.(dependency)
          if(depData) {
            if(depData.colors)
              this.findVariableUsage(depData.colors, usedVars)

            if(depData.tokenColors)
              this.findVariableUsage(depData.tokenColors, usedVars)

            if(depData.semanticColors)
              this.findVariableUsage(depData.semanticColors, usedVars)
          }
        } catch {
          // Ignore cache errors
        }
      }
    }

    // Find vars-defined variables that are never used in content sections
    for(const varName of definedVars) {
      if(!usedVars.has(varName)) {
        issues.push({
          type: "unused-variable",
          severity: "low",
          variable: `$${varName}`
        })
      }
    }

    return issues
  }

  /**
   * Recursively collects variable names defined in the vars section.
   * Adds found variable names to the definedVars set.
   *
   * @param {any} vars - The vars data structure to search
   * @param {Set} definedVars - Set to add found variable names to
   * @param {string} prefix - Current prefix for nested vars
   */
  collectVarsDefinitions(vars, definedVars, prefix = "") {
    if(!vars || typeof vars !== "object")
      return

    for(const [key, value] of Object.entries(vars)) {
      const varName = prefix ? `${prefix}.${key}` : key
      definedVars.add(varName)

      // If the value is an object, recurse for nested definitions
      if(value && typeof value === "object" && !Array.isArray(value)) {
        this.collectVarsDefinitions(value, definedVars, varName)
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
  findVariableUsage(data, usedVars) {
    if(typeof data === "string") {
      if(Evaluator.sub.test(data)) {
        const {none, parens, braces} = Evaluator.sub.exec(data)?.groups ?? {}
        const varName = none || parens || braces
        if(varName) {
          usedVars.add(varName)
        }
      }
    } else if(Array.isArray(data)) {
      data.forEach(item => this.findVariableUsage(item, usedVars))
    } else if(data && typeof data === "object") {
      Object.values(data).forEach(value => this.findVariableUsage(value, usedVars))
    }
  }

  /**
   * Checks for precedence issues where broad scopes override specific ones.
   * Returns issues for cases where a general scope appears after a more specific one.
   *
   * @param {Array} tokenColors - Array of tokenColors entries
   * @returns {Array} Array of precedence issue warnings
   */
  checkPrecedenceIssues(tokenColors) {
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
        if(this.isBroaderScope(current.scope, later.scope)) {
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
  isBroaderScope(broadScope, specificScope) {
    // Simple heuristic: if the specific scope starts with the broad scope + "."
    // then the broad scope is indeed broader
    // e.g., "keyword" is broader than "keyword.control", "keyword.control.import"
    return specificScope.startsWith(broadScope + ".")
  }
}
