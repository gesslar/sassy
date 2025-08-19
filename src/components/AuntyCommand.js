import AuntyError from "./AuntyError.js"
import FileObject from "./FileObject.js"

export default class AuntyCommand {
  #cliCommand = null
  #cliOptions = null
  #optionNames = []
  #command
  #cwd
  #packageJson

  constructor({cwd,packageJson}) {
    this.#cwd = cwd
    this.#packageJson = packageJson
  }

  get cwd() {
    return this.#cwd
  }

  get packageJson() {
    return this.#packageJson
  }

  get cliCommand() {
    return this.#cliCommand
  }

  set cliCommand(data) {
    this.#cliCommand = data
  }

  get cliOptions() {
    return this.#cliOptions
  }

  set cliOptions(data) {
    this.#cliOptions = data
  }

  get cliOptionNames() {
    return this.#optionNames
  }

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

  addCliOption(name, options, preserve) {
    if(!this.#command)
      throw new Error("Unitialised AuntyCommand")

    this.#command.option(...options)

    if(preserve === true)
      this.#optionNames.push(name)

    return this
  }

  addCliOptions(options, preserve) {
    for(const [name, opts] of Object.entries(options))
      this.addCliOption(name, opts, preserve)

    return this
  }

  async resolveThemeFileName(fileName, cwd) {
    const fileObject = new FileObject(fileName, cwd)
    const file = new FileObject(fileName, cwd)
    const fname = file.path
    if(!await file.exists)
      throw AuntyError.new(`No such file 🤷: ${fname}`)

    return fileObject
  }

}
