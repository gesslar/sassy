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

  static from(error, message) {
    if(!(error instanceof Error))
      throw new AuntyError("EvaluationError.from must take an error object.")

    const oldMessage = error.message
    const newError = new AuntyError(oldMessage)
    newError.trace = message

    return newError
  }
}
