/**
 * @import {Theme} from "./Theme.js"
 */
/**
 * Main compiler class for processing theme source files.
 * Handles the complete compilation pipeline from source to VS Code theme output.
 */
export default class Compiler {
    /**
     * Creates a new Compiler instance.
     *
     * @param {object} [options] - Compiler options
     * @param {import("@gesslar/toolkit").Cache} [options.cache] - Cache instance for imported files
     */
    constructor({ cache }?: {
        cache?: import("@gesslar/toolkit").Cache;
    });
    /**
     * Compiles a theme source file into a VS Code colour theme.
     * Composes the theme via {@link #compose}, then evaluates all variables
     * and colour functions to produce the final output.
     *
     * @param {Theme} theme - The file object containing source data and metadata
     * @returns {Promise<void>} Resolves when compilation is complete
     */
    compile(theme: Theme): Promise<void>;
    /**
     * Produces the fully composed theme document after all imports are merged,
     * overrides applied, and séance operators inlined — but before any variable
     * substitution or colour function evaluation.
     *
     * Returns the cached proof from the theme if one exists.
     *
     * @param {Theme} theme - The theme object to proof
     * @returns {Promise<object>} The composed, unevaluated theme structure
     */
    proof(theme: Theme): Promise<object>;
    #private;
}
//# sourceMappingURL=Compiler.d.ts.map