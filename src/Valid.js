import _assert from "node:assert/strict"

import Sass from "./Sass.js"
import Data from "./Data.js"

export default class Valid {
/**
 * Validates a value against a type
 *
 * @param {*} value - The value to validate
 * @param {string} type - The expected type in the form of "object",
 *                        "object[]", "object|object[]"
 * @param {object} [options] - Additional options for validation.
 */
  static validType(value, type, options) {
    Valid.assert(
      Data.isType(value, type, options),
      `Invalid type. Expected ${type}, got ${JSON.stringify(value)}`,
      1,
    )
  }

  /**
   * Asserts a condition
   *
   * @param {boolean} condition - The condition to assert
   * @param {string} message - The message to display if the condition is not
   *                           met
   * @param {number} [arg] - The argument to display if the condition is not
   *                         met (optional)
   */
  static assert(condition, message, arg = null) {
    _assert(
      Data.isType(condition, "boolean"),
      `Condition must be a boolean, got ${condition}`,
    )
    _assert(
      Data.isType(message, "string"),
      `Message must be a string, got ${message}`,
    )
    _assert(
      arg !== null || arg !== undefined && typeof arg === "number",
      `Arg must be a number, got ${arg}`,
    )

    if(!condition)
      throw Sass.new(`${message}${arg ? `: ${arg}` : ""}`)
  }

}
