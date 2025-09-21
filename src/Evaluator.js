/**
 * @file Evaluator.js
 *
 * Defines the Evaluator class, responsible for variable and token resolution
 * during theme compilation.
 *
 * Handles recursive substitution of variable references and colour function
 * calls within theme configuration objects.
 *
 * Ensures deterministic scoping and supports extension for new colour
 * functions.
 */

import {parse} from "culori"

import Sass from "./Sass.js"
import Colour from "./Colour.js"
import ThemePool from "./ThemePool.js"
import ThemeToken from "./ThemeToken.js"

/**
 * Evaluator class for resolving variables and colour tokens in theme objects.
 * Handles recursive substitution of token references in arrays of objects
 * with support for colour manipulation functions.
 */
export default class Evaluator {
  /**
   * Maximum number of passes allowed while resolving tokens within a scope.
   * Prevents infinite recursion in the event of cyclical or self-referential
   * variable definitions.
   *
   * @private
   * @type {number}
   */
  #maxIterations = 10

  /**
   * Regular expression used to locate variable substitution tokens. Supports:
   *  - POSIX-ish:    $(variable.path)
   *  - Legacy:       $variable.path
   *  - Braced:       ${variable.path}
   *
   * Capturing groups allow extraction of the inner path variant irrespective
   * of wrapping style. The pattern captures (entireMatch, posix, legacy,
   * braced).
   *
   * @type {RegExp}
   */
  static sub = /(?<captured>\$\((?<parens>[^()]+)\)|\$(?<none>[\w]+(?:\.[\w]+)*)|\$\{(?<braces>[^()]+)\})/

  /**
   * Regular expression for matching colour / transformation function calls
   * within token strings, e.g. `darken($(std.accent), 10)`.
   *
   * @type {RegExp}
   */
  static func = /(?<captured>(?<func>\w+)\((?<args>[^()]+)\))/

  /**
   * Extracts a variable name from a string containing variable syntax.
   * Supports $(var), $var, and ${var} patterns.
   *
   * @param {string} [str] - String that may contain a variable reference
   * @returns {string|null} The variable name or null if none found
   */
  static extractVariableName(str="") {
    const {none, parens, braces} = Evaluator.sub.exec(str)?.groups ?? {}

    return none || parens || braces || null
  }

  /**
   * Extracts function name and arguments from a string containing function syntax.
   * Supports functionName(args) patterns.
   *
   * @param {string} [str] - String that may contain a function call
   * @returns {{func:string, args:string}|null} Object with {func, args} or null if none found
   */
  static extractFunctionCall(str="") {
    const match = Evaluator.func.exec(str)

    if(!match?.groups)
      return null

    const {func, args} = match.groups

    return {func, args}
  }

  #pool = new ThemePool()
  get pool() {
    return this.#pool
  }

