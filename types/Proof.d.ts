/**
 * @import {Theme} from "./Theme.js"
 * @import {Cache} from "@gesslar/toolkit"
 */
/**
 * Engine class for proofing themes.
 * Produces the fully composed, unevaluated theme structure.
 * No CLI awareness — takes a loaded Theme and returns data.
 */
export default class Proof {
    /**
     * Creates a new Proof instance.
     *
     * @param {object} [options] - Proof options
     * @param {Cache} [options.cache] - Cache instance for imported files
     */
    constructor({ cache }?: {
        cache?: Cache;
    });
    /**
     * Proofs a loaded theme, returning the composed document before
     * variable substitution or colour function evaluation.
     *
     * Returns the cached proof from the theme if one exists (e.g. after
     * a `build()`). Otherwise composes and caches it.
     *
     * Automatically calls `theme.load()` if the theme is not ready.
     *
     * @param {Theme} theme - A Theme instance
     * @returns {Promise<object>} The composed, unevaluated theme structure
     */
    run(theme: Theme): Promise<object>;
    #private;
}
import type { Cache } from "@gesslar/toolkit";
//# sourceMappingURL=Proof.d.ts.map