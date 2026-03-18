/**
 * @file ResolveCommand.js
 *
 * CLI adapter for the Resolve engine. Handles file resolution, option
 * validation, terminal formatting with colour swatches, and delegates
 * all data work to Resolve.
 */

import c from "@gesslar/colours"

import {Collection, Sass, Term, Util} from "@gesslar/toolkit"
import Colour from "./Colour.js"
import Command from "./Command.js"
import Evaluator from "./Evaluator.js"
import Resolve from "./Resolve.js"
import Theme from "./Theme.js"

// Re-export for backward compatibility
export {default as Resolve} from "./Resolve.js"

/**
 * Command handler for resolving theme tokens and variables to their final values.
 * CLI adapter that delegates data resolution to Resolve and handles terminal display.
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
    const optionName = Object.keys(options?? {})
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

    const theme = new Theme()
      .setCwd(cwd)
      .setThemeFile(fileObject)
      .setOptions(options)
      .setCache(this.getCache())

    await resolverFunction.call(this, theme, optionValue)
  }

  /**
   * Public method to resolve a theme token or variable and return structured
   * data for external consumption. Delegates to the Resolve engine.
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

    const resolver = new Resolve()
    const optionValue = options[optionName]

    if(optionName === "color")
      return await resolver.color(theme, optionValue)

    if(optionName === "tokenColor")
      return await resolver.tokenColor(theme, optionValue)

    if(optionName === "semanticTokenColor")
      return await resolver.semanticTokenColor(theme, optionValue)

    throw Sass.new(`No data resolver for option '${optionName}'`)
  }

  /**
   * Resolves a specific color to its final value and displays the resolution trail.
   *
   * @param {object} theme - The compiled theme object with pool
   * @param {string} colorName - The color key to resolve
   * @returns {void}
   */
  async resolveColor(theme, colorName) {
    const resolver = new Resolve()
    const data = await resolver.color(theme, colorName)

    if(!data.found)
      return Term.info(`'${colorName}' not found.`)

    const [formattedFinalValue] = this.#formatLeaf(data.resolution)
    const output = c`\n{head}${colorName}{/}:\n\n${this.#formatOutput(data.trail)}\n\n{head}${"Resolution:"}{/} ${formattedFinalValue}`

    Term.info(output)
  }

  /**
   * Resolves a specific tokenColors scope to its final value and displays the resolution trail.
   *
   * @param {object} theme - The compiled theme object with output
   * @param {string} scopeName - The scope to resolve
   * @returns {void}
   */
  async resolveTokenColor(theme, scopeName) {
    const resolver = new Resolve()

    this.#displayResolvedScope(
      await resolver.tokenColor(theme, scopeName)
    )
  }

  /**
   * Resolves a specific semanticTokenColors scope to its final value.
   *
   * @param {object} theme - The compiled theme object with output
   * @param {string} scopeName - The scope to resolve
   * @returns {void}
   */
  async resolveSemanticTokenColor(theme, scopeName) {
    const resolver = new Resolve()

    this.#displayResolvedScope(
      await resolver.semanticTokenColor(theme, scopeName)
    )
  }

  /**
   * Displays structured scope resolution data in the terminal.
   *
   * @param {object} data - Resolution data from a Resolve method
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
   * Formats a list of resolution steps into a visually indented tree structure for display.
   *
   * @param {Array} steps - List of resolution steps, each with {value, depth, type}.
   * @returns {string} Formatted, colorized, and indented output for terminal display.
   */
  #formatOutput(steps) {
    if(steps.length === 0)
      return ""

    const out = []

    steps.forEach(step => {
      const {value, depth, type} = step
      const [line, kind] = this.#formatLeaf(value)

      // Hex results (resolved or normalised) get extra indentation with swatch or arrow
      if((type === "resolved" || type === "normalised") && kind === "hex") {
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