  /**
   * Resolve variables and theme token entries in two distinct passes to ensure
   * deterministic scoping and to prevent partially-resolved values from
   * leaking between stages:
   *
   *  1. Variable pass: each variable is resolved only with access to the
   *     variable set itself (no theme values yet). This ensures variables are
   *     self-contained building blocks.
   *  2. Theme pass: theme entries are then resolved against the union of the
   *     fully-resolved variables plus (progressively) the theme entries. This
   *     allows theme keys to reference variables and other theme keys.
   *
   * Implementation details:
   *  - The internal lookup map persists for the lifetime of this instance; new
   *    entries overwrite prior values (last write wins) so previously resolved
   *    data can seed later evaluations without a rebuild.
   *  - Input array is mutated in-place (`value` fields change).
   *  - No return value. Evident by the absence of a return statement.
   *
   * @param {Array<{flatPath:string,value:unknown}>} decomposed - Variable entries to resolve.
   * @example
   * // Example decomposed input with variables and theme references
   * const evaluator = new Evaluator();
   * const decomposed = [
   *   { flatPath: 'vars.primary', value: '#3366cc' },
   *   { flatPath: 'theme.colors.background', value: '$(vars.primary)' },
   *   { flatPath: 'theme.colors.accent', value: 'lighten($(vars.primary), 20)' }
   * ];
   * evaluator.evaluate(decomposed);
   * // After evaluation, values are resolved:
   * // decomposed[1].value === '#3366cc'
   * // decomposed[2].value === '#5588dd' (lightened color)
   */
  evaluate(decomposed) {
    let it = 0

    do {
      decomposed.forEach(item => {
        const trail = new Array()

        if(typeof item.value === "string") {
          const raw = item.value

          item.value = this.#evaluateValue(trail, item.flatPath, raw)
          // Keep lookup in sync with latest resolved value for chained deps.
          const token = this.#pool.findToken(item.flatPath)

          this.#pool.resolve(item.flatPath, item.value)
          this.#pool.rawResolve(raw, item.value)

          if(token) {
            token.setValue(item.value).addTrail(trail)
          } else {
            const newToken = new ThemeToken(item.flatPath)
              .setRawValue(raw)
              .setValue(item.value)
              .setKind("input")
              .addTrail(trail)

            this.#pool.addToken(newToken)
          }
        }
      })
    } while(
      ++it < this.#maxIterations &&
      this.#hasUnresolvedTokens(decomposed)
    )

    if(it === this.#maxIterations) {
      const unresolved = decomposed
        .filter(this.#tokenCheck)
        .map(token => token.flatPath)

      throw Sass.new(
        "Luuuucyyyy! We tried to resolve your tokens, but there were just "+
        "too many! Suspect maybe some circular references are interfering "+
        "with your bliss. These are the ones that remain unresolved: " +
        unresolved.toString()
      )
    }
  }

  /**
   * Resolve a variable or function token inside a string value; else return
   * the passed value.
   *
   * @private
   * @param {Array<ThemeToken>} trail - Array to track resolution chain.
   * @param {string} parentTokenKeyString - Key string for parent token.
   * @param {string} value - Raw tokenised string to resolve.
   * @returns {string?} Fully resolved string.
   * @throws {Sass} If we've reached maximum iterations.
   */
  #evaluateValue(trail, parentTokenKeyString, value) {
    let it = 0

    do {
      let resolved

      if(Colour.isHex(value))
        resolved = this.#resolveHex(value)
      else if(Evaluator.sub.test(value))
        resolved = this.#resolveVariable(value)
      else if(Evaluator.func.test(value))
        resolved = this.#resolveFunction(value)
      else
        resolved = this.#resolveLiteral(value)

      if(!resolved || resolved.getValue() === value)
        return value

      // Otherwise keep processing the new value
      this.#pool.addToken(resolved).setParentTokenKey(parentTokenKeyString)
      trail.push(resolved)
      value = resolved.getValue()
    } while(++it < this.#maxIterations)

    if(it === this.#maxIterations) {
      throw Sass.new("HMMMMM! It looks like you might have some " +
        "circular resolution happening. We tried to fix it up, but this " +
        "doesn't seem to be working out. Trying to resolve: " +
        `${parentTokenKeyString}, we got as far as ${value}, before we ` +
        "called an end to this interminable game of Duck-Duck-Goose.")
    }

    return // it'll never reach here, but the linter got mad so i gave it a tit
  }

  /**
   * Resolve a literal value to a ThemeToken.
   *
   * @private
   * @param {string} value - The literal value.
   * @returns {ThemeToken} The resolved token.
   */
  #resolveLiteral(value) {
    const existing = this.#pool.findToken(value)

    if(existing)
      return existing

    const token = new ThemeToken(value)
      .setKind("literal")
      .setRawValue(value)
      .setValue(value)

    // Check if this is a color function (like oklch, rgb, hsl, etc.)
    const parsedColor = parse(value)

    if(parsedColor) {
      token.setParsedColor(parsedColor)
    }

    return token
  }

  /**
   * Resolve a hex colour value to a ThemeToken.
   *
   * @private
   * @param {string} value - The hex colour value.
   * @returns {ThemeToken} The resolved token.
   */
  #resolveHex(value) {
    const hex = Colour.normaliseHex(value)

