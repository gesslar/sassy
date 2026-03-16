/**
 * @file Resolve.js
 *
 * Engine class for theme token resolution and introspection.
 * Returns structured data about variable dependencies and resolution trails.
 * No CLI awareness — takes a compiled Theme and returns data.
 */

/**
 * @import {Theme} from "./Theme.js"
 */

import Evaluator from "./Evaluator.js"

/**
 * Engine class for resolving theme tokens and variables.
 * Returns structured resolution data with trails.
 * No CLI awareness — takes a compiled Theme and returns data.
 */
export default class Resolve {
  /**
   * Classify a raw value string as "expression" (function call) or "variable".
   *
   * @param {string} value - Raw token value
   * @returns {"expression"|"variable"} The classification
   */
  static #classifyValue(value) {
    return Evaluator.func.test(value) ? "expression" : "variable"
  }

  /**
   * Resolves a colour token to its final value with trail.
   *
   * Automatically loads and builds the theme if not already compiled.
   *
   * @param {Theme} theme - The theme object
   * @param {string} colorName - The colour key to resolve
   * @returns {Promise<object>} `{ found, name, resolution?, trail? }`
   */
  async color(theme, colorName) {
    if(!theme.isCompiled())
      await this.#prepare(theme)

    const pool = theme.getPool()

    if(!pool || !pool.has(colorName))
      return {found: false, name: colorName}

    const tokens = pool.getTokens()
    const token = tokens.get(colorName)
    const trail = token.getTrail()
    const fullTrail = this.#buildCompleteTrail(token, trail)
    const finalValue = token.getValue()

    return {
      found: true,
      name: colorName,
      resolution: finalValue,
      trail: fullTrail.map(({value, type, depth}) => ({value, type, depth}))
    }
  }

  /**
   * Resolves a tokenColors scope to its final value with trail.
   *
   * Automatically loads and builds the theme if not already compiled.
   *
   * @param {Theme} theme - The theme object
   * @param {string} scopeName - The scope to resolve
   * @returns {Promise<object>} Resolution data object
   */
  async tokenColor(theme, scopeName) {
    if(!theme.isCompiled())
      await this.#prepare(theme)

    const tokenColors = theme.getOutput()?.tokenColors || []
    const disambiguatedMatch = scopeName.match(/^(.+)\.(\d+)$/)

    if(disambiguatedMatch) {
      const [, baseScope, indexStr] = disambiguatedMatch
      const index = parseInt(indexStr) - 1
      const matches = this.#findScopeMatches(tokenColors, baseScope)

      if(index >= 0 && index < matches.length)
        return this.#resolveScopeMatchData(theme, matches[index], `${baseScope}.${indexStr}`)

      return {
        found: false,
        name: scopeName,
        message: `Available: ${baseScope}.1 through ${baseScope}.${matches.length}`
      }
    }

    const matches = this.#findScopeMatches(tokenColors, scopeName)

    if(matches.length === 0) {
      const precedenceMatch =
        this.#findBestPrecedenceMatch(tokenColors, scopeName)

      if(precedenceMatch)
        return this.#resolveScopeMatchData(
          theme, precedenceMatch.entry, scopeName,
          {scope: precedenceMatch.matchedScope, relation: "via"}
        )

      return {found: false, name: scopeName}
    }

    if(matches.length === 1) {
      const maskingScope =
        this.#findMaskingScope(tokenColors, matches[0], scopeName)

      if(maskingScope)
        return this.#resolveScopeMatchData(
          theme, maskingScope.entry, scopeName,
          {scope: maskingScope.matchedScope, relation: "masked by"}
        )

      return this.#resolveScopeMatchData(theme, matches[0], scopeName)
    }

    return {
      found: true,
      ambiguous: true,
      name: scopeName,
      matches: matches.map((match, index) => ({
        qualifier: `${scopeName}.${index + 1}`,
        entryName: match.name || `Entry ${index + 1}`
      }))
    }
  }

  /**
   * Resolves a semanticTokenColors scope to its final value with trail.
   *
   * Automatically loads and builds the theme if not already compiled.
   *
   * @param {Theme} theme - The theme object
   * @param {string} scopeName - The scope to resolve
   * @returns {Promise<object>} Resolution data object
   */
  async semanticTokenColor(theme, scopeName) {
    if(!theme.isCompiled())
      await this.#prepare(theme)

    const originalTokenColors = theme.getOutput()?.tokenColors
    const themeOutput = theme.getOutput()

    if(themeOutput?.semanticTokenColors) {
      themeOutput.tokenColors = Object.entries(
        themeOutput.semanticTokenColors
      ).map(([scope, value]) => ({
        scope,
        settings: typeof value === "string"
          ? {foreground: value}
          : value,
      }))
    }

    const data = await this.tokenColor(theme, scopeName)

    if(originalTokenColors && themeOutput)
      themeOutput.tokenColors = originalTokenColors

    return data
  }

  /**
   * Loads and builds the theme if not already prepared.
   *
   * @param {Theme} theme - The theme to prepare
   * @returns {Promise<void>}
   * @private
   */
  async #prepare(theme) {
    if(!theme.canBuild())
      await theme.load()

    if(!theme.isCompiled())
      await theme.build()
  }

  #findScopeMatches(tokenColors, targetScope) {
    return tokenColors.filter(entry => {
      if(!entry.scope)
        return false

      // Handle comma-separated scopes
      const scopes = entry.scope.split(",").map(s => s.trim())

      return scopes.includes(targetScope)
    })
  }

  /**
   * Finds the best precedence match for a target scope that has no exact match.
   * Uses TextMate scope hierarchy rules: a broader scope (fewer segments) that
   * is a prefix of the target scope will match. Returns the most specific
   * (longest) broader scope.
   *
   * @param {Array} tokenColors - Array of tokenColors entries
   * @param {string} targetScope - The scope to find a precedence match for
   * @returns {{entry: object, matchedScope: string}|null} The best match or null
   * @private
   */
  #findBestPrecedenceMatch(tokenColors, targetScope) {
    const targetSegments = targetScope.split(".")
    let bestMatch = null
    let bestLength = 0

    for(const entry of tokenColors) {
      if(!entry.scope)
        continue

      const scopes = entry.scope.split(",").map(s => s.trim())

      for(const scope of scopes) {
        const scopeSegments = scope.split(".")

        // Must be fewer segments (broader) and a prefix of the target
        if(scopeSegments.length >= targetSegments.length)
          continue

        const isPrefix = scopeSegments.every((seg, i) =>
          seg === targetSegments[i]
        )

        if(isPrefix && scopeSegments.length > bestLength) {
          bestLength = scopeSegments.length
          bestMatch = {entry, matchedScope: scope}
        }
      }
    }

    return bestMatch
  }

  /**
   * Finds a broader scope that appears earlier in the tokenColors array
   * and would mask the given exact match entry.
   *
   * @param {Array} tokenColors - Array of tokenColors entries
   * @param {object} exactMatch - The exact match entry
   * @param {string} targetScope - The scope being resolved
   * @returns {{entry: object, matchedScope: string}|null} The masking entry or null
   * @private
   */
  #findMaskingScope(tokenColors, exactMatch, targetScope) {
    const targetSegments = targetScope.split(".")
    const exactIndex = tokenColors.indexOf(exactMatch)
    let bestMatch = null
    let bestLength = 0

    for(let i = 0; i < exactIndex; i++) {
      const entry = tokenColors[i]

      if(!entry.scope)
        continue

      const scopes = entry.scope.split(",").map(s => s.trim())

      for(const scope of scopes) {
        const scopeSegments = scope.split(".")

        if(scopeSegments.length >= targetSegments.length)
          continue

        const isPrefix = scopeSegments.every((seg, idx) =>
          seg === targetSegments[idx]
        )

        if(isPrefix && scopeSegments.length > bestLength) {
          bestLength = scopeSegments.length
          bestMatch = {entry, matchedScope: scope}
        }
      }
    }

    return bestMatch
  }

  /**
   * Returns structured resolution data for a scope match.
   *
   * @param {object} theme - The compiled theme object with pool
   * @param {object} match - The matching tokenColor entry
   * @param {string} displayName - The scope name for display
   * @param {{scope: string, relation: string}|null} resolvedVia - Resolution indirection
   * @returns {object} Resolution data
   * @private
   */
  #resolveScopeMatchData(theme, match, displayName, resolvedVia = null) {
    const pool = theme.getPool()
    const settings = match.settings || {}
    const name = match.name || "Unnamed"
    const foreground = settings.foreground

    const base = {
      found: true,
      name: displayName,
      entryName: name,
      resolvedVia: resolvedVia ?? null
    }

    if(!foreground)
      return {...base, resolution: null, noForeground: true, trail: []}

    const tokens = pool ? pool.getTokens() : new Map()
    let bestToken = null

    for(const [tokenName, token] of tokens) {
      if(token.getValue() === foreground && tokenName.startsWith("scope.")) {
        bestToken = token
        break
      }
    }

    if(!bestToken) {
      for(const [tokenName, token] of tokens) {
        if(token.getValue() === foreground) {
          if(tokenName.includes(".") && !tokenName.includes("(") && !tokenName.includes("#")) {
            bestToken = token
            break
          } else if(!bestToken) {
            bestToken = token
          }
        }
      }
    }

    if(!bestToken || bestToken.getTrail().length === 0)
      return {...base, resolution: foreground, static: true, trail: []}

    const trail = bestToken.getTrail()
    const fullTrail = this.#buildCompleteTrail(bestToken, trail)
    const finalValue = bestToken.getValue()

    return {
      ...base,
      resolution: finalValue,
      static: false,
      trail: fullTrail.map(({value, type, depth}) => ({value, type, depth}))
    }
  }

  #buildCompleteTrail(rootToken, trail) {
    const steps = []
    const seen = new Set()

    // Add the root token's original expression
    const rootRaw = rootToken.getRawValue()

    if(rootRaw !== rootToken.getName()) {
      steps.push({
        value: rootRaw,
        type: Resolve.#classifyValue(rootRaw),
        level: 0
      })
    }

    // Build a flattened sequence showing the resolution process
    const processToken = (token, level) => {
      if(!token)
        return

      const id = `${token.getName()}-${token.getRawValue()}`

      if(seen.has(id))
        return

      seen.add(id)

      const rawValue = token.getRawValue()
      const finalValue = token.getValue()
      const dependency = token.getDependency()
      const kind = token.getKind()

      // functionResult is only set when the captured sub-expression was
      // embedded inside a larger call (resolved !== applied in Evaluator).
      // That makes it a reliable proxy for "this is an inner function" —
      // no string comparison needed.
      const funcResult = token.getFunctionResult?.()
      const isInnerFunction = kind === "function" && funcResult != null
      const funcLevel = isInnerFunction ? level + 1 : level

      // Add the current step
      if(!steps.some(s => s.value === rawValue)) {
        steps.push({
          value: rawValue,
          type: kind === "function" ? "function" : "variable",
          level: funcLevel
        })
      }

      // For variables, show what they resolve to
      if(dependency) {
        const depRaw = dependency.getRawValue()
        const depFinal = dependency.getValue()

        // Add dependency's expression if it differs from its name
        if(depRaw !== dependency.getName() &&
           !steps.some(s => s.value === depRaw)) {
          steps.push({
            value: depRaw,
            type: Resolve.#classifyValue(depRaw),
            level: level + 1
          })
        }

        // Process dependency's trail
        const depTrail = dependency.getTrail()

        if(depTrail && depTrail.length > 0) {
          depTrail.forEach(depToken => processToken(depToken, level + 1))
        }

        // Add resolved color if different
        if(depRaw !== depFinal && !steps.some(s => s.value === depFinal)) {
          steps.push({
            value: depFinal,
            type: "result",
            level: level + 1
          })
        }
      }

      // For function tokens embedded in a larger expression, show the
      // direct function output before showing the full substituted result

      if(funcResult && !steps.some(s => s.value === funcResult)) {
        steps.push({
          value: funcResult,
          type: "result",
          level: funcLevel
        })
      }

      // Add final result for this token; always at the outer (caller's) level
      // so the expression with the inner resolved returns to the same depth
      if(rawValue !== finalValue && !steps.some(s => s.value === finalValue)) {
        steps.push({
          value: finalValue,
          type: "result",
          level
        })
      }
    }

    trail.forEach(token => processToken(token, 0))

    // Normalize levels to reduce excessive nesting
    const levelMap = new Map()
    let normalizedLevel = 0

    steps.forEach(step => {
      if(!levelMap.has(step.level)) {
        levelMap.set(step.level, normalizedLevel++)
      }

      step.depth = levelMap.get(step.level)
    })

    return steps
  }
}
