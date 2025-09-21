import {Sass, FileObject, DirectoryObject, Cache} from "@gesslar/toolkit"

/**
 * Base class for command-line interface commands.
 * Provides common functionality for CLI option handling and file resolution.
 */
export default class Command {
  #cliCommand = null
  #cliOptions = null
  #optionNames = []
  #command
  #cwd
  #packageJson

  #cache

  /**
   * Creates a new Command instance.
   *
   * @param {object} config - Configuration object
   * @param {DirectoryObject} config.cwd - Current working directory object
   * @param {object} config.packageJson - Package.json data
   */
  constructor({cwd,packageJson}) {
    this.#cwd = cwd
    this.#packageJson = packageJson
  }

  /**
   * Gets the current working directory object.
   *
   * @returns {DirectoryObject} The current working directory
   */
  getCwd() {
    return this.#cwd
  }

  /**
   * Gets the package.json data.
   *
   * @returns {object} The package.json object
   */
  getPackageJson() {
    return this.#packageJson
  }

  /**
   * Sets the cache instance for the command.
   *
   * @param {Cache} cache - The cache instance to set
   * @returns {this} Returns this instance for method chaining
   */
  setCache(cache) {
    this.#cache = cache

    return this
  }

  /**
   * Gets the cache instance.
   *
   * @returns {Cache|null} The cache instance or null if not set
   */
  getCache() {
    return this.#cache
  }

  /**
   * Sets the CLI command string.
   *
   * @param {string} data - The CLI command string
   * @returns {this} Returns this instance for method chaining
   */
  setCliCommand(data) {
    this.#cliCommand = data

    return this
  }

  /**
   * Gets the CLI command string.
   *
   * @returns {string|null} The CLI command string
   */
  getCliCommand() {
    return this.#cliCommand
  }

  /**
   * Sets the CLI options object.
   *
   * @param {object} data - The CLI options configuration
   * @returns {this} Returns this instance for method chaining
   */
  setCliOptions(data) {
    this.#cliOptions = data

    return this
  }

  /**
   * Gets the CLI options object.
   *
   * @returns {object|null} The CLI options configuration
   */
  getCliOptions() {
    return this.#cliOptions
  }

  /**
   * Gets the array of CLI option names.
   *
   * @returns {string[]} Array of option names
   */
  getCliOptionNames() {
    return this.#optionNames
  }

  /**
   * Checks if the command has a cache instance.
   *
   * @returns {boolean} True if cache is available
   */
  hasCache() {
    return this.#cache !== null
  }

  /**
   * Checks if the command has a CLI command string configured.
   *
   * @returns {boolean} True if CLI command is set
   */
  hasCliCommand() {
    return this.#cliCommand !== null
  }

  /**
   * Checks if the command has CLI options configured.
   *
   * @returns {boolean} True if CLI options are set
   */
  hasCliOptions() {
    return this.#cliOptions !== null
  }

  /**
   * Checks if the command is ready to be built.
   * Requires both CLI command and options to be set.
   *
   * @returns {boolean} True if command can be built
   */
  canBuild() {
    return this.hasCliCommand() && this.hasCliOptions()
  }

  /**
   * Builds the CLI command interface using the commander.js program instance.
   * Initializes the command with its options and action handler.
   *
   * @param {object} program - The commander.js program instance
   * @returns {Promise<this>} Returns this instance for method chaining
   */
  async buildCli(program) {
    if(!this.hasCliCommand())
      throw Sass.new("This command has no CLI command string.")

    if(!this.hasCliOptions())
      throw Sass.new("This command has no CLI options.")

    this.#command = program.command(this.getCliCommand())
    this.#command.action(async(...arg) => {
      try {
        await this.execute(...arg)
      } catch(error) {
        throw Sass.new(
          `Trying to execute ${this.constructor.name} with `+
          `${JSON.stringify(...arg)}`, error)
      }
    })

    this.addCliOptions(this.getCliOptions(), true)

    return this
  }

  /**
   * Adds a single CLI option to the command.
   *
   * @param {string} name - The option name
   * @param {string[]} options - Array containing option flag and description
   * @param {boolean} preserve - Whether to preserve this option name in the list
   * @returns {Promise<this>} Returns this instance for method chaining
   */
  addCliOption(name, options, preserve) {
    if(!this.#command)
      throw new Error("Unitialised Command")

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
   * @throws {Sass} If the file does not exist
   */
  async resolveThemeFileName(fileName, cwd) {
    const fileObject = new FileObject(fileName, cwd)

    if(!await fileObject.exists)
      throw Sass.new(`No such file 🤷: ${fileObject.path}`)

    return fileObject
  }

  /**
   * Emits an event asynchronously and waits for all listeners to complete.
   * Unlike the standard EventEmitter.emit() which is synchronous, this method
   * properly handles async event listeners by waiting for all of them to
   * resolve or reject using Promise.allSettled().
   *
   * @param {string} event - The event name to emit
   * @param {...unknown} [arg] - Arguments to pass to event listeners
   * @returns {Promise<void>} Resolves when all listeners have completed
   */
  async asyncEmit(event, arg) {
    try {
      arg = arg || new Array()
      const listeners = this.emitter.listeners(event)

      const settled =
        await Promise.allSettled(listeners.map(listener => listener(arg)))

      const rejected = settled.filter(reject => reject.status === "rejected")

      if(rejected.length > 0) {
        if(rejected[0].reason instanceof Error)
          throw rejected[0].reason
        else
          throw Sass.new(rejected[0].reason)
      }
    } catch(error) {
      throw Sass.new(
        `Processing '${event}' event with ${arg&&arg.length?`'${arg}'`:"no arguments"}.`,
        error
      )
    }
  }
}
