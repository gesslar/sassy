import Term from "./Term.js"

export default class AuntyError extends Error {
  #trace = []

  constructor(message, ...arg) {
    super(message, ...arg)

    this.trace = message
  }

  get trace() {
    return this.#trace
  }

  set trace(message) {
    this.#trace.unshift(message)
  }

  addTrace(message) {
    this.trace = message

    return this
  }

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

  static from(error, message) {
    if(!(error instanceof Error))
      throw new AuntyError("AuntyError.from must take an error object.")

    const oldMessage = error.message
    const newError = new AuntyError(oldMessage)
    newError.trace = message

    return newError
  }
}
