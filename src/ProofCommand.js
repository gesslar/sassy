/**
 * @file ProofCommand.js
 *
 * Defines the ProofCommand class for displaying the fully composed theme
 * document after all imports are merged, overrides applied, and séance
 * operators inlined — but before any variable substitution or colour
 * function evaluation.
 *
 * Useful for inspecting the exact structure the compiler would evaluate
 * against, verifying that imports, merges, and séance derivations
 * compose as expected.
 */

import {stringify} from "yaml"

import Command from "./Command.js"
import Compiler from "./Compiler.js"
import Theme from "./Theme.js"
import {Term} from "@gesslar/toolkit"

/**
 * Command handler for proofing theme files.
 * Outputs the fully composed, unevaluated theme document as YAML.
 */
export default class ProofCommand extends Command {
  /**
   * Creates a new ProofCommand instance.
   *
   * @param {object} base - Base configuration containing cwd and packageJson
   */
  constructor(base) {
    super(base)

    this.setCliCommand("proof <file>")
    this.setCliOptions({})
  }

  /**
   * Executes the proof command for a given theme file.
   * Loads the theme, runs the proof pipeline, and outputs the composed
   * document as YAML to stdout.
   *
   * @param {string} inputArg - Path to the theme file to proof
   * @param {object} options - Command options
   * @returns {Promise<void>} Resolves when proofing is complete
   */
  async execute(inputArg, options = {}) {
    const cwd = this.getCwd()
    const fileObject = await this.resolveThemeFileName(inputArg, cwd)
    const theme = new Theme(fileObject, cwd, options)

    theme.setCache(this.getCache())
    await theme.load()

    const compiler = new Compiler()
    const result = await compiler.proof(theme)

    Term.log(stringify(result, {lineWidth: 0}))
  }

  /**
   * Public method to proof a theme and return structured results for
   * external consumption.
   *
   * @param {Theme} theme - The loaded theme object
   * @returns {Promise<object>} The composed, unevaluated theme structure
   */
  async proof(theme) {
    const compiler = new Compiler()

    return await compiler.proof(theme)
  }
}
