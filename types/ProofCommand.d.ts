/**
 * Engine class for proofing themes.
 * Produces the fully composed, unevaluated theme structure.
 * No CLI awareness — takes a loaded Theme and returns data.
 */
export class Proof {
    /**
     * Proofs a loaded theme, returning the composed document before
     * variable substitution or colour function evaluation.
     * Automatically calls `theme.load()` if the theme is not ready.
     *
     * @param {Theme} theme - A Theme instance
     * @returns {Promise<object>} The composed, unevaluated theme structure
     */
    run(theme: Theme): Promise<object>;
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
}
import Theme from "./Theme.js";
import Command from "./Command.js";
//# sourceMappingURL=ProofCommand.d.ts.map