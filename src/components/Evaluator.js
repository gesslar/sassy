/**
 * @file Variable and token evaluation engine for theme compilation.
 * Handles recursive resolution of variable references and colour function calls
 * within theme configuration objects.
 */

import Colour from "./Colour.js"
import AuntyError from "./AuntyError.js"
import * as _Data from "./DataUtil.js"

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
  static func = /(?<func>\w+)\((?<args>[^()]+)\)/

  /**
   * Lookup cache mapping flat variable paths (e.g. "std.bg.panel.inner") to
   * their resolved string values. Populated incrementally via `createLookup()`.
   *
   * @private
   * @type {Map<string,string>}
   */
  #lookup = new Map()
  get lookup() {
    return this.#lookup
  }

  set lookup(lookup) {
    this.#lookup = lookup
  }

  /**
   * Clears the current lookup data and returns the previous lookup.
   *
   * @returns {Map} The previous lookup map
   */
  clearLookup() {
    const lookup = this.#lookup

    this.#lookup = new Map()

    return lookup
  }

  #breadcrumbs = new Map()
  get breadcrumbs() {
    return this.#breadcrumbs
  }

  set breadcrumbs(breadcrumbs) {
    this.#breadcrumbs = breadcrumbs
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
   * @param {Map} [lookup] - Variables to act as the lookup. If not provided, will be generated.
   * @returns {Array<object>} The mutated & fully resolved theme entry array.
   */
  evaluate(decomposed, lookup) {
    if(lookup)
      this.#lookup = lookup
    else
      this.#createLookup(decomposed)

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

    do {
      target.forEach(item => {
        if(typeof item.value === "string") {
          item.value = this.processToken(item.flatPath, item.value)
          // Keep lookup in sync with latest resolved value for chained deps.
          this.#lookup.set(item.flatPath, item.value)
        }
      })
    } while(++it < this.#maxIterations &&
            this.#hasUnresolvedTokens(target))
  }

  /**
   * Merge an array of entries into the path→value lookup cache. Last write wins.
   *
   * @param {Array<{flatPath:string,value:any}>} variables - Entries to index.
   */
  #createLookup(variables) {
    this.clearLookup()

    variables.forEach(item => {
      if(item.value != null)
        this.#lookup.set(item.flatPath, item.value)
    })
  }

  /**
   * Resolve a variable or function token inside a string value; else return
   * the passed value.
   *
   * @private
   * @param {string} token - The token being processed
   * @param {string} text - Raw tokenised string.
   * @returns {string} Fully resolved string.
   */
  processToken(token, text) {
    const _checker = () =>
      token === "editor.inactiveSelectionBackground" ||
      token === "editor.selectionBackground"
    while(true) {
      if(Evaluator.sub.test(text)) {
        const testResult = Evaluator.sub.exec(text)
        const {captured,none,parens,braces} = testResult
          ? testResult.groups
          : {}

        const lookupKey = none ?? parens ?? braces
        const lookupValue = this.#lookup.get(lookupKey)

        const resolved = lookupValue
          ? text.replace(captured, lookupValue)
          : text

        if(resolved !== text) {
          // Now let's see if we have a pre-existing breadcrumb resolution!
          if(lookupValue && lookupKey !== token) {
            // Woot! Okay, let's add a reference for later use when resolving
            this.#recordBreadcrumb(token, [text,`{{${lookupKey}}}`,resolved])
          } else {
            this.#recordBreadcrumb(token, [text, resolved])
          }

          text = resolved
        }
      } else if(Evaluator.func.test(text)) {
        const testResult = Evaluator.func.exec(text)
        const {func,args} = testResult
          ? testResult.groups
          : {}

        if(func && args) {
          const argList = args.split(",").map(a => a.trim()).filter(Boolean)
          const transformed = this.#applyTransform(func, argList)
          const resolved = text.replace(testResult.input, transformed)
          const existing = this.#breadcrumbs.get(text)

          if(!existing || existing.at(-1) !== resolved)
            this.#recordBreadcrumb(token, [text, resolved])

          text = resolved
        } else {
          return text
        }
      } else {
        return text
      }
    }
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
            return def
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

  #recordBreadcrumb(token, crumbs) {
    const _checker = () =>
      token === "editor.inactiveSelectionBackground" ||
      token === "editor.selectionBackground"
    const breadcrumbs = this.#breadcrumbs.get(token) ?? []
    const insert = breadcrumbs.at(-1) === crumbs.at(0)
      ? crumbs.slice(1)
      : crumbs

    if(!insert.length)
      return

    breadcrumbs.push(...insert)

    this.#breadcrumbs.set(token, breadcrumbs)
  }
}
