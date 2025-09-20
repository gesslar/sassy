import c from "@gesslar/colours"
// import colorSupport from "color-support"

import Command from "./Command.js"
import Sass from "./Sass.js"
import Colour from "./Colour.js"
import Evaluator from "./Evaluator.js"
import Term from "./Term.js"
import Theme from "./Theme.js"
import Util from "./Util.js"
import Data from "./Data.js"

// ansiColors.enabled = colorSupport.hasBasic

/**
 * Command handler for resolving theme tokens and variables to their final values.
 * Provides introspection into the theme resolution process and variable dependencies.
 */
export default class ResolveCommand extends Command {
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
      Data.arrayIntersection(cliOptionNames, Object.keys(options))

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
        `No valid option provided. Please specify one of: ${cliOptionNames.join(", ")}.`
      )
    }

    const resolveFunctionName = `resolve${Util.capitalize(optionName)}`
    const optionValue = options[optionName]
    const resolverFunction = this[resolveFunctionName]

    if(!(resolverFunction && typeof resolverFunction === "function"))
      throw Sass.new(`No such function ${resolveFunctionName}`)

    const fileObject = await this.resolveThemeFileName(inputArg, cwd)
    const theme = new Theme(fileObject, cwd, options)

    theme.setCache(this.getCache())

    await theme.load()
    await theme.build()

    await resolverFunction.call(this, theme, optionValue)
  }

  /**
   * Resolves a specific color to its final value and displays the resolution trail.
   * Shows the complete dependency chain for the requested color.
   *
   * @param {object} theme - The compiled theme object with pool
   * @param {string} colorName - The color key to resolve
   * @returns {void}
   */
  async resolveColor(theme, colorName) {
    const pool = theme.getPool()

    if(!pool || !pool.has(colorName))
      return Term.info(`'${colorName}' not found.`)

    const tokens = pool.getTokens()
    const token = tokens.get(colorName)
    const trail = token.getTrail()
    const fullTrail = this.#buildCompleteTrail(token, trail)
    // Get the final resolved value
    const finalValue = token.getValue()
    const [formattedFinalValue] = this.#formatLeaf(finalValue)

    const output = c`\n{head}${colorName}{/}:\n\n${this.#formatOutput(fullTrail)}\n\n{head}${"Resolution:"}{/} ${formattedFinalValue}`

    Term.info(output)
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
    const tokenColors = theme.getOutput()?.tokenColors || []

    // Check if this is a disambiguated scope (ends with .1, .2, etc.)
    const disambiguatedMatch = scopeName.match(/^(.+)\.(\d+)$/)

    if(disambiguatedMatch) {
      const [, baseScope, indexStr] = disambiguatedMatch
      const index = parseInt(indexStr) - 1 // Convert to 0-based index

      const matches = this.#findScopeMatches(tokenColors, baseScope)

      if(index >= 0 && index < matches.length) {
        const match = matches[index]

        await this.#resolveScopeMatch(theme, match, `${baseScope}.${indexStr}`)

        return
      } else {
        return Term.info(`'${scopeName}' not found. Available: ${baseScope}.1 through ${baseScope}.${matches.length}`)
      }
    }

    // Find all matching scopes
    const matches = this.#findScopeMatches(tokenColors, scopeName)

    if(matches.length === 0) {
      return Term.info(`No tokenColors entries found for scope '${scopeName}'`)
    }

    if(matches.length === 1) {
      // Single match - resolve directly
      await this.#resolveScopeMatch(theme, matches[0], scopeName)
    } else {
      // Multiple matches - show disambiguation options
      Term.info(`Multiple entries found for '${scopeName}', please try again with the specific query:\n`)
      matches.forEach((match, index) => {
        const name = match.name || `Entry ${index + 1}`

        Term.info(`${name}: ${scopeName}.${index + 1}`)
      })
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

  async #resolveScopeMatch(theme, match, displayName) {
    const pool = theme.getPool()
    const settings = match.settings || {}
    const name = match.name || "Unnamed"

    // Look for the foreground property specifically
    const foreground = settings.foreground

    if(!foreground) {
      return Term.info(`${displayName} (${name})\n\n(no foreground property)`)
    }

    // First, try to find the token by looking for variables that resolve to this value
    // but prioritize source variable names over computed results
    const tokens = pool ? pool.getTokens() : new Map()
    let bestToken = null

    // First try to find a scope.* token that matches
    for(const [tokenName, token] of tokens) {
      if(token.getValue() === foreground && tokenName.startsWith("scope.")) {
        bestToken = token
        break
      }
    }

    // If no scope token found, look for other variable-like tokens
    if(!bestToken) {
      for(const [tokenName, token] of tokens) {
        if(token.getValue() === foreground) {
          // Prefer tokens that look like variable names (scope.*, colors.*, etc.)
          // over computed function results
          if(tokenName.includes(".") && !tokenName.includes("(") && !tokenName.includes("#")) {
            bestToken = token
            break
          } else if(!bestToken) {
            bestToken = token // fallback to any matching token
          }
        }
      }
    }

    if(!bestToken)
      return Term.info(
        `${displayName} (${name})\n\n(resolved to static value: ${foreground})`
      )

    const trail = bestToken.getTrail()
    const fullTrail = this.#buildCompleteTrail(bestToken, trail)
    const finalValue = bestToken.getValue()
    const [formattedFinalValue] = this.#formatLeaf(finalValue)
    const output = c`{head}${displayName}{/} {hex}${(`${name}`)}{/}\n`+
                    `${this.#formatOutput(fullTrail)}\n\n{head}`+
                    `${"Resolution:"}{/} ${formattedFinalValue}`

    Term.info(output)
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
    // semanticTokenColors has the same structure as tokenColors, so we can reuse the logic
    // but we need to look at the semanticTokenColors array instead
    const originalTokenColors = theme.getOutput()?.tokenColors

    // Temporarily replace tokenColors with semanticTokenColors for resolution
    const themeOutput = theme.getOutput()

    if(themeOutput?.semanticTokenColors) {
      themeOutput.tokenColors = themeOutput.semanticTokenColors
    }

    await this.resolveTokenColor(theme, scopeName)

    // Restore original tokenColors
    if(originalTokenColors && themeOutput) {
      themeOutput.tokenColors = originalTokenColors
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

      // Add the current step
      if(!steps.some(s => s.value === rawValue)) {
        steps.push({
          value: rawValue,
          type: kind === "function" ? "function" : "variable",
          level
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

      // Add final result for this token
      if(rawValue !== finalValue && !steps.some(s => s.value === finalValue)) {
        steps.push({
          value: finalValue,
          type: "result",
          level
        })
      }
    }

    trail.forEach(token => processToken(token, 1))

    // Normalize levels to reduce excessive nesting
    const levelMap = new Map()
    let normalizedLevel = 0

    steps.forEach(step => {
      if(!levelMap.has(step.level)) {
        levelMap.set(step.level, Math.min(normalizedLevel++, 4)) // Cap at depth 4
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

      // Simple logic: only hex results get extra indentation with arrow, everything else is clean
      if(type === "result" && kind === "hex") {
        // Hex results are indented one extra level with just spaces and arrow
        const prefix = "   ".repeat(depth + 1)
        const arrow = c`{arrow}→{/} `

        out.push(`${prefix}${arrow}${line}`)
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
      const {func,args} = this.#func.exec(value).groups

      return [
        c`{func}${func}{/}{parens}${"("}{/}{leaf}${args}{/}{parens}${")"}{/}`,
        "function"
      ]
    }

    if(this.#sub.test(value)) {
      const {parens,none,braces} = Evaluator.sub.exec(value)?.groups || {}
      const style = (braces && ["{","}"]) || (parens && ["(",")"]) || (none && ["",""])
      const varValue = braces || parens || none || value

      return [
        c`{func}{/}{parens}${style[0]}{/}{leaf}${varValue}{/}{parens}${style[1]}{/}`,
        "variable"
      ]
    }

    return [c`{leaf}${value}{/}`, "literal"]
  }
}
