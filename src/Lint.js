/**
 * @file Lint.js
 *
 * Engine class for comprehensive theme file validation.
 * Analyses a compiled Theme and returns structured issue data.
 * No CLI awareness — takes a Theme and returns results.
 *
 * Identifies:
 *   - Duplicate scope definitions across tokenColor rules
 *   - Undefined variable references in theme content
 *   - Unused variables defined in vars but never referenced
 *   - Scope precedence issues where broad scopes mask specific ones
 *   - TextMate scope selector conflicts and redundancies
 */

import Evaluator from "./Evaluator.js"
import SemanticCoherenceRules from "./lint/SemanticCoherenceRules.js"
import SemanticSelectorRules from "./lint/SemanticSelectorRules.js"
import SemanticValueRules from "./lint/SemanticValueRules.js"
import TokenColorStructureRules from "./lint/TokenColorStructureRules.js"
import TokenColorValueRules from "./lint/TokenColorValueRules.js"
import {FileSystem} from "@gesslar/toolkit"

/**
 * @import {ThemePool} from "./ThemePool.js"
 * @import {Theme} from "./Theme.js"
 */

/**
 * Engine class for linting themes.
 * Analyses a compiled Theme and returns structured issue data.
 * No CLI awareness — takes a Theme and returns results.
 */
export default class Lint {
  // Theme section constants
  static SECTIONS = Object.freeze({
    VARS: "vars",
    COLORS: "colors",
    TOKEN_COLORS: "tokenColors",
    SEMANTIC_TOKEN_COLORS: "semanticTokenColors"
  })

  // Issue severity levels
  static SEVERITY = Object.freeze({
    HIGH: "high",
    MEDIUM: "medium",
    LOW: "low"
  })

  // Issue type constants
  static ISSUE_TYPES = Object.freeze({
    DUPLICATE_SCOPE: "duplicate-scope",
    // Canary: themes with undefined variables cannot compile, so this
    // condition is unreachable under normal operation. It exists as a
    // safety net to surface bugs in sassy's own resolution logic.
    UNDEFINED_VARIABLE: "undefined-variable",
    UNUSED_VARIABLE: "unused-variable",
    PRECEDENCE_ISSUE: "precedence-issue"
  })

  // Template strings for dynamic rule names
  static TEMPLATES = Object.freeze({
    ENTRY_NAME: index => `(unnamed rule #${index + 1})`,
    OBJECT_NAME: index => `Object ${index + 1}`,
    VARIABLE_PREFIX: "$"
  })

  /**
   * Lints a compiled theme and returns categorised results.
   *
   * Automatically loads and builds the theme if not already compiled.
   *
   * @param {Theme} theme - The theme object
   * @returns {Promise<object>} Object containing categorised lint results
   */
  async run(theme) {
    if(!theme.isCompiled()) {
      if(!theme.canBuild())
        await theme.load()

      await theme.build()
    }

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

    if(output?.semanticTokenColors)
      results[LC.SECTIONS.SEMANTIC_TOKEN_COLORS].push(
        ...SemanticSelectorRules.run(output.semanticTokenColors),
        ...SemanticValueRules.run(output.semanticTokenColors),
        ...SemanticCoherenceRules.run(output),
      )

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
        .push(...this.#lintSemanticTokenColors(
          semanticTokenColors, pool))
      results.variables
        .push(...await this.#lintVariables(theme, pool))
    }

    // Enrich all issues with source locations
    this.#enrichLocations(results, theme)

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
      ...TokenColorValueRules.run(tokenColors),
      ...TokenColorStructureRules.run(tokenColors),
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
   * Enriches all issues in the results with source locations
   * by mapping issue fields back to YAML AST positions.
   *
   * @param {object} results - The categorised lint results
   * @param {Theme} theme - The theme with YAML source data
   * @private
   */
  #enrichLocations(results, theme) {
    const find = (path, target) => theme.findSourceLocation(path, target)
    const output = theme.getOutput()
    const tokenColors = output?.tokenColors ?? []

    const allIssues = [
      ...results[LC.SECTIONS.TOKEN_COLORS],
      ...results[LC.SECTIONS.SEMANTIC_TOKEN_COLORS],
      ...results[LC.SECTIONS.COLORS],
      ...results.variables,
    ]

    for(const issue of allIssues) {
      // Skip if already has a location
      if(issue.location)
        continue

      const loc = this.#resolveIssueLocation(
        issue, find, tokenColors
      )

