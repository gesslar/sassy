import AuntyError from "./AuntyError.js"
import FileObject from "./FileObject.js"
import Term from "./Term.js"

/**
 * Base class for command-line interface commands.
 * Provides common functionality for CLI option handling and file resolution.
 */
export default class AuntyCommand {
  #cliCommand = null
  #cliOptions = null
  #optionNames = []
  #command
  #cwd
  #packageJson

  #cache

  /**
   * Creates a new AuntyCommand instance.
   *
   * @param {object} config - Configuration object
   * @param {object} config.cwd - Current working directory object
   * @param {object} config.packageJson - Package.json data
   */
  constructor({cwd,packageJson}) {
    this.#cwd = cwd
    this.#packageJson = packageJson
  }

  get cache() {
    return this.#cache
  }

  set cache(cache) {
    if(!this.#cache)
      this.#cache = cache
  }

  /**
   * Gets the current working directory object.
   *
   * @returns {object} The current working directory
   */
  get cwd() {
    return this.#cwd
  }

  /**
   * Gets the package.json data.
   *
   * @returns {object} The package.json object
   */
  get packageJson() {
    return this.#packageJson
  }

  /**
   * Gets the CLI command string.
   *
   * @returns {string|null} The CLI command string
   */
  get cliCommand() {
    return this.#cliCommand
  }

  /**
   * Sets the CLI command string.
   *
   * @param {string} data - The CLI command string
   */
  set cliCommand(data) {
    this.#cliCommand = data
  }

  /**
   * Gets the CLI options object.
   *
   * @returns {object|null} The CLI options configuration
   */
  get cliOptions() {
    return this.#cliOptions
  }

  /**
   * Sets the CLI options object.
   *
   * @param {object} data - The CLI options configuration
   */
  set cliOptions(data) {
    this.#cliOptions = data
  }

  /**
   * Gets the array of CLI option names.
   *
   * @returns {string[]} Array of option names
   */
  get cliOptionNames() {
    return this.#optionNames
  }

  /**
   * Builds the CLI command interface using the commander.js program instance.
   * Initializes the command with its options and action handler.
   *
   * @param {object} program - The commander.js program instance
   * @returns {Promise<this>} Returns this instance for method chaining
   */
  async buildCli(program) {
    if(!this.cliCommand)
      throw AuntyError.new("This command has no CLI command string.")

    if(!this.cliOptions)
      throw AuntyError.new("This command has no CLI options.")

    this.#command = program.command(this.cliCommand)
    this.#command.action(async(...arg) => this.execute(...arg))

    this.addCliOptions(this.cliOptions, true)

    return this
  }

  /**
   * Adds a single CLI option to the command.
   *
   * @param {string} name - The option name
   * @param {string[]} options - Array containing option flag and description
   * @param {boolean} preserve - Whether to preserve this option name in the list
   * @returns {this} Returns this instance for method chaining
   */
  addCliOption(name, options, preserve) {
    if(!this.#command)
      throw new Error("Unitialised AuntyCommand")

    this.#command.option(...options)

    if(preserve === true)
      this.#optionNames.push(name)

    return this
  }

  /**
   * Adds multiple CLI options to the command.
   *
   * @param {object} options - Object mapping option names to [flag, description] arrays
   * @param {boolean} preserve - Whether to preserve option names in the list
   * @returns {this} Returns this instance for method chaining
   */
  addCliOptions(options, preserve) {
    for(const [name, opts] of Object.entries(options))
      this.addCliOption(name, opts, preserve)

    return this
  }

  /**
   * Resolves a theme file name to a FileObject and validates its existence.
   *
   * @param {string} fileName - The theme file name or path
   * @param {object} cwd - The current working directory object
   * @returns {Promise<FileObject>} The resolved and validated FileObject
   * @throws {AuntyError} If the file does not exist
   */
  async resolveThemeFileName(fileName, cwd) {
    const fileObject = new FileObject(fileName, cwd)
    if(!await fileObject.exists)
      throw AuntyError.new(`No such file 🤷: ${fileObject.path}`)

    return fileObject
  }

  async asyncEmit(event, arg) {
    arg = arg || new Array()

    const listeners = this.emitter.listeners(event)
    await Promise.allSettled(listeners.map(listener => listener(...arg)))
  }
}
