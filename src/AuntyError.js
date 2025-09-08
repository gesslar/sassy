/**
 * @file AuntyError.js
 *
 * Defines the AuntyError class, a custom error type for theme compilation
 * errors.
 *
 * Supports error chaining, trace management, and formatted reporting for both
 * user-friendly and verbose (nerd) output.
 *
 * Used throughout the theme engine for structured error handling and
 * debugging.
 */

import Term from "./Term.js"

/**
 * Custom error class for Aunty Rose theme compilation errors.
 * Provides error chaining, trace management, and formatted error reporting.
 */
export default class AuntyError extends Error {
  #trace = []

  /**
   * Creates a new AuntyError instance.
   *
   * @param {string} message - The error message
   * @param {...any} arg - Additional arguments passed to parent Error constructor
   */
  constructor(message, ...arg) {
    super(message, ...arg)

    this.trace = message
  }

  /**
   * Gets the error trace array.
   *
   * @returns {Array<string>} Array of trace messages
   */
  get trace() {
    return this.#trace
  }

  /**
   * Adds a message to the beginning of the trace array.
   *
   * @param {string} message - The trace message to add
   */
  set trace(message) {
    this.#trace.unshift(message)
  }

  /**
   * Adds a trace message and returns this instance for chaining.
   *
   * @param {string} message - The trace message to add
   * @returns {this} This AuntyError instance for method chaining
   */
  addTrace(message) {
    if(typeof message !== "string")
      throw AuntyError.new(`AuntyError:addTrace expected string, got ${JSON.stringify(message)}`)

    this.trace = message

    return this
  }

  /**
   * Reports the error to the terminal with formatted output.
   * Optionally includes detailed stack trace information.
   *
   * @param {boolean} [nerdMode] - Whether to include detailed stack trace
   */
  report(nerdMode=false) {
    Term.error(
      `${Term.terminalBracket(["error", "Something Went Wrong"])}\n` +
      this.trace.join("\n")
    )

    if(nerdMode) {
      Term.error(
        "\n" +
        `${Term.terminalBracket(["error", "Nerd Vittles"])}\n` +
        this.#fullBodyMassage(this.stack)
      )

      this.cause?.stack && Term.error(
        "\n" +
        `${Term.terminalBracket(["error", "Rethrown From"])}\n` +
        this.#fullBodyMassage(this.cause?.stack)
      )
    }
  }

  /**
   * Formats the stack trace for display, removing the first line and
   * formatting each line with appropriate indentation.
   *
   * Note: Returns formatted stack trace or undefined if no stack available.
   *
   * @param {string} stack - The error stack to massage.
   * @returns {string|undefined} Formatted stack trace or undefined
   */
  #fullBodyMassage(stack) {
    // Remove the first line, it's already been reported

    stack = stack ?? ""

    const {rest} = stack.match(/^.*?\n(?<rest>[\s\S]+)$/m)?.groups ?? {}
    const lines = []

    if(rest) {
      lines.push(
        ...rest
          .split("\n")
          .map(line => {
            const at = line.match(/^\s{4}at\s(?<at>.*)$/)?.groups?.at ?? {}
            return at
              ? `* ${at}`
              : line
          })
      )
    }

    return lines.join("\n")
  }

  /**
   * Creates an AuntyError from an existing Error object with additional
   * trace message.
   *
   * @param {Error} error - The original error object
   * @param {string} message - Additional trace message to add
   * @returns {AuntyError} New AuntyError instance with trace from the original error
   * @throws {AuntyError} If the first parameter is not an Error instance
   */
  static from(error, message) {
    if(!(error instanceof Error))
      throw AuntyError.new("AuntyError.from must take an Error object.")

    const oldMessage = error.message
    const newError = new AuntyError(oldMessage, {cause: error}).addTrace(message)

    return newError
  }

  /**
   * Factory method to create or enhance AuntyError instances.
   * If error parameter is provided, enhances existing AuntyError or wraps
   * other errors. Otherwise creates a new AuntyError instance.
   *
   * @param {string} message - The error message
   * @param {Error|AuntyError} [error] - Optional existing error to wrap or enhance
   * @returns {AuntyError} New or enhanced AuntyError instance
   */
  static new(message, error) {
    if(error) {
      return error instanceof AuntyError
        ? error.addTrace(message)
        : AuntyError.from(error, message)
    } else {
      return new AuntyError(message)
    }
  }
}
