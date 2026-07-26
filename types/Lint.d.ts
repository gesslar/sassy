/**
 * @file Lint.js
 *
 * Engine class for comprehensive theme file validation.
 * Analyses a compiled Theme and returns structured issue data.
 * No CLI awareness — takes a Theme and returns results.
 *
 * Identifies:
 *   - Duplicate scope definitions across tokenColor rules
 *   - Undefined variable references in theme content
 *   - Unused variables defined in vars but never referenced
 *   - Scope precedence issues where broad scopes mask specific ones
 *   - TextMate scope selector conflicts and redundancies
 */
import type { Theme } from "./Theme.js";
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
    #private;
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
    /**
     * Performs structural linting of tokenColors that doesn't require variable
     * information.
     *
     * Checks for duplicate scopes and precedence issues.
     *
     * @param {Array} tokenColors - Array of tokenColor entries
     * @returns {Array} Array of structural issues
     * @private
     */
    private #lintTokenColorsStructure;
    /**
     * Performs variable-dependent linting of tokenColors data.
     * Checks for undefined variable references.
     *
     * @param {Array<[object, Array]>} tokenColorTuples - Array of [file, tokenColors] tuples
     * @param {ThemePool} pool - The theme's variable pool
     * @returns {Array} Array of variable-related issues
     * @private
     */
    private #lintTokenColors;
    /**
     * Performs variable-dependent linting of semanticTokenColors data.
     * Checks for undefined variable references.
     *
     * @param {Array<[object, object]>} semanticTokenColorTuples - Array of [file, semanticTokenColors] tuples
     * @param {ThemePool} pool - The theme's variable pool
     * @returns {Array} Array of variable-related issues
     * @private
     */
    private #lintSemanticTokenColors;
    /**
     * Performs variable-dependent linting of colors data.
     * Checks for undefined variable references.
     *
     * @param {Array<[object, object]>} colorTuples - Array of [file, colors] tuples
     * @param {ThemePool} pool - The theme's variable pool
     * @returns {Array} Array of variable-related issues
     * @private
     */
    private #lintColors;
    /**
     * Performs variable-dependent linting for unused variables.
     * Checks for variables defined but never used.
     *
     * @param {Theme} theme - The theme object
     * @param {ThemePool} pool - The theme's variable pool
     * @returns {Promise<Array>} Array of unused variable issues
     * @private
     */
    private #lintVariables;
    /**
     * Enriches all issues in the results with source locations
     * by mapping issue fields back to YAML AST positions.
     *
     * @param {object} results - The categorised lint results
     * @param {Theme} theme - The theme with YAML source data
     * @private
     */
    private #enrichLocations;
    /**
     * Resolves a source location for a single issue based on its
     * identifying fields.
     *
     * @param {object} issue - The lint issue
     * @param {Function} find - Location lookup function
     * @param {Array} tokenColors - Compiled tokenColors array
     * @returns {string|null} Formatted location or null
     * @private
     */
    private #resolveIssueLocation;
    /**
     * Extracts a specific section from all theme dependencies (including main theme).
     *
     * Returns an array of [FileObject, sectionData] tuples for linting methods that need
     * to track which file each piece of data originated from for proper error reporting.
     *
     * @param {Theme} theme - The theme object with dependencies
     * @param {string} section - The section name to extract (vars, colors, tokenColors, semanticTokenColors)
     * @returns {Array<[object, object|Array]>} Array of [file, sectionData] tuples
     * @private
     */
    private #getSection;
    /**
     * Checks for duplicate scopes across tokenColors rules.
     * Returns issues for scopes that appear in multiple rules.
     *
     * @param {Array} tokenColors - Array of tokenColors entries
     * @returns {Array} Array of duplicate scope issues
     * @private
     */
    private #checkDuplicateScopes;
    /**
     * Checks for undefined variables referenced in theme data.
     * Returns issues for variables that are used but not defined.
     *
     * @param {Array|object} themeData - Array of entries or object containing theme data
     * @param {ThemePool} pool - The theme's variable pool
     * @param {string} section - The section name (tokenColors, semanticTokenColors, colors)
     * @returns {Array} Array of undefined variable issues
     * @private
     */
    private #checkUndefinedVariables;
    /**
     * Recursively checks an object for undefined variable references.
     *
     * @param {object} obj - The object to check
     * @param {Set} definedVars - Set of defined variable names
     * @param {Array} issues - Array to push issues to
     * @param {string} section - The section name
     * @param {string} ruleName - The rule/object name for reporting
     * @param {string} path - The current path in the object (for nested properties)
     * @private
     */
    private #checkObjectForUndefinedVariables;
    /**
     * Checks for unused variables defined in vars section but not referenced in
     * theme content.
     *
     * Returns issues for variables that are defined in vars but never used.
     *
     * @param {Theme} theme - The compiled theme object
     * @param {ThemePool} pool - The theme's variable pool
     * @returns {Promise<Array>} Array of unused variable issues
     * @private
     */
    private #checkUnusedVariables;
    /**
     * Recursively collects variable names defined in the vars section.
     * Adds found variable names to the definedVars map.
     *
     * @param {object|null} vars - The vars data structure to search
     * @param {Map} definedVars - Map to add found variable names and filenames to
     * @param {string} prefix - Current prefix for nested vars
     * @param {string} filename - The filename where this variable is defined
     * @private
     */
    private #collectVarsDefinitions;
    /**
     * Recursively finds variable usage in any data structure.
     *
     * Adds found variable names to the usedVars set.
     *
     * @param {string|Array|object} data - The data structure to search
     * @param {Set} usedVars - Set to add found variable names to
     * @private
     */
    private #findVariableUsage;
    /**
     * Checks for precedence issues where broad scopes override specific ones.
     *
     * Returns issues for cases where a general scope appears after a more
     * specific one.
     *
     * @param {Array} tokenColors - Array of tokenColors entries
     * @returns {Array} Array of precedence issue warnings
     * @private
     */
    private #checkPrecedenceIssues;
    /**
     * Determines if one scope is broader than another.
     *
     * A broader scope will match the same tokens as a more specific scope, plus
     * others. Uses proper TextMate scope hierarchy rules.
     *
     * @param {string} broadScope - The potentially broader scope
     * @param {string} specificScope - The potentially more specific scope
     * @returns {boolean} True if broadScope is broader than specificScope
     * @private
     */
    private #isBroaderScope;
}
//# sourceMappingURL=Lint.d.ts.map