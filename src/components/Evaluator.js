/**
 * @file Variable and token evaluation engine for theme compilation.
 * Handles recursive resolution of variable references and color function calls
 * within theme configuration objects.
 */

import Colour from "./Colour.js"

/**
 * Evaluator class for resolving variables and color tokens in theme objects.
 * Handles recursive substitution of token references in arrays of objects
 * with support for color manipulation functions.
 */
export default class Evaluator {
  /**
   * Maximum number of iterations for token resolution to prevent infinite loops.
   *
   * @type {number}
   */
  static maxIterations = 10

  /**
   * Regular expression for matching variable substitution tokens.
   * Matches patterns like $(variable.name)
   *
   * @type {RegExp}
   */
  static sub = /\$\(([^()]+)\)/g

  /**
   * Regular expression for matching function calls in token values.
   * Matches patterns like functionName(argument)
   *
   * @type {RegExp}
   */
  static func = /(\w+)\(([^()]+)\)/g

  /**
   * Main evaluation method that processes variables and theme objects.
   * Performs two-phase evaluation: variables first, then theme with full context.
   *
   * @param {object} params - The evaluation parameters
   * @param {Array<object>} params.vars - Array of variable objects to resolve
   * @param {Array<object>} params.theme - Array of theme objects to evaluate
   * @returns {Array<object>} The resolved theme objects
   */
  static evaluate({vars: against, theme: evaluating}) {
    // Phase 1: Resolve variables in their own scope
    Evaluator.processScope(
      against,
      Evaluator.createLookup(against)
    )

    // Phase 2: Resolve theme with access to both scopes
    Evaluator.processScope(
      evaluating,
      Evaluator.createLookup(
        [...against, ...evaluating]
      )
    )

    return evaluating
  }

  /**
   * Processes a scope of variables, resolving tokens iteratively.
   * Continues processing until all tokens are resolved or max iterations reached.
   *
   * @param {Array<object>} target - Array of objects with values to process
   * @param {object} variables - Lookup object for variable resolution
   */
  static processScope(target, variables) {
    let it = 0

    do {
      target.forEach(item => {
        if(typeof item.value === "string") {
          item.value = Evaluator.processTokens(item.value, variables)
        }
      })
    } while(++it < Evaluator.maxIterations &&
            Evaluator.hasUnresolvedTokens(target))
  }

  /**
   * Creates a lookup object from an array of variable objects.
   * Maps flat paths to their corresponding values for quick resolution.
   *
   * @param {Array<object>} variables - Array of variable objects with flatPath and value properties
   * @returns {object} Lookup object mapping paths to values
   */
  static createLookup(variables) {
    const result =
      variables.reduce((lookup, item) => {
        lookup[item.flatPath] = item.value
        return lookup
      }, {})

    return result
  }

  /**
   * Processes tokens in a text string, resolving variables and function calls.
   * Handles both variable substitution and color function application.
   *
   * @param {string} text - The text containing tokens to process
   * @param {object} variables - Lookup object for variable resolution
   * @returns {string} The text with tokens resolved
   */
  static processTokens(text, variables) {
    const next = text
      .replace(Evaluator.sub, (...arg) => {
        const [match,varName] = arg
        const result = variables[varName.trim()] || match

        return result
      })
      .replace(Evaluator.func, (_, func, args) => {
        const argList = args.split(",").map(s => s.trim())
        const result = Evaluator.applyTransform(func, argList)

        return result
      })

    return next === text ? text : Evaluator.processTokens(next, variables)
  }

  /**
   * Applies a color transformation function with the given arguments.
   * Supports various color manipulation functions like lighten, darken, mix, etc.
   *
   * @param {string} func - The function name to apply
   * @param {Array<string>} args - The function arguments
   * @returns {string} The result of the transformation
   */
  static applyTransform(func, args) {
    const result = (() => {
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
          return `+(${func}, ${args.join(", ")})`
      }
    })()

    return result
  }

  /**
   * Checks if any items in the array have unresolved tokens.
   * Used to determine if further processing iterations are needed.
   *
   * @param {Array<object>} arr - Array of objects to check for unresolved tokens
   * @returns {boolean} True if any unresolved tokens are found
   */
  static hasUnresolvedTokens(arr) {
    const tokenCheck = item =>
      typeof item?.value === "string" &&
      (item?.value?.match(Evaluator.sub) || item?.value?.match(Evaluator.func))

    return arr.some(item => tokenCheck(item))
  }
}