    return new ThemeToken(value)
      .setKind("hex")
      .setRawValue(value)
      .setValue(hex)
  }

  /**
   * Resolve a variable token to its value.
   *
   * @private
   * @param {string} value - The variable token string.
   * @returns {ThemeToken|null} The resolved token or null.
   */
  #resolveVariable(value) {
    const {captured} = Evaluator.sub.exec(value).groups
    const work = Evaluator.extractVariableName(value)
    const existing = this.#pool.findToken(work)

    if(!existing)
      return null

    const resolved = value.replace(captured,existing.getValue())

    return new ThemeToken(value)
      .setKind("variable")
      .setRawValue(captured)
      .setValue(resolved)
      .setDependency(existing)
  }

  /**
   * Resolve a function token to its value.
   *
   * @private
   * @param {string} value - The function token string.
   * @returns {ThemeToken|null} The resolved token or null.
   */
  #resolveFunction(value) {
    const {captured} = Evaluator.func.exec(value).groups
    const result = Evaluator.extractFunctionCall(value)

    if(!result)
      return null

    const {func, args} = result
    const split = args?.split(",").map(a => a.trim()) ?? []

    // Look up source tokens for arguments to preserve color space
    const sourceTokens = split.map(arg => {
      return this.#pool.findToken(arg) ||
             this.#pool.getTokens()?.get?.(arg) ||
             null
    })

    const applied = this.#colourFunction(func, split, value, sourceTokens)

    if(!applied)
      return null

    const resolved = value.replace(captured, applied)

    return new ThemeToken(value)
      .setKind("function")
      .setRawValue(captured)
      .setValue(resolved)
  }

  /**
   * Execute a supported colour transformation helper.
   *
   * @private
   * @param {string} func - Function name (lighten|darken|fade|alpha|mix|...)
   * @param {Array<string>} args - Raw argument strings (numbers still as text).
   * @param {string} raw - The raw input from the source file.
   * @param {Array<ThemeToken>} sourceTokens - The tokens to apply to.
   * @returns {object} Object with result and colorSpace info.
   */
  #colourFunction(func, args, raw, sourceTokens = []) {
    return (() => {
      try {
        const sourceToken = sourceTokens[0]

        switch(func) {
          case "lighten":
            return sourceToken
              ? Colour.lightenOrDarkenWithToken(sourceToken, Number(args[1]))
              : Colour.lightenOrDarken(args[0], Number(args[1]))
          case "darken":
            return sourceToken
              ? Colour.lightenOrDarkenWithToken(sourceToken, -Number(args[1]))
              : Colour.lightenOrDarken(args[0], -Number(args[1]))
          case "fade":
            return Colour.addAlpha(args[0], -Number(args[1]))
          case "solidify":
            return Colour.addAlpha(args[0], Number(args[1]))
          case "alpha":
            return Colour.setAlpha(args[0], Number(args[1]))
          case "invert":
            return Colour.invert(args[0])
          case "mix":
            return Colour.mix(
              args[0],
              args[1],
              args[2] ? Number(args[2]) : undefined
            )
          case "css":
            return Colour.toHex(args.toString())
          default:
            return Colour.toHex(raw)
        }
      } catch(e) {
        throw Sass.new(`Performing colour function ${raw}`, e)
      }
    })()
  }

  /**
   * Determine whether further resolution passes are required for a scope.
   *
   * @private
   * @param {Array<object>} arr - Scope entries to inspect.
   * @returns {boolean} True if any unresolved tokens remain.
   */
  #hasUnresolvedTokens(arr) {
    return arr.some(item => this.#tokenCheck(item))
  }

  /**
   * Predicate: does this item's value still contain variable or function tokens?
   *
   * @private
   * @param {{value:unknown}} item - Entry to test.
   * @returns {boolean} True if token patterns present.
   */
  #tokenCheck(item) {
    if(typeof item.value !== "string")
      return false

    return Evaluator.sub.test(item.value) || Evaluator.func.test(item.value)
  }
}
