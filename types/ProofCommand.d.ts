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
    constructor(base: object);
    /**
     * Executes the proof command for a given theme file.
     * Loads the theme, runs the proof pipeline, and outputs the composed
     * document as YAML to stdout.
     *
     * @param {string} inputArg - Path to the theme file to proof
     * @param {object} options - Command options
     * @returns {Promise<void>} Resolves when proofing is complete
     */
    execute(inputArg: string, options?: object): Promise<void>;
    /**
     * Public method to proof a theme and return structured results for
     * external consumption.
     *
     * @param {Theme} theme - The loaded theme object
     * @returns {Promise<object>} The composed, unevaluated theme structure
     */
    proof(theme: Theme): Promise<object>;
}
import Command from "./Command.js";
import Theme from "./Theme.js";
//# sourceMappingURL=ProofCommand.d.ts.map