      if(loc)
        issue.location = loc
    }
  }

  /**
   * Resolves a source location for a single issue based on its
   * identifying fields.
   *
   * @param {object} issue - The lint issue
   * @param {Function} find - Location lookup function
   * @param {Array} tokenColors - Compiled tokenColors array
   * @returns {string|null} Formatted location or null
   * @private
   */
  #resolveIssueLocation(issue, find, tokenColors) {
    // Semantic issues — keyed by selector
    if(issue.selector) {
      const stcPath =
        `theme.semanticTokenColors.${issue.selector}`

      return find(stcPath)
    }

    // TokenColor issues — keyed by 1-based index
    if(issue.index !== undefined) {
      const tcPath =
        `theme.tokenColors.${issue.index - 1}`

      return find(tcPath)
    }

    // TokenColor issues from rule modules — keyed by rule name
    if(issue.rule) {
      // Match "(unnamed rule #N)" pattern to extract index directly
      const match = /^\(unnamed rule #(\d+)\)$/.exec(issue.rule)

      if(match) {
        const tcPath =
          `theme.tokenColors.${Number(match[1]) - 1}`

        return find(tcPath)
      }

      // Named rule — scan compiled tokenColors for matching name
      const idx = tokenColors
        .findIndex(tc => tc.name === issue.rule)

      if(idx !== -1) {
        const tcPath = `theme.tokenColors.${idx}`

        return find(tcPath)
      }
    }

    // Duplicate scope — resolve locations for all occurrences
    if(issue.occurrences?.length > 0) {
      for(const occ of issue.occurrences) {
        const loc = find(`theme.tokenColors.${occ.index - 1}`)

        if(loc)
          occ.location = loc
      }

      return issue.occurrences[0]?.location ?? null
    }

    // Precedence — resolve locations for both participants
    if(issue.broadIndex !== undefined) {
      issue.broadLocation = find(
        `theme.tokenColors.${issue.broadIndex - 1}`
      ) ?? null

      if(issue.specificIndex !== undefined) {
        issue.specificLocation = find(
          `theme.tokenColors.${issue.specificIndex - 1}`
        ) ?? null
      }

      return issue.broadLocation
    }

    // Coherence — missing semanticHighlighting
    if(issue.type ===
      SemanticCoherenceRules
        .ISSUE_TYPES.MISSING_SEMANTIC_HIGHLIGHTING) {
      return find("config.custom.semanticHighlighting")
        ?? find("config.custom")
        ?? find("config")
    }

    return null
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
        return [dep.getSourceFile(), source.get(section), dep.getYamlSource()]

      return false
    }).filter(Boolean)
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
        const rules = occurrences
          .map(occ => `'${occ.name}'`)
          .join(", ")

        issues.push({
          type: LC.ISSUE_TYPES.DUPLICATE_SCOPE,
          severity: LC.SEVERITY.MEDIUM,
          message: `Scope '${scope}' is duplicated in ${rules}`,
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
              const rule = entry.name || LC.TEMPLATES.ENTRY_NAME(index)

              issues.push({
                type: LC.ISSUE_TYPES.UNDEFINED_VARIABLE,
                severity: LC.SEVERITY.HIGH,
                message: `Variable '${value}' is used but not defined in '${rule}' (${key} property)`,
                variable: value,
                rule,
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
            message: `Variable '${value}' is used but not defined in '${ruleName}' (${currentPath} property)`,
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
    const cwd = theme.getCwd()

    const usedVars = new Set()

    for(const dependency of theme.getDependencies()) {
      try {
        const depData = dependency.getSource()
        const depFile = dependency.getSourceFile()
        const yamlSource = dependency.getYamlSource()

        // Collect vars definitions
        const vars = depData?.get("vars")

        if(vars) {
          const relativeDependencyPath = cwd
            ? FileSystem.relativeOrAbsolutePath(cwd.path, depFile.path)
            : depFile.path

          this.#collectVarsDefinitions(
            vars,
            definedVars,
            "",
            relativeDependencyPath,
            yamlSource
          )
        }

        // Find variable usage in all sections, including vars
        // (vars cross-reference each other across files)
        this.#findVariableUsage(depData
          ?.get(LC.SECTIONS.VARS), usedVars)
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
    for(const [varName, {filename, location}] of definedVars) {
      if(!usedVars.has(varName)) {
        const variable = `${LC.TEMPLATES.VARIABLE_PREFIX}${varName}`

        issues.push({
          type: LC.ISSUE_TYPES.UNUSED_VARIABLE,
          severity: LC.SEVERITY.LOW,
          message: `Variable '${variable}' is defined in '${filename}' but is never used`,
          variable,
          occurrence: filename,
          location,
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
  #collectVarsDefinitions(vars, definedVars, prefix = "", filename = "", yamlSource = null) {
    for(const [key, value] of Object.entries(vars ?? {})) {
      const varName = prefix ? `${prefix}.${key}` : key

      if(Array.isArray(value)) {
        // Array container — recurse into elements with 1-based indexing
        // to match Compiler.#decomposeObject behaviour
        value.forEach((element, index) => {
          const indexedName = `${varName}.${index + 1}`

          if(element !== null && typeof element === "object" && !Array.isArray(element)) {
            this.#collectVarsDefinitions(
              element, definedVars, indexedName,
              filename, yamlSource
            )
          } else {
            const location = yamlSource?.formatLocation(`vars.${varName}.${index}`) ?? null

            definedVars.set(indexedName, {filename, location})
          }
        })
      } else if(value !== null && typeof value === "object") {
        // Object container — recurse but don't register as a variable
        this.#collectVarsDefinitions(
          value, definedVars, varName,
          filename, yamlSource
        )
      } else {
        // Leaf scalar value (string, number, etc.) — actual variable definition
        const location = yamlSource?.formatLocation(`vars.${varName}`) ?? null

        definedVars.set(varName, {filename, location})
      }
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
          const sameRule = current.index === later.index
          const message = sameRule
            ? `Scope '${current.scope}' makes more specific '${later.scope}' redundant in '${current.name}'`
            : `Scope '${current.scope}' in '${current.name}' masks more specific '${later.scope}' in '${later.name}'`

          issues.push({
            type: LC.ISSUE_TYPES.PRECEDENCE_ISSUE,
            severity: sameRule ? LOW : HIGH,
            message,
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
const LC = Lint
