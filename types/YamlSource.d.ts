/**
 * @typedef {object} SourceLocation
 * @property {number} line - 1-based line number
 * @property {number} column - 0-based column offset
 */
/**
 * Wraps a parsed YAML AST and provides fast path-to-location lookups.
 */
export default class YamlSource {
    /**
     * Parses YAML source text and builds the internal location map.
     *
     * @param {string} text - Raw YAML source text
     * @param {string} [filePath] - Optional file path for display in messages
     */
    constructor(text: string, filePath?: string);
    /**
     * Gets the source location for a dotted key path.
     *
     * @param {string} dottedPath - Dot-separated key path (e.g. "vars.bg")
     * @returns {SourceLocation|null} Location or null if not found
     */
    getLocation(dottedPath: string): SourceLocation | null;
    /**
     * Formats a location as "file:line:column" or "line:column" for display.
     *
     * @param {string} dottedPath - Dot-separated key path
     * @returns {string|null} Formatted location string or null if not found
     */
    formatLocation(dottedPath: string): string | null;
    /**
     * Gets the parsed AST.
     *
     * @returns {object} The yaml-eslint-parser AST
     */
    get ast(): object;
    /**
     * Gets the file path associated with this source.
     *
     * @returns {string|null} The file path or null
     */
    get filePath(): string | null;
    /**
     * Gets the full location map (for debugging or advanced use).
     *
     * @returns {Map<string, SourceLocation>} The complete path→location map
     */
    get locationMap(): Map<string, SourceLocation>;
    #private;
}
export type SourceLocation = {
    /**
     * - 1-based line number
     */
    line: number;
    /**
     * - 0-based column offset
     */
    column: number;
};
//# sourceMappingURL=YamlSource.d.ts.map