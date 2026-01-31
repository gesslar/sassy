/**
 * @import {ThemePool} from "./ThemePool.js"
 */
/**
 * Command handler for linting theme files for potential issues.
 * Validates tokenColors for duplicate scopes, undefined variables, unused
 * variables, and precedence issues that could cause unexpected theme
 * behaviour.
 */
export default class LintCommand extends Command {
    static SECTIONS: {
        VARS: string;
        COLORS: string;
        TOKEN_COLORS: string;
        SEMANTIC_TOKEN_COLORS: string;
    };
    static SEVERITY: {
        HIGH: string;
        MEDIUM: string;
        LOW: string;
    };
    static ISSUE_TYPES: {
        DUPLICATE_SCOPE: string;
        UNDEFINED_VARIABLE: string;
        UNUSED_VARIABLE: string;
        PRECEDENCE_ISSUE: string;
    };
    static TEMPLATES: {
        ENTRY_NAME: (index: any) => string;
        OBJECT_NAME: (index: any) => string;
        VARIABLE_PREFIX: string;
    };
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
     * Public method to lint a theme and return structured results for external
     * consumption.
     *
     * Returns categorized lint results for tokenColors, semanticTokenColors, and colors.
     *
     * @param {Theme} theme - The compiled theme object
     * @returns {Promise<object>} Object containing categorized lint results
     */
    lint(theme: Theme): Promise<object>;
    #private;
}
import Command from "./Command.js";
import Theme from "./Theme.js";
//# sourceMappingURL=LintCommand.d.ts.map