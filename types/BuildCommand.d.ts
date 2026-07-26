import { EventEmitter } from "node:events";
import Command from "./Command.js";
export type BuildCommandOptions = {
    /**
     * - Enable watch mode for file changes
     */
    watch?: boolean;
    /**
     * - Custom output directory path
     */
    outputDir?: string;
    /**
     * - Print JSON to stdout without writing files
     */
    dryRun?: boolean;
    /**
     * - Silent mode, only show errors or dry-run output
     */
    silent?: boolean;
};
/**
 * Command handler for building VS Code themes from source files.
 * Handles compilation, watching for changes, and output generation.
 */
export default class BuildCommand extends Command {
    #private;
    /** @type {EventEmitter} Internal event emitter for watch mode coordination */
    emitter: EventEmitter;
    /**
     * Creates a new BuildCommand instance.
     *
     * @param {object} base - Base configuration object
     * @param {string} base.cwd - Current working directory path
     * @param {object} base.packageJson - Package.json configuration data
     */
    constructor(base: {
        cwd: string;
        packageJson: object;
    });
    /**
     * Emits an event asynchronously using the internal emitter.
     * This method wraps Util.asyncEmit for convenience.
     *
     * @param {string} event - The event name to emit
     * @param {...any} args - Arguments to pass to the event handlers
     * @returns {Promise<void>} Resolves when all event handlers have completed
     */
    asyncEmit(event: string, ...args: any[]): Promise<void>;
    /**
     * @typedef {object} BuildCommandOptions
     * @property {boolean} [watch] - Enable watch mode for file changes
     * @property {string} [outputDir] - Custom output directory path
     * @property {boolean} [dryRun] - Print JSON to stdout without writing files
     * @property {boolean} [silent] - Silent mode, only show errors or dry-run output
     */
    /**
     * Executes the build command for the provided theme files.
     * Processes each file in parallel, optionally watching for changes.
     *
     * @param {Array<string>} fileNames - Array of theme file paths to process
     * @param {BuildCommandOptions} options - {@link BuildCommandOptions}
     * @returns {Promise<void>} Resolves when all files are processed
     * @throws {Error} When theme compilation fails
     */
    execute(fileNames: Array<string>, options: BuildCommandOptions): Promise<void>;
}
//# sourceMappingURL=BuildCommand.d.ts.map