/**
 * @file Compiler.js
 *
 * Defines the Compiler class, the main engine for processing theme
 * configuration files.
 *
 * Handles all phases of theme compilation:
 *   1. Import resolution (merging modular theme files)
 *   2. Variable decomposition and flattening
 *   3. Token evaluation and colour function application
 *   4. Recursive resolution of references
 *   5. Output assembly for VS Code themes
 *
 * Supports extension points for custom phases and output formats.
 */
import type { Theme } from "./Theme.js";
/**
 * @import {Theme} from "./Theme.js"
 */
/**
 * Main compiler class for processing theme source files.
 * Handles the complete compilation pipeline from source to VS Code theme output.
 */
export default class Compiler {
    #private;
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
     * Walks an incoming palette against an accumulated one, replacing séance
     * operator references (`^`, `^()`, `^{}`) with synthetic variable references
     * pointing into `palette.__prior__`, and collecting those prior values for
     * later injection as real palette tokens.
     *
     * @param {object} accumulated - Already-merged palette (provides prior values).
     * @param {object} incoming - New palette entries to process.
     * @returns {{transformed: object, priors: Map<string, string>}} The transformed
     *   palette and a map of dot-joined path → prior value.
     * @private
     */
    private #séance;
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
    /**
     * Builds the proof object from composed data, inlines séance references,
     * strips internal bookkeeping, caches the result on the theme, and returns it.
     *
     * @param {Theme} theme - The theme to cache the proof on
     * @param {object} recompConfig - The recomposed config object
     * @param {object} merged - The merged theme sections (may be mutated)
     * @param {Map} allPriors - Séance prior values
     * @returns {object} The proof object
     * @private
     */
    private #buildProof;
    /**
     * Snapshots the proof from composed data before evaluation mutates it.
     * Called by {@link compile} right after {@link #compose}.
     *
     * @param {Theme} theme - The theme to cache the proof on
     * @param {object} recompConfig - The recomposed config
     * @param {object} merged - The merged sections (deep-cloned before mutation)
     * @param {Map} allPriors - Séance prior values
     * @private
     */
    private #cacheProof;
    /**
     * Shared composition step: resolves config, imports, séance, and merges
     * everything into a single structure. Both {@link compile} and {@link proof}
     * consume this output — compile continues into evaluation, proof returns it
     * as-is (with séance inlined).
     *
     * @param {Theme} theme - The theme object to compose
     * @returns {Promise<{recompConfig: object, sourceConfig: object, merged: object, allPriors: Map}>}
     * @private
     */
    private #compose;
    /**
     * Walks an object tree and replaces all `$(palette.__prior__.<key>)`
     * references with the actual prior values from the priors map.
     *
     * @param {object} obj - The object to walk (mutated in place)
     * @param {Map<string, string>} priors - Map of séance keys to prior values
     * @private
     */
    private #inlinePriors;
}
//# sourceMappingURL=Compiler.d.ts.map