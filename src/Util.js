import {performance} from "node:perf_hooks"
import {createHash} from "node:crypto"

export default class Util {
  static capitalize(text) {
    return `${text.slice(0,1).toUpperCase()}${text.slice(1)}`
  }

  /**
   * Measure wall-clock time for an async function.
   *
   * @template T
   * @param {() => Promise<T>} fn - Thunk returning a promise.
   * @returns {Promise<{result: T, cost: number}>} Object containing result and elapsed ms (number, 1 decimal).
   */
  async time(fn) {
    const t0 = performance.now()
    const result = await fn()
    const cost = Math.round((performance.now() - t0) * 10) / 10

    return {result, cost}
  }

  /**
   * Right-align a string inside a fixed width (left pad with spaces).
   * If the string exceeds width it is returned unchanged.
   *
   * @param {string|number} text - Text to align.
   * @param {number} width - Target field width (default 80).
   * @returns {string} Padded string.
   */
  static rightAlignText(text, width=80) {
    const work = String(text)

    if(work.length > width)
      return work

    const diff = width-work.length

    return `${" ".repeat(diff)}${work}`
  }

  /**
   * Compute sha256 hash (hex) of the provided string.
   *
   * @param {string} s - Input string.
   * @returns {string} 64-char hexadecimal digest.
   */
  static hashOf(s) {
    return createHash("sha256").update(s).digest("hex")
  }

  /**
   * Extracts canonical option names from a Commander-style options object.
   *
   * Each key in the input object is a string containing one or more option
   * forms, separated by commas (e.g. "-w, --watch"). This function splits each
   * key, trims whitespace, and parses out the long option name (e.g. "watch")
   * for each entry. If no long option ("--") is present, the short option (e.g.
   * "v" from "-v") will be included in the result array. If both are present,
   * the long option is preferred.
   *
   * Example:
   *   generateOptionNames({"-w, --watch": "desc", "-v": "desc"})
   *   → ["watch", "v"]
   *
   * Edge cases:
   *   - If a key contains only a short option ("-v"), that short name will be
   *     included in the result.
   *   - If multiple long options are present, only the first is used.
   *   - If the option string is malformed, may return undefined for that entry
   *     (filtered out).
   *
   * @param {object} object - Mapping of option strings to descriptions.
   * @returns {string[]} Array of canonical option names (long preferred, short if no long present).
   */
  static generateOptionNames(object) {
    return Object.keys(object)
      .map(key => {
        return key
          .split(",")
          .map(o => o.trim())
          .map(o => o.match(/^(?<sign>--?)(?<option>[\w-]+)/).groups)
          .reduce((acc, curr) => acc.sign === "--" ? acc : curr, {})
          ?.option
      })
      .filter(Boolean)
  }

  static async awaitAll(promises) {
    return await Promise.all(promises)
  }

  static async settleAll(promises) {
    return await Promise.allSettled(promises)
  }

  static async race(promises) {
    return await Promise.race(promises)
  }
}
