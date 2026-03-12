/**
 * @file ProofCommand.js
 *
 * CLI adapter for the Proof engine. Outputs the fully composed,
 * unevaluated theme document as YAML.
 */

import {stringify} from "yaml"

import {Term} from "@gesslar/toolkit"
import Command from "./Command.js"
import Proof from "./Proof.js"
import Theme from "./Theme.js"

// Re-export for backward compatibility
export {default as Proof} from "./Proof.js"

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
    const cache = this.getCache()

    const theme = new Theme()
      .setCwd(cwd)
      .setThemeFile(fileObject)
      .setOptions(options)
      .setCache(cache)

    const proof = new Proof({cache})
    const result = await proof.run(theme)

    Term.log(stringify(result, {lineWidth: 0}))
  }
}
