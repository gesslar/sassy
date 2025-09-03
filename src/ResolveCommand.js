import AuntyCommand from "./components/AuntyCommand.js"
import AuntyError from "./components/AuntyError.js"
import * as DataUtil from "./components/DataUtil.js"
import Evaluator from "./components/Evaluator.js"
import Colour from "./components/Colour.js"
import Util from "./Util.js"
import Theme from "./components/Theme.js"
import Term from "./components/Term.js"
import ThemeToken from "./components/ThemeToken.js"

import ansiColors from "ansi-colors"
import colorSupport from "color-support"

ansiColors.enabled = colorSupport.hasBasic

/**
 * Command handler for resolving theme tokens and variables to their final values.
 * Provides introspection into the theme resolution process and variable dependencies.
 */
export default class ResolveCommand extends AuntyCommand {
  /**
   * Creates a new ResolveCommand instance.
   *
   * @param {object} base - Base configuration containing cwd and packageJson
   */
  constructor(base) {
    super(base)

    this.cliCommand = "resolve <file>"
    this.cliOptions = {
      "token": ["-t, --token <key>", "resolve a key to its final evaluated value"],
    }

    ansiColors.alias("head", ansiColors.yellowBright)
    ansiColors.alias("leaf", ansiColors.green)
    ansiColors.alias("seen", ansiColors.green.dim.italic)
    ansiColors.alias("func", ansiColors.green.bold)
    ansiColors.alias("parens", ansiColors.yellowBright.bold)
    ansiColors.alias("line", ansiColors.yellow)
    ansiColors.alias("hex", ansiColors.redBright)
    ansiColors.alias("hexAlpha", ansiColors.yellow.italic)
    ansiColors.alias("arrow", ansiColors.blueBright)
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
    const intersection =
      DataUtil.arrayIntersection(this.cliOptionNames, Object.keys(options))

    if(intersection.length > 1)
      throw AuntyError.new(
        `The options ${this.cliOptionNames.join(", ")} are ` +
        `mutually exclusive and may only have one expressed in the request.`
      )

    const {cwd} = this
    const optionName = Object.keys(options??{})
      .find(o => this.cliOptionNames.includes(o))

    if(!optionName) {
      throw AuntyError.new(
        `No valid option provided. Please specify one of: ${this.cliOptionNames.join(", ")}.`
      )
    }

    const resolveFunctionName = `resolve${Util.capitalize(optionName)}`
    const optionValue = options[optionName]
    const resolverFunction = this[resolveFunctionName]

    if(!(resolverFunction && typeof resolverFunction === "function"))
      throw AuntyError.new(`No such function ${resolveFunctionName}`)

    const fileObject = await this.resolveThemeFileName(inputArg, cwd)
    const theme = new Theme(fileObject, options)
    theme.cache = this.cache

    await theme.load()
    await theme.build()

    await resolverFunction.call(this, theme, optionValue)
  }

  /**
   * Resolves a specific token to its final value and displays the resolution trail.
   * Shows the complete dependency chain for the requested token.
   *
   * @param {object} theme - The compiled theme object with pool
   * @param {string} tokenName - The token key to resolve
   * @returns {void}
   */
  async resolveToken(theme, tokenName) {
    const pool = theme.pool
    if(!pool || !pool.has(tokenName))
      return Term.info(`'${tokenName}' not found.`)

    const tokens = pool.getTokens
    const token = tokens.get(tokenName)
    const trail = token.getTrail()
    const fullTrail = this.#buildCompleteTrail(token, trail)
    // Get the final resolved value
    const finalValue = token.getValue()
    const [formattedFinalValue] = this.#formatLeaf(finalValue)

    const output = `\n${ansiColors.head(tokenName)}:\n${this.#formatOutput(fullTrail)}\n\n${ansiColors.head("Resolution:")} ${formattedFinalValue}`

    Term.info(output)
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
        if(depRaw !== dependency.getName() && !steps.some(s => s.value === depRaw)) {
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
    const maxLevel = Math.max(...steps.map(s => s.level))
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
   * Formats a resolution trail Set into a tree-like visual output.
   * Creates indented tree structure showing dependency relationships.
   *
   * @param {Array<ThemeToken>} trail - The resolution trail from pool.getTrail()
   * @param steps
   * @returns {string} Formatted structure as string
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
        const arrow = ansiColors.arrow("→ ")
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
        `${ansiColors.hex(colour)}${alpha?ansiColors.hexAlpha(alpha):""}`,
        "hex"
      ]
    }

    if(this.#func.test(value)) {
      const {func,args} = this.#func.exec(value).groups
      return [
        `${ansiColors.func(func)}${ansiColors.parens("(")}${ansiColors.leaf(args)}${ansiColors.parens(")")}`,
        "function"
      ]
    }


    if(this.#sub.test(value)) {
      const {parens,none,braces} = Evaluator.sub.exec(value)?.groups || {}
      const style = (braces && ["{","}"]) || (parens && ["(",")"]) || (none && ["",""])
      const varValue = braces || parens || none || value
      return [
        `${ansiColors.func("$")}${ansiColors.parens(style[0])}${ansiColors.leaf(varValue)}${ansiColors.parens(style[1])}`,
        "variable"
      ]
    }

    return [ansiColors.leaf(value), "literal"]
  }
}
