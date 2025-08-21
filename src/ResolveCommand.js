import AuntyCommand from "./components/AuntyCommand.js"
import AuntyError from "./components/AuntyError.js"
import * as DataUtil from "./components/DataUtil.js"
import Util from "./Util.js"
import Theme from "./components/Theme.js"
import Term from "./components/Term.js"

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
  }

  /**
   * Executes the resolve command for a given theme file and option.
   * Validates mutual exclusivity of options and delegates to appropriate resolver.
   *
   * @param {string} inputArg - Path to the theme file to resolve
   * @param {object} options - Resolution options (token, etc.)
   * @returns {Promise<void>} Resolves when resolution is complete
   */
  async execute(inputArg, options) {
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
    const resolveFunctionName = `resolve${Util.capitalize(optionName)}`
    const optionValue = options[optionName]
    const resolverFunction = this[resolveFunctionName]

    if(!resolverFunction)
      throw AuntyError.new(`No such function ${resolveFunctionName}`)

    const fileObject = await this.resolveThemeFileName(inputArg, cwd)
    const theme = new Theme(fileObject, cwd, options)

    await theme.load()
    await theme.build({saveBreadcrumbs: true})

    resolverFunction.call(this, theme, optionValue)
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
    const fullTrail = this.#getFulltrail(token, trail, breadcrumbs)
    const output = `\n${token} resolves to:\n${this.#formatOutput(fullTrail)}`

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
  #getFulltrail(token, trail, breadcrumbs) {
    return trail.reduce((acc, curr) => {
      const [_, reference] = curr.match(/\{\{(.*)\}\}/) || []

      if(!reference) {
        acc.push(curr)
      } else {
        if(breadcrumbs.has(reference)) {
          const fork = breadcrumbs.get(reference)
          const forked = this.#getFulltrail(reference, fork, breadcrumbs)

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
   * @param {string} prefix - Current indentation prefix for tree formatting
   * @returns {string} Formatted tree structure as string
   */
  #formatOutput(arr, prefix = "") {
    let result = ""

    arr.forEach((item, index) => {
      const isLastItem = index === arr.length - 1
      const connector = isLastItem ? "└── " : "├── "

      if(Array.isArray(item)) {
        // result += prefix + connector + `[${index}]\n`
        result += this.#formatOutput(item, prefix + (isLastItem ? "    " : "│   "))
      } else {
        result += prefix + connector + item + "\n"
      }
    })

    return result
  }

}
