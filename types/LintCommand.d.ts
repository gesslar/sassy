/**
 * @import {ThemePool} from "./ThemePool.js"
 */
/**
 * Engine class for linting themes.
 * Analyses a compiled Theme and returns structured issue data.
 * No CLI awareness — takes a Theme and returns results.
 */
export class Lint {
    static SECTIONS: Readonly<{
        VARS: "vars";
        COLORS: "colors";
        TOKEN_COLORS: "tokenColors";
        SEMANTIC_TOKEN_COLORS: "semanticTokenColors";
    }>;
    static SEVERITY: Readonly<{
        HIGH: "high";
        MEDIUM: "medium";
        LOW: "low";
    }>;
    static ISSUE_TYPES: Readonly<{
        DUPLICATE_SCOPE: "duplicate-scope";
        UNDEFINED_VARIABLE: "undefined-variable";
        UNUSED_VARIABLE: "unused-variable";
        PRECEDENCE_ISSUE: "precedence-issue";
    }>;
    static TEMPLATES: Readonly<{
        ENTRY_NAME: (index: any) => string;
        OBJECT_NAME: (index: any) => string;
        VARIABLE_PREFIX: "$";
    }>;
    /**
     * Lints a compiled theme and returns categorised results.
     * Automatically calls `theme.load()` if the theme is not ready.
     *
     * @param {Theme} theme - The compiled theme object
     * @returns {Promise<object>} Object containing categorised lint results
     */
    run(theme: Theme): Promise<object>;
    #private;
}
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
import Theme from "./Theme.js";
import Command from "./Command.js";
//# sourceMappingURL=LintCommand.d.ts.map