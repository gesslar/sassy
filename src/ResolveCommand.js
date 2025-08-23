import AuntyCommand from "./components/AuntyCommand.js"
import AuntyError from "./components/AuntyError.js"
import * as DataUtil from "./components/DataUtil.js"
import Evaluator from "./components/Evaluator.js"
import Colour from "./components/Colour.js"
import Util from "./Util.js"
import Theme from "./components/Theme.js"
import Term from "./components/Term.js"

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
    ansiColors.alias("hex", ansiColors.cyan)
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
    const optionName = Object.keys(options)
      .find(o => this.cliOptionNames.includes(o))

    if(!optionName) {
      throw AuntyError.new(
        `No valid option provided. Please specify one of: ${this.cliOptionNames.join(", ")}.`
      )
    }

    const resolveFunctionName = `resolve${Util.capitalize(optionName)}`
    const optionValue = options[optionName]
    const resolverFunction = this[resolveFunctionName]

    if(!resolverFunction)
      throw AuntyError.new(`No such function ${resolveFunctionName}`)

    const fileObject = await this.resolveThemeFileName(inputArg, cwd)
    const theme = new Theme(fileObject, cwd, options)

    await theme.load()
    await theme.build({saveBreadcrumbs: true})

    await resolverFunction.call(this, theme, optionValue)
  }

  /**
   * Resolves a specific token to its final value and displays the resolution trail.
   * Shows the complete dependency chain for the requested token.
   *
   * @param {object} theme - The compiled theme object with breadcrumbs
   * @param {string} token - The token key to resolve
   * @returns {void}
   */
  async resolveToken(theme, token) {
    const breadcrumbs = theme.breadcrumbs

    if(!breadcrumbs.has(token))
      return Term.info(`'${token}' not found.`)

    const trail = breadcrumbs.get(token)
    const fullTrail = this.#getFullTrail(token, trail, breadcrumbs)
    const output = `\n${ansiColors.head(token)}:\n${this.#formatOutput(fullTrail)}`

    Term.info(output)
  }

  /**
   * Recursively builds the full resolution trail for a token.
   * Follows reference chains to build complete dependency tree.
   *
   * @param {string} token - The token being resolved
   * @param {Array} trail - Current resolution trail
   * @param {Map} breadcrumbs - Map of all token breadcrumbs
   * @returns {Array} Complete resolution trail with nested dependencies
   */
  #getFullTrail(token, trail, breadcrumbs) {
    return trail.reduce((acc, curr) => {
      const [_, reference] = curr.match(/\{\{(.*)\}\}/) || []

      if(!reference) {
        acc.push(curr)
      } else {
        if(breadcrumbs.has(reference)) {
          const fork = breadcrumbs.get(reference)
          const forked = this.#getFullTrail(reference, fork, breadcrumbs)

          forked.unshift(reference)
          acc.push(forked)
        } else {
          acc.push(curr)
        }
      }

      return acc
    }, [])
  }

  /**
   * Formats a resolution trail array into a tree-like visual output.
   * Creates indented tree structure showing dependency relationships.
   *
   * @param {Array} arr - The resolution trail array (may contain nested arrays)
   * @param {string} [prefix] - Current indentation prefix for tree formatting
   * @param {Array<string>} [seen] - The current values that have been identified
   * @returns {string} Formatted tree structure as string
   */
  #formatOutput(arr, prefix = "", seen=[]) {
    const resolutions = []

    arr.forEach((item, index) => {
      const lines = {
        last: ansiColors.line("└── "),
        join: ansiColors.line("├── "),
        none: "    ",
        vert: ansiColors.line("│   "),
      }
      const isLastItem = index === arr.length - 1
      const connector = ansiColors.line(lines[isLastItem ? "last" : "join"])

      if(Array.isArray(item)) {
        resolutions.push(this.#formatOutput(item.slice(1), `${prefix}${(lines[isLastItem ? "none" : "vert"])}`, seen))
      } else {
        if(seen.includes(item)) {
          resolutions.push(`${prefix}${connector}${this.#formatLeaf(item,seen)}`)
        } else {
          resolutions.push(`${prefix}${connector}${this.#formatLeaf(item,seen)}`)
          seen.push(item)
        }
      }
    }
    )

    return resolutions.join("\n")
  }

  /**
   * Formats a single leaf value for display in the theme resolution output,
   * applying color and style based on its type.
   *
   * @param {string} [leaf] - The value to format. Can be a token, function call, or color code.
   * @param {Array<string>} [seen] - List of values already encountered in the resolution trail (used to mark cycles).
   * @returns {string} The formatted and colorized representation of the leaf.
   *
   * If the leaf has already been seen, returns it styled as a cycle (dim/italic).
   * If the leaf matches a function pattern, formats as a function call with arguments.
   * If the leaf matches a long or short hex color pattern, formats as a color code (with optional alpha).
   * Otherwise, formats as a regular leaf value.
   *
   * Used internally by #formatOutput to render each node in the resolution
   * tree, ensuring clear visual distinction between tokens, functions,
   * colors, and cycles.
   */
  #formatLeaf(leaf="", seen=[]) {

    if(seen.includes(leaf)) {
      return `${ansiColors.seen(leaf)}${!ansiColors.enabled?"*":""}`
    } else if(Evaluator.func.test(leaf)) {
      const {func,args} = Evaluator.func.exec(leaf)?.groups || {}

      return  ansiColors.func(func) +
              ansiColors.parens("(") +
              ansiColors.leaf(args) +
              ansiColors.parens(")")
    } else if(Colour.longHex.test(leaf)) {
      const {colour,alpha} = Colour.longHex.exec(leaf)?.groups || {}

      return `${ansiColors.hex(colour)}${alpha?ansiColors.hex(alpha):""}`
    } else if(Colour.shortHex.test(leaf)) {
      const {colour,alpha} = Colour.shortHex.exec(leaf)?.groups || {}

      return `${ansiColors.hex(colour)}${alpha?ansiColors.hex(alpha):""}`
    } else {
      return `${ansiColors.leaf(leaf)}`
    }
  }
}
