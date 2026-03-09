/**
 * @file ProofCommand.js
 *
 * Defines the ProofCommand class for displaying the fully composed theme
 * document after all imports are merged, overrides applied, and séance
 * operators inlined — but before any variable substitution or colour
 * function evaluation.
 *
 * Also exports the Proof engine class for direct API use without CLI.
 */

import {stringify} from "yaml"

import {Term} from "@gesslar/toolkit"
import Command from "./Command.js"
import Compiler from "./Compiler.js"
import Theme from "./Theme.js"

/**
 * Engine class for proofing themes.
 * Produces the fully composed, unevaluated theme structure.
 * No CLI awareness — takes a loaded Theme and returns data.
 */
export class Proof {
  /** @type {import("@gesslar/toolkit").Cache|null} */
  #cache = null

  /**
   * Creates a new Proof instance.
   *
   * @param {object} [options] - Proof options
   * @param {import("@gesslar/toolkit").Cache} [options.cache] - Cache instance for imported files
   */
  constructor({cache} = {}) {
    this.#cache = cache ?? null
  }

  /**
   * Proofs a loaded theme, returning the composed document before
   * variable substitution or colour function evaluation.
   *
   * Automatically calls `theme.load()` if the theme is not ready.
   *
   * @param {Theme} theme - A Theme instance
   * @param {boolean} withImports - Do not strip imports from the proof
   * @returns {Promise<object>} The composed, unevaluated theme structure
   */
  async run(theme, withImports=false) {
    if(!theme.isReady())
      await theme.load()

    const compiler = new Compiler({cache: this.#cache})

    return await compiler.proof(theme, withImports)
  }
}

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

    if(cache)
      fileObject.withCache(cache)

    const theme = new Theme()
      .setCwd(cwd)
      .setThemeFile(fileObject)
      .withOptions(options)
      .setCache(cache)
    await theme.load()

    const proof = new Proof({cache})
    const result = await proof.run(theme)

    Term.log(stringify(result, {lineWidth: 0}))
  }
}
