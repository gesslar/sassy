/**
 * @import {Theme} from "./Theme.js"
 */
/**
 * Main compiler class for processing theme source files.
 * Handles the complete compilation pipeline from source to VS Code theme output.
 */
export default class Compiler {
    /**
     * Compiles a theme source file into a VS Code colour theme.
     * Processes configuration, variables, imports, and theme definitions.
     *
     * @param {Theme} theme - The file object containing source data and metadata
     * @returns {Promise<void>} Resolves when compilation is complete
     */
    compile(theme: Theme): Promise<void>;
    #private;
}
//# sourceMappingURL=Compiler.d.ts.map