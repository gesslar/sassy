/**
 * @file Variable and token evaluation engine for theme compilation.
 * Handles recursive resolution of variable references and colour function calls
 * within theme configuration objects.
 */

import Colour from "./Colour.js"
import AuntyError from "./AuntyError.js"
import * as _Data from "./DataUtil.js"
import ThemePool from "./ThemePool.js"
import ThemeToken from "./ThemeToken.js"
import Term from "./Term.js"


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
   * @private
   * @type {RegExp}
   */
  static sub = /(?<captured>\$\((?<parens>[^()]+)\)|\$(?<none>[\w]+(?:\.[\w]+)*)|\$\{(?<braces>[^()]+)\})/

  /**
   * Regular expression for matching colour / transformation function calls
   * within token strings, e.g. `darken($(std.accent), 10)`.
   *
   * @private
   * @type {RegExp}
   */
  static func = /(?<captured>(?<func>\w+)\((?<args>[^()]+)\))/

  #pool = new ThemePool()
  get pool() {
    return this.#pool
  }

  /**
   * Resolve variables and theme token entries in two distinct passes to ensure
   * deterministic scoping and to prevent partially-resolved values from
   * leaking between stages:
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
   *  - Both input arrays are mutated in-place (their `value` fields change).
   *  - Returned value is the (now resolved) theme entries array for chaining.
   *
   * @param {Array<{flatPath:string,value:any}>} decomposed - Variable entries to resolve.
   * @returns {Array<object>} The mutated & fully resolved theme entry array.
   */
  evaluate(decomposed) {
    this.#processScope(decomposed)

    return decomposed
  }

  /**
   * Iteratively resolves tokens within a single scope until either no
   * unresolved tokens remain or the iteration cap is reached.
   *
   * @private
   * @param {Array<object>} target - Objects whose `value` properties are processed.
   */
  #processScope(target) {
    let it = 0
    let innerit = 0

    do {
      target.forEach(item => {
        innerit++
        const trail = new Array()

        // Term.debug()
        // Term.debug("[item.flatPath]", item.flatPath)

        if(typeof item.value === "string") {
          const raw = item.value
          item.value = this.#evaluateValue(trail, item.flatPath, raw)
          // Keep lookup in sync with latest resolved value for chained deps.
          const token = this.#pool.findToken(item.flatPath)
          this.#pool.resolve(item.flatPath, item.value)
          this.#pool.rawResolve(raw, item.value)
          // Term.debug("[processScope]", "trail", [...trail.entries()].map(e => e[1].getName()))

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
      this.#hasUnresolvedTokens(target)
    )
  }

  /**
   * Resolve a variable or function token inside a string value; else return
   * the passed value.
   *
   * @private
   * @param parentTokenKeyString
   * @param trail
   * @param {string} value - Raw tokenised string.
   * @returns {string} Fully resolved string.
   */
  #evaluateValue(trail, parentTokenKeyString, value) {
    let it = 0

    for(;;) {
      // Term.debug("[evaluateValue]", it, parentTokenKeyString, value)
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
    }
  }

  #resolveLiteral(value) {
    const existing = this.#pool.findToken(value)

    return existing ??
     new ThemeToken(value)
       .setKind("literal")
       .setRawValue(value)
       .setValue(value)
  }

  #resolveHex(value) {
    const hex = Colour.normaliseHex(value)

    return new ThemeToken(value)
      .setKind("hex")
      .setRawValue(value)
      .setValue(hex)
  }

  #resolveVariable(value) {
    const {captured,none,parens,braces} = Evaluator.sub.exec(value).groups
    const work = none ?? parens ?? braces
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

  #resolveFunction(value) {
    const {captured,func,args} = Evaluator.func.exec(value).groups
    const split = args?.split(",").map(a => a.trim()) ?? []
    const applied = this.#applyTransform(func, split)

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
   * @returns {string} Hex (or transformed string) result.
   */
  #applyTransform(func, args) {
    const result = (() => {
      const def = `${func}(${args.join(", ")})`
      try {
        switch(func) {
          case "lighten":
            return Colour.lightenOrDarken(args[0], Number(args[1]))
          case "darken":
            return Colour.lightenOrDarken(args[0], -Number(args[1]))
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
          case "rgb": case "rgba":
          case "hsl": case "hsla":
          case "hsv": case "hsva":
            return Colour.toHex(func, args[3], ...args.slice(0, 3))
          default:
            return null
        }
      } catch(e) {
        const err = `Applying transform ${def}`
        throw e instanceof AuntyError
          ? e.addTrace(err)
          : AuntyError.from(e, err)
      }
    })()

    return result
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
   * @param {{value:any}} item - Entry to test.
   * @returns {boolean} True if token patterns present.
   */
  #tokenCheck(item) {
    if(typeof item.value !== "string")
      return false

    return Evaluator.sub.test(item.value) || Evaluator.func.test(item.value)
  }
}
