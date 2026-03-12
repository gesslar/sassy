export { default as Lint } from "./Lint.js";
/**
 * Command handler for linting theme files for potential issues.
 * CLI adapter that delegates analysis to Lint and handles terminal output.
 */
export default class LintCommand extends Command {
    /**
     * Creates a new LintCommand instance.
     *
     * @param {object} base - Base configuration containing cwd and packageJson
     */
    constructor(base: object);
    /**
     * Executes the lint command for a given theme file.
     * Validates the theme and reports any issues found.
     *
     * @param {string} inputArg - Path to the theme file to lint
     * @param {object} options - Linting options
     * @returns {Promise<void>} Resolves when linting is complete
     */
    execute(inputArg: string, options?: object): Promise<void>;
    #private;
}
import Command from "./Command.js";
//# sourceMappingURL=LintCommand.d.ts.map