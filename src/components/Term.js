import console from "node:console"
import ansiColors from "ansi-colors"
import colorSupport from "color-support"
import AuntyError from "./AuntyError.js"

// Required everywhere. Will modularise this kind of thing later.
ansiColors.enabled = colorSupport.hasBasic
ansiColors.alias("success", ansiColors.green)
ansiColors.alias("success-bracket", ansiColors.greenBright)
ansiColors.alias("info", ansiColors.cyan)
ansiColors.alias("info-bracket", ansiColors.cyanBright)
ansiColors.alias("warn", ansiColors.yellow)
ansiColors.alias("warn-bracket", ansiColors.yellow.dim)
ansiColors.alias("error", ansiColors.redBright)
ansiColors.alias("error-bracket", ansiColors.red)
ansiColors.alias("modified", ansiColors.magentaBright)
ansiColors.alias("modified-bracket", ansiColors.magenta)
ansiColors.alias("muted", ansiColors.white.dim.italic)
ansiColors.alias("muted-bracket", ansiColors.blackBright.italic)

export default class Term {
  /**
   * Log an informational message.
   *
   * @param {...any} arg - Values to log.
   */
  static log(...arg) {
    console.log(...arg)
  }

  /**
   * Log an informational message.
   *
   * @param {...any} arg - Values to log.
   */
  static info(...arg) {
    console.info(...arg)
  }

  /**
   * Log a warning message.
   *
   * @param {any} msg - Warning text / object.
   */
  static warn(...msg) {
    console.warn(...msg)
  }

  /**
   * Log an error message (plus optional details).
   *
   * @param {...any} arg - Values to log.
   */
  static error(...arg) {
    console.error(...arg)
  }

  /**
   * Log a debug message (no-op unless console.debug provided/visible by env).
   *
   * @param {...any} arg - Values to log.
   */
  static debug(...arg) {
    console.debug(...arg)
  }

  /**
   * Emit a status line to the terminal.
   *
   * Accepts either a plain string or an array of message segments (see
   * `terminalMessage()` for formatting options). If `silent` is true, output
   * is suppressed.
   *
   * This is a convenient shortcut for logging status updates, with optional
   * formatting and easy suppression.
   *
   * @param {string | Array<string | [string, string]>} args - Message or segments.
   * @param {object} [options] - Behaviour flags.
   * @param {boolean} options.silent - When true, suppress output.
   * @returns {void}
   */
  static status(args, {silent=false} = {}) {
    if(silent)
      return

    return Term.info(Term.terminalMessage(args))
  }

  /**
   * Constructs a formatted status line.
   *
   * Input forms:
   *  - string: printed as-is
   *  - array: each element is either:
   *    - a plain string (emitted unchanged), or
   *    - a tuple: [level, text] where `level` maps to an ansiColors alias
   *        (e.g. success, info, warn, error, modified).
   *    - a tuple: [level, text, [openBracket,closeBracket]] where `level` maps to an ansiColors alias
   *        (e.g. success, info, warn, error, modified). These are rendered as
   *        colourised bracketed segments: [TEXT].
   *
   * The function performs a shallow validation: tuple elements must both be
   * strings; otherwise a TypeError is thrown. Nested arrays beyond depth 1 are
   * not supported.
   *
   * Recursion: array input is normalised into a single string then re-dispatched
   * through `status` to leverage the string branch (keeps logic DRY).
   *
   * @param {string | Array<string, string> | Array<string, string, string>} args - Message spec.
   * @returns {void}
   */
  static terminalMessage(args) {
    if(typeof args === "string")
      return args

    if(Array.isArray(args)) {
      const message = args
        .map(curr => {
          // Bracketed
          if(Array.isArray(curr))

            if(curr.length === 3 && Array.isArray(curr[2]))
              return Term.terminalBracket(curr)

            else
              return Term.terminalBracket([...curr, ["",""]])

          // Plain string, no decoration
          if(typeof curr === "string")
            return curr
        })
        .join(" ")

      return Term.terminalMessage(message)
    }

    throw AuntyError.new("Invalid arguments passed to terminalMessage")
  }

  /**
   * Construct a single coloured bracketed segment from a tuple specifying
   * the style level and the text. The first element ("level") maps to an
   * `ansiColors` alias (e.g. success, info, warn, error, modified) and is
   * used both for the inner text colour and to locate its matching
   * "-bracket" alias for the surrounding square brackets. The second
   * element is the raw text to display.
   *
   * Input validation: every element of `parts` must be a string; otherwise
   * an `AuntyError` is thrown. (Additional elements beyond the first two are
   * ignored – the method destructures only the first pair.)
   *
   * Example:
   *  terminalBracket(["success", "COMPILED"]) → "[COMPILED]" with coloured
   *  brackets + inner text (assuming colour support is available in the
   *  terminal).
   *
   * This method does not append trailing spaces; callers are responsible for
   * joining multiple segments with appropriate separators.
   *
   * @param {string[]} parts - Tuple: [level, text]. Additional entries ignored.
   * @returns {string} Colourised bracketed segment (e.g. "[TEXT]").
   * @throws {AuntyError} If any element of `parts` is not a string.
   */
  static terminalBracket([level, text, brackets=["",""]]) {
    if(!(typeof level === "string" && typeof text === "string"))
      throw AuntyError.new("Each element must be a string.")

    return "" +
        ansiColors[`${level}-bracket`](brackets[0])
      + ansiColors[level](text)
      + ansiColors[`${level}-bracket`](brackets[1])
  }
}
