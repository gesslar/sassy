import c from "@gesslar/colours"
// import colorSupport from "color-support"

import Command from "./Command.js"
import {Collection, Sass, Term, Util} from "@gesslar/toolkit"
import Colour from "./Colour.js"
import Evaluator from "./Evaluator.js"
import Theme from "./Theme.js"

// ansiColors.enabled = colorSupport.hasBasic

/**
 * Command handler for resolving theme tokens and variables to their final values.
 * Provides introspection into the theme resolution process and variable dependencies.
 */
export default class ResolveCommand extends Command {
  #extraOptions = null
  #bg = null

  /**
   * Creates a new ResolveCommand instance.
   *
   * @param {object} base - Base configuration containing cwd and packageJson
   */
  constructor(base) {
    super(base)

    this.setCliCommand("resolve <file>")
    this.setCliOptions({
      "color": ["-c, --color <key>", "resolve a color key to its final evaluated value"],
      "tokenColor": ["-t, --tokenColor <scope>", "resolve a tokenColors scope to its final evaluated value"],
      "semanticTokenColor": ["-s, --semanticTokenColor <scope>", "resolve a semanticTokenColors scope to its final evaluated value"],
    })
    this.#extraOptions = {
      "bg": ["--bg <hex>", "background colour for alpha swatch preview (e.g. 1a1a1a or '#1a1a1a')"],
    }
  }

  /**
   * Builds the CLI command, adding extra options that are not mutually exclusive.
   *
   * @param {object} program - The commander.js program instance
   * @returns {Promise<this>} Returns this instance for method chaining
   */
  async buildCli(program) {
    await super.buildCli(program)
    this.addCliOptions(this.#extraOptions, false)

    return this
  }

  /**
   * Executes the resolve command for a given theme file and option.
   * Validates mutual exclusivity of options and delegates to appropriate resolver.
   *
   * @param {string} inputArg - Path to the theme file to resolve
   * @param {object} options - Resolution options (token, etc.)
   * @returns {Promise<void>} Resolves when resolution is complete
   */
  async execute(inputArg, options={}) {
    const cliOptionNames = this.getCliOptionNames()
    const intersection =
      Collection.intersection(cliOptionNames, Object.keys(options))

    if(intersection.length > 1)
      throw Sass.new(
        `The options ${cliOptionNames.join(", ")} are ` +
        `mutually exclusive and may only have one expressed in the request.`
      )

    const cwd = this.getCwd()
    const optionName = Object.keys(options??{})
      .find(o => cliOptionNames.includes(o))

    if(!optionName) {
      throw Sass.new(
        `No valid option provided. Please specify one of ${cliOptionNames.join(", ")}.`
      )
    }

    if(options.bg) {
      const bg = options.bg.startsWith("#") ? options.bg : `#${options.bg}`

      if(!Colour.isHex(bg)) {
        throw Sass.new(`Invalid --bg colour: ${options.bg}`)
      }

      this.#bg = Colour.normaliseHex(bg)
    }

    const resolveFunctionName = `resolve${Util.capitalize(optionName)}`
    const optionValue = options[optionName]
    const resolverFunction = this[resolveFunctionName]

    if(!(resolverFunction && typeof resolverFunction === "function"))
      throw Sass.new(`No such function '${resolveFunctionName}'`)

    const fileObject = await this.resolveThemeFileName(inputArg, cwd)
    const theme = new Theme(fileObject, cwd, options)

    theme.setCache(this.getCache())

    await theme.load()
    await theme.build()

    await resolverFunction.call(this, theme, optionValue)
  }

  /**
   * Public method to resolve a theme token or variable and return structured
   * data for external consumption.
   *
   * @param {Theme} theme - The compiled theme object
   * @param {object} options - Resolution options (color, tokenColor, or semanticTokenColor)
   * @returns {Promise<object>} Object containing structured resolution data
   */
  async resolve(theme, options = {}) {
    const cliOptionNames = Object.keys(this.getCliOptions() ?? {})
    const intersection =
      Collection.intersection(cliOptionNames, Object.keys(options))

    if(intersection.length > 1)
      throw Sass.new(
        `The options ${cliOptionNames.join(", ")} are ` +
        `mutually exclusive and may only have one expressed in the request.`
      )

    const optionName = Object.keys(options ?? {})
      .find(o => cliOptionNames.includes(o))

    if(!optionName)
      throw Sass.new(
        `No valid option provided. Please specify one of ${cliOptionNames.join(", ")}.`
      )

    const optionValue = options[optionName]

    if(optionName === "color")
      return this.#resolveColorData(theme, optionValue)

    if(optionName === "tokenColor")
      return this.#resolveTokenColorData(theme, optionValue)

    if(optionName === "semanticTokenColor")
      return this.#resolveSemanticTokenColorData(theme, optionValue)

    throw Sass.new(`No data resolver for option '${optionName}'`)
  }

  /**
   * Resolves a specific color to its final value and displays the resolution trail.
   * Shows the complete dependency chain for the requested color.
   *
   * @param {object} theme - The compiled theme object with pool
   * @param {string} colorName - The color key to resolve
   * @returns {void}
   * @example
   * // Resolve a color variable from a compiled theme
   * await resolveCommand.resolveColor(theme, 'colors.primary');
   * // Output:
   * // colors.primary:
   * //   $(vars.accent)
   * //     → #3366cc
   * // Resolution: #3366cc
   */
  async resolveColor(theme, colorName) {
    const data = this.#resolveColorData(theme, colorName)

    if(!data.found)
      return Term.info(`'${colorName}' not found.`)

    const [formattedFinalValue] = this.#formatLeaf(data.resolution)
    const output = c`\n{head}${colorName}{/}:\n\n${this.#formatOutput(data.trail)}\n\n{head}${"Resolution:"}{/} ${formattedFinalValue}`

    Term.info(output)
  }

  /**
   * Returns structured resolution data for a colour token.
   *
   * @param {object} theme - The compiled theme object with pool
   * @param {string} colorName - The colour key to resolve
   * @returns {object} `{ found, name, resolution?, trail? }`
   * @private
   */
  #resolveColorData(theme, colorName) {
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
   * Resolves a specific tokenColors scope to its final value and displays the resolution trail.
   * Shows all matching scopes with disambiguation when multiple matches are found.
   *
   * @param {object} theme - The compiled theme object with output
   * @param {string} scopeName - The scope to resolve (e.g., "entity.name.class" or "entity.name.class.1")
   * @returns {void}
   */
  async resolveTokenColor(theme, scopeName) {
    this.#displayResolvedScope(
      await this.#resolveTokenColorData(theme, scopeName)
    )
  }

  /**
   * Displays structured scope resolution data in the terminal.
   *
   * @param {object} data - Resolution data from a `#resolve*Data` method
   * @private
   */
  #displayResolvedScope(data) {
    if(!data.found) {
      if(data.message)
        return Term.info(`'${data.name}' not found. ${data.message}`)

      return Term.info(`No tokenColors entries found for scope '${data.name}'`)
    }

    if(data.ambiguous) {
      Term.info(`Multiple entries found for '${data.name}', please try again with the specific query:\n`)
      data.matches.forEach(({qualifier, entryName}) => {
        Term.info(`${entryName}: ${qualifier}`)
      })

      return
    }

    const {
      name: displayName, entryName, resolution,
      resolvedVia, noForeground, static: isStatic, trail,
    } = data

    if(noForeground)
      return Term.info(`${displayName} (${entryName})\n\n(no foreground property)`)

    if(isStatic)
      return Term.info(`${displayName} (${entryName})\n\n(resolved to static value: ${resolution})`)

    const [formattedFinalValue] = this.#formatLeaf(resolution)
    const header = resolvedVia
      ? c`{<BU}${displayName}{/} {<I}${resolvedVia.relation}{/} {<BU}${resolvedVia.scope}{/} {<I}in{/} {hex}${(`${entryName}`)}{/}\n`
      : c`{<BU}${displayName}{/} {<I}in{/} {hex}${(`${entryName}`)}{/}\n`

    const output = header +
                    `${this.#formatOutput(trail)}\n\n` +
                    c`{head}${"Resolution:"}{/} ${formattedFinalValue}`

    Term.info(output)
  }

  /**
   * Returns structured resolution data for a tokenColors scope.
   *
   * @param {object} theme - The compiled theme object with output
   * @param {string} scopeName - The scope to resolve
   * @returns {Promise<object>} Resolution data object
   * @private
   */
  async #resolveTokenColorData(theme, scopeName) {
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

  /**
   * Resolves a specific semanticTokenColors scope to its final value.
   * Uses the same logic as tokenColors since they have identical structure.
   *
   * @param {object} theme - The compiled theme object with output
   * @param {string} scopeName - The scope to resolve (e.g., "keyword" or "keyword.1")
   * @returns {void}
   */
  async resolveSemanticTokenColor(theme, scopeName) {
    this.#displayResolvedScope(
      await this.#resolveSemanticTokenColorData(theme, scopeName)
    )
  }

  /**
   * Returns structured resolution data for a semanticTokenColors scope.
   *
   * @param {object} theme - The compiled theme object with output
   * @param {string} scopeName - The scope to resolve
   * @returns {Promise<object>} Resolution data object
   * @private
   */
  async #resolveSemanticTokenColorData(theme, scopeName) {
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

    const data = await this.#resolveTokenColorData(theme, scopeName)

    if(originalTokenColors && themeOutput)
      themeOutput.tokenColors = originalTokenColors

    return data
  }

  #buildCompleteTrail(rootToken, trail) {
    const steps = []
    const seen = new Set()

    // Add the root token's original expression
    const rootRaw = rootToken.getRawValue()

    if(rootRaw !== rootToken.getName()) {
      steps.push({
        value: rootRaw,
        type: "expression",
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

        // Add dependency's expression if it's a function call
        if(depRaw !== dependency.getName() &&
           !steps.some(s => s.value === depRaw)) {
          steps.push({
            value: depRaw,
            type: "expression",
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
  /**
   * Formats a list of resolution steps into a visually indented tree structure for display.
   *
   * Each step represents a part of the theme token resolution process, including variables,
   * function calls, expressions, and final results. The output is colorized and indented
   * according to the step's depth and type, making the dependency chain and resolution
   * process easy to follow in terminal output.
   *
   * - Hex color results are indented one extra level and prefixed with an arrow for emphasis.
   * - Other steps (variables, functions, literals) are indented according to their depth.
   *
   * @param {Array} steps - List of resolution steps, each with {value, depth, type}.
   *   - value: The string value to display (token, expression, result, etc.)
   *   - depth: Indentation level for the step
   *   - type: The kind of step ("result", "variable", "function", "expression", etc.)
   * @returns {string} Formatted, colorized, and indented output for terminal display.
   */
  #formatOutput(steps) {
    if(steps.length === 0)
      return ""

    const out = []

    steps.forEach(step => {
      const {value, depth, type} = step
      const [line, kind] = this.#formatLeaf(value)

      // Simple logic: only hex results get extra indentation with arrow/swatch, everything else is clean
      if(type === "result" && kind === "hex") {
        // Hex results are indented one extra level with swatch or arrow
        const prefix = "   ".repeat(depth + 1)
        const indicator = this.#makeIndicator(value, this.#bg)

        out.push(`${prefix}${indicator} ${line}`)
      } else {
        // Everything else just gets clean indentation
        const prefix = "   ".repeat(depth)

        out.push(`${prefix}${line}`)
      }
    })

    return out.join("\n")
  }

  #func = /^(?<func>\w+)(?<open>\()(?<args>.*)(?<close>\)$)$/
  #sub = Evaluator.sub
  #hex = value => Colour.isHex(value)

  /**
   * Creates a truecolor swatch glyph from a hex value.
   *
   * @private
   * @param {string} hex - A 6- or 8-digit hex colour.
   * @returns {string} A truecolor `■` character.
   */
  #swatch(hex) {
    const solid = Colour.parseHexColour(hex).colour
    const r = parseInt(solid.slice(1, 3), 16)
    const g = parseInt(solid.slice(3, 5), 16)
    const b = parseInt(solid.slice(5, 7), 16)

    return `\x1b[38;2;${r};${g};${b}m■\x1b[0m`
  }

  /**
   * Creates a colour swatch or fallback arrow indicator for a hex value.
   * When the colour has alpha and no --bg is provided, shows two swatches
   * (against black and white). With --bg, shows a single swatch composited
   * against the specified background.
   *
   * @private
   * @param {string} hex - The hex colour value.
   * @param {string|null} bg - Optional background hex for alpha compositing.
   * @returns {string} Swatch indicator(s) or styled arrow.
   */
  #makeIndicator(hex, bg = null) {
    if(!Term.hasColor) {
      return c`{arrow}→{/}`
    }

    const parsed = Colour.parseHexColour(hex)
    const hasAlpha = !!parsed.alpha

    if(!hasAlpha) {
      return this.#swatch(hex)
    }

    const alphaPercent = Math.round(parsed.alpha.decimal * 100)

    if(bg) {
      const composited = Colour.mix(parsed.colour, bg, alphaPercent)

      return this.#swatch(composited)
    }

    const onBlack = Colour.mix(parsed.colour, "#000000", alphaPercent)
    const onWhite = Colour.mix(parsed.colour, "#ffffff", alphaPercent)

    return `${this.#swatch(onBlack)}${this.#swatch(onWhite)}`
  }

  /**
   * Formats a single ThemeToken for display in the theme resolution output,
   * applying colour and style based on its type.
   *
   * @param {string} value - The man, the mystrery, the value.
   * @returns {string} The formatted and colourised representation of the token.
   *
   * Uses the token's kind property to determine formatting instead of regex matching.
   * Provides clear visual distinction between tokens, functions, colours, and variables.
   */
  #formatLeaf(value) {
    if(this.#hex(value)) {
      const {colour,alpha} = Colour.longHex.test(value)
        ? Colour.longHex.exec(value).groups
        : Colour.shortHex.exec(value).groups

      return [
        c`{hash}#{/}{hex}${colour.slice(1)}{/}${alpha?`{hexAlpha}${alpha}{/}`:""}`,
        "hex"
      ]
    }

    if(this.#func.test(value)) {
      const match = this.#func.exec(value)

      if(!match?.groups)
        return [c`{leaf}${value}{/}`, "literal"]

      const {func, args} = match.groups
      const cleanArgs = args.replace(
        /\$\(palette\.__prior__(?:\.__\d+__)?\.([^)]+)\)/g,
        (_, key) => `^(${key})`
      )

      return [
        c`{func}${func}{/}{parens}${"("}{/}{leaf}${cleanArgs}{/}{parens}${")"}{/}`,
        "function"
      ]
    }

    if(this.#sub.test(value)) {
      const varValue = Evaluator.extractVariableName(value) || value
      const priorMatch = varValue.match(/^palette\.__prior__(?:\.__\d+__)?\.(.+)$/)

      if(priorMatch) {
        return [
          c`{func}^{/}{parens}${"("}{/}{leaf}${priorMatch[1]}{/}{parens}${")"}{/}`,
          "séance"
        ]
      }

      const {parens,none,braces} = Evaluator.sub.exec(value)?.groups || {}
      const style = (braces && ["{","}"]) || (parens && ["(",")"]) || (none && ["",""])

      return [
        c`{func}{/}{parens}${style[0]}{/}{leaf}${varValue}{/}{parens}${style[1]}{/}`,
        "variable"
      ]
    }

    return [c`{leaf}${value}{/}`, "literal"]
  }
}
