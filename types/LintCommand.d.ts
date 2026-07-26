/**
 * @file LintCommand.js
 *
 * CLI adapter for the Lint engine. Handles file resolution, terminal
 * reporting, exit codes, and delegates all analysis to Lint.
 */
import Command from "./Command.js";
export { default as Lint } from "./Lint.js";
/**
 * Command handler for linting theme files for potential issues.
 * CLI adapter that delegates analysis to Lint and handles terminal output.
 */
export default class LintCommand extends Command {
    #private;
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
    /**
     * Performs comprehensive linting of a theme.
     * Returns an array of issues found during validation.
     *
     * @param {Theme} theme - The compiled theme object
     * @returns {Promise<Array>} Array of lint issues
     * @private
     */
    private #lintTheme;
    /**
     * Reports lint issues to the user with appropriate formatting and colors.
     *
     * @param {Array} issues - Array of lint issues to report
     * @private
     */
    private #reportIssues;
    /**
     * Returns a colour-coded bullet indicator for a given severity level.
     *
     * @private
     * @param {"high"|"medium"|"low"} severity - Severity level to represent
     * @returns {string} A pre-coloured "●" character for terminal output
     */
    private #getIndicator;
    /**
     * Reports a single lint issue with clean, minimal formatting.
     *
     * @param {object} issue - The issue to report
     * @private
     */
    private #reportSingleIssue;
}
//# sourceMappingURL=LintCommand.d.ts.map