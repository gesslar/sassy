/**
 * @import {ThemePool} from "./ThemePool.js"
 * @import {Theme} from "./Theme.js"
 */
/**
 * Engine class for linting themes.
 * Analyses a compiled Theme and returns structured issue data.
 * No CLI awareness — takes a Theme and returns results.
 */
export default class Lint {
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
     *
     * Automatically loads and builds the theme if not already compiled.
     *
     * @param {Theme} theme - The theme object
     * @returns {Promise<object>} Object containing categorised lint results
     */
    run(theme: Theme): Promise<object>;
    #private;
}
//# sourceMappingURL=Lint.d.ts.map