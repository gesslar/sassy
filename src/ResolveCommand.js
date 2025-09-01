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
    const fullTrail = this.#getFullTrail(trail,pool)
    const output = `\n${ansiColors.head(tokenName)}:\n${this.#formatOutput(fullTrail)}`

    Term.info(output)
  }

  #getFullTrail(trail, pool) {
    if(trail.length === 0)
      return fullTrail

    const fullTrail = []

    // Start with the original token's raw value (the full expression)
    const originalToken = trail.at(-1)
    const parentTokenKey = originalToken.getParentTokenKey()

    if(parentTokenKey) {
      const parentToken = pool.getTokens.get(parentTokenKey)
      if(parentToken) {
        fullTrail.push(parentToken.getRawValue())
      }
    }

    // Process each step in the trail to recreate the entire trail with
    // all intermediate steps.
    trail.forEach(token => {
      const rawValue = token.getRawValue()
      const value = token.getValue()
      const kind = token.getKind()
      const dependency = token.getDependency()

      if(kind === "variable" && dependency) {
        fullTrail.push(rawValue)
        fullTrail.push(dependency.getValue())
      } else if(kind === "function") {
        fullTrail.push(rawValue)
        if(rawValue !== value) {
          fullTrail.push(value)
        }
      }
    })

    return fullTrail
  }
  /**
   * Formats a resolution trail Set into a tree-like visual output.
   * Creates indented tree structure showing dependency relationships.
   *
   * @param {Array<ThemeToken>} trail - The resolution trail from pool.getTrail()
   * @returns {string} Formatted structure as string
   */
  #formatOutput(trail) {
    if(trail.length === 0)
      return ""

    const spacers = {
      elbow: ansiColors.line("└── "),
      space: "    ",
    }

    const out = []
    const seen = []

    let indent = 0, last = null
    let lastIndent = indent

    trail.forEach((item, index) => {
      if(seen.includes(item))
        return

      let [line,kind] = this.#formatLeaf(item)
      const wasFunction = last === "function"
      const isHex = kind === "hex"

      if(wasFunction)
        indent++
      else if(isHex)
        indent++
      else
        indent = Math.max(0, indent - 1)

      const prefix = spacers.space.repeat(indent)
      const showElbow = index === 0 || indent > lastIndent
      const connector = showElbow ? spacers.elbow : spacers.space

      last = kind
      lastIndent = indent

      seen.push(item)
      out.push(`${prefix}${connector}${line}`)
    })

    return out.join("\n")
  }

  #func = /^(?<func>\w+)(?<open>\()(?<args>.*)(?<close>\)$)$/
  #sub = Evaluator.sub
  #hex = value => Colour.isHex(value)

  /**
   * Formats a single ThemeToken for display in the theme resolution output,
   * applying color and style based on its type.
   *
   * @param {string} value - The man, the mystrery, the value.
   * @returns {string} The formatted and colorized representation of the token.
   *
   * Uses the token's kind property to determine formatting instead of regex matching.
   * Provides clear visual distinction between tokens, functions, colors, and variables.
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
