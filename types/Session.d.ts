/**
 * @import {Command} from "./Command.js"
 * @import {Theme} from "./Theme.js"
 * @import {FSWatcher} from "chokidar"
 */
/**
 * @typedef {object} SessionOptions
 * @property {boolean} [watch] - Whether to enable file watching
 * @property {boolean} [nerd] - Whether to show verbose output
 * @property {boolean} [dryRun] - Whether to skip file writes
 */
/**
 * @typedef {object} BuildRecord
 * @property {number} timestamp - Epoch ms when the build started
 * @property {number} loadTime - Time (ms) spent loading theme sources
 * @property {number} buildTime - Time (ms) spent compiling the theme
 * @property {number} writeTime - Time (ms) spent writing the output file
 * @property {boolean} success - Whether the build completed successfully
 * @property {string} [error] - Error message when success is false
 */
/**
 * @import {Theme} from "./Theme.js"
 * @import {Command} from "./Command.js"
 */
export default class Session {
    /**
     * Creates a new Session instance for managing theme compilation lifecycle.
     * Sessions provide persistent state across rebuilds, error tracking, and
     * individual theme management within the build system.
     *
     * @param {Command} command - The parent build command instance
     * @param {Theme} theme - The theme instance to manage
     * @param {SessionOptions} options - Build configuration options
     */
    constructor(command: path, theme: path, options: SessionOptions);
    get theme(): any;
    /**
     * Gets the theme instance managed by this session.
     *
     * @returns {Theme} The theme instance
     */
    getTheme(): path;
    /**
     * Gets the command instance orchestrating this session.
     *
     * @returns {Command} The command instance
     */
    getCommand(): path;
    /**
     * Gets the session options.
     *
     * @returns {SessionOptions} The session options
     */
    getOptions(): SessionOptions;
    /**
     * Gets the build history for this session.
     *
     * @returns {Array<BuildRecord>} Array of build records
     */
    getHistory(): Array<BuildRecord>;
    /**
     * Gets the build statistics for this session.
     *
     * @returns {{builds: number, failures: number}} Build statistics
     */
    getStats(): {
        builds: number;
        failures: number;
    };
    /**
     * Checks if a build is currently in progress.
     *
     * @returns {boolean} True if building
     */
    isBuilding(): boolean;
    /**
     * Checks if watch mode is enabled.
     *
     * @returns {boolean} True if watching
     */
    isWatching(): boolean;
    /**
     * Checks if there's an active file watcher.
     *
     * @returns {boolean} True if watcher exists
     */
    hasWatcher(): boolean;
    run(): Promise<void>;
    /**
     * Displays a formatted summary of the session's build statistics and
     * performance. Shows total builds, success/failure counts, success rate
     * percentage, and timing information from the most recent build. Used during
     * session cleanup to provide final statistics to the user.
     *
     * @returns {void}
     */
    showSummary(): void;
    #private;
}
export type SessionOptions = {
    /**
     * - Whether to enable file watching
     */
    watch?: boolean;
    /**
     * - Whether to show verbose output
     */
    nerd?: boolean;
    /**
     * - Whether to skip file writes
     */
    dryRun?: boolean;
};
export type BuildRecord = {
    /**
     * - Epoch ms when the build started
     */
    timestamp: number;
    /**
     * - Time (ms) spent loading theme sources
     */
    loadTime: number;
    /**
     * - Time (ms) spent compiling the theme
     */
    buildTime: number;
    /**
     * - Time (ms) spent writing the output file
     */
    writeTime: number;
    /**
     * - Whether the build completed successfully
     */
    success: boolean;
    /**
     * - Error message when success is false
     */
    error?: string;
};
//# sourceMappingURL=Session.d.ts.map