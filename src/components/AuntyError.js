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
   * @returns {string[]} Array of trace messages
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
    this.trace = message

    return this
  }

  /**
   * Reports the error to the terminal with formatted output.
   * Optionally includes detailed stack trace information.
   *
   * @param {boolean} nerdMode - Whether to include detailed stack trace
   */
  report(nerdMode=false) {
    Term.error(
      "\n" +
      `${Term.terminalBracket(["error", "Something Went Wrong"])}\n` +
      this.trace.join("\n")
    )

    if(nerdMode) {
      Term.error(
        "\n" +
        `${Term.terminalBracket(["error", "Nerd Vittles"])}\n` +
        this.#fullBodyMassage()
      )
    }
  }

  /**
   * Formats the stack trace for display, removing the first line and formatting
   * each line with appropriate indentation.
   * Note: Returns formatted stack trace or undefined if no stack available.
   *
   * @returns {string|undefined} Formatted stack trace or undefined
   */
  #fullBodyMassage() {
    // Remove the first line, it's already been reported
    const {rest} = this.stack.match(/^.*?\n(?<rest>[\s\S]+)$/m)?.groups ?? {}

    if(rest) {
      return rest
        .split("\n")
        .map(line => {
          const [_, at] = line.match(/^\s{4}at\s(.*)$/) ?? []
          return at
            ? `* ${at}`
            : line
        })
        .join("\n")
    }
  }

  /**
   * Creates an AuntyError from an existing Error object with additional trace message.
   *
   * @param {Error} error - The original error object
   * @param {string} message - Additional trace message to add
   * @returns {AuntyError} New AuntyError instance with trace from the original error
   * @throws {AuntyError} If the first parameter is not an Error instance
   */
  static from(error, message) {
    if(!(error instanceof Error))
      throw new AuntyError("AuntyError.from must take an error object.")

    const oldMessage = error.message
    const newError = new AuntyError(oldMessage)
    newError.trace = message

    return newError
  }

  /**
   * Factory method to create or enhance AuntyError instances.
   * If error parameter is provided, enhances existing AuntyError or wraps other errors.
   * Otherwise creates a new AuntyError instance.
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
