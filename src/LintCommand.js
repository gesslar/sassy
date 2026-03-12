/**
 * @file LintCommand.js
 *
 * CLI adapter for the Lint engine. Handles file resolution, terminal
 * reporting, exit codes, and delegates all analysis to Lint.
 */

import process from "node:process"

import c from "@gesslar/colours"

import Command from "./Command.js"
import Lint from "./Lint.js"
import SemanticCoherenceRules from "./lint/SemanticCoherenceRules.js"
import SemanticSelectorRules from "./lint/SemanticSelectorRules.js"
import SemanticValueRules from "./lint/SemanticValueRules.js"
import TokenColorStructureRules from "./lint/TokenColorStructureRules.js"
import TokenColorValueRules from "./lint/TokenColorValueRules.js"
import Theme from "./Theme.js"
import {Term} from "@gesslar/toolkit"

// Re-export for backward compatibility
export {default as Lint} from "./Lint.js"

/**
 * Command handler for linting theme files for potential issues.
 * CLI adapter that delegates analysis to Lint and handles terminal output.
 */
export default class LintCommand extends Command {
  /**
   * Creates a new LintCommand instance.
   *
   * @param {object} base - Base configuration containing cwd and packageJson
   */
  constructor(base) {
    super(base)

    this.setCliCommand("lint <file>")
    this.setCliOptions({
      // Future options could include:
      // "fix": ["-f, --fix", "automatically fix issues where possible"],
      "strict": ["--strict", "treat warnings as errors"],
      // "format": ["--format <type>", "output format (text, json)", "text"],
    })
  }

  /**
   * Executes the lint command for a given theme file.
   * Validates the theme and reports any issues found.
   *
   * @param {string} inputArg - Path to the theme file to lint
   * @param {object} options - Linting options
   * @returns {Promise<void>} Resolves when linting is complete
   */
  async execute(inputArg, options = {}) {
    const cwd = this.getCwd()
    const fileObject = await this.resolveThemeFileName(inputArg, cwd)

    const theme = new Theme()
      .setCwd(cwd)
      .setThemeFile(fileObject)
      .setOptions(options)
      .setCache(this.getCache())

    const issues = await this.#lintTheme(theme)

    this.#reportIssues(issues)

    const exitSeverities = [LC.SEVERITY.HIGH]

    if(options.strict)
      exitSeverities.push(LC.SEVERITY.MEDIUM)

    if(issues.some(i => exitSeverities.includes(i.severity)))
      process.exit(1)
  }

  /**
   * Performs comprehensive linting of a theme.
   * Returns an array of issues found during validation.
   *
   * @param {Theme} theme - The compiled theme object
   * @returns {Promise<Array>} Array of lint issues
   * @private
   */
  async #lintTheme(theme) {
    const lint = new Lint()
    const results = await lint.run(theme)

    // Flatten all results into a single array for backward compatibility
    return [
      ...results[LC.SECTIONS.TOKEN_COLORS],
      ...results[LC.SECTIONS.SEMANTIC_TOKEN_COLORS],
      ...results[LC.SECTIONS.COLORS],
      ...results.variables
    ]
  }

  /**
   * Reports lint issues to the user with appropriate formatting and colors.
   *
   * @param {Array} issues - Array of lint issues to report
   * @private
   */
  #reportIssues(issues) {
    if(issues.length === 0) {
      Term.info(c`{success}✓{/} No linting issues found`)

      return
    }

    const errors = issues.filter(i => i.severity === LC.SEVERITY.HIGH)
    const warnings = issues.filter(i => i.severity === LC.SEVERITY.MEDIUM)
    const infos = issues.filter(i => i.severity === LC.SEVERITY.LOW)
    const allIssues = errors.concat(warnings, infos)

    allIssues.forEach(issue => this.#reportSingleIssue(issue))

    // Clean summary
    const parts = []

    if(errors.length > 0)
      parts.push(`${errors.length} error${errors.length === 1 ? "" : "s"}`)

    if(warnings.length > 0)
      parts.push(`${warnings.length} warning${warnings.length === 1 ? "" : "s"}`)

    if(infos.length > 0)
      parts.push(`${infos.length} info`)

    Term.info(`\n${parts.join(", ")}`)
  }

  /**
   * Returns a colour-coded bullet indicator for a given severity level.
   *
   * @private
   * @param {"high"|"medium"|"low"} severity - Severity level to represent
   * @returns {string} A pre-coloured "●" character for terminal output
   */
  #getIndicator(severity) {
    switch(severity) {
      case LC.SEVERITY.HIGH: return c`{error}●{/}`
      case LC.SEVERITY.MEDIUM: return c`{warn}●{/}`
      case LC.SEVERITY.LOW:
      default: return c`{info}●{/}`
    }
  }

  /**
   * Reports a single lint issue with clean, minimal formatting.
   *
   * @param {object} issue - The issue to report
   * @private
   */
  #reportSingleIssue(issue) {
    const indicator = this.#getIndicator(issue.severity)

    switch(issue.type) {
      case LC.ISSUE_TYPES.DUPLICATE_SCOPE: {
        const rules = issue.occurrences
          .map(occ => {
            const ol = occ.location
              ? c` ({loc}${occ.location}{/})`
              : ""

            return c`{loc}'${occ.name}'{/}${ol}`
          })
          .join(", ")

        Term.info(c`${indicator} Scope '{context}${issue.scope}{/}' is duplicated in ${rules}`)
        break
      }

      case LC.ISSUE_TYPES.UNDEFINED_VARIABLE: {
        const sectionInfo = issue.section &&
          issue.section !== LC.SECTIONS.TOKEN_COLORS
          ? ` in ${issue.section}`
          : ""
        const loc = issue.location
          ? c` ({loc}${issue.location}{/})`
          : ""

        Term.info(c`${indicator} Variable '{context}${issue.variable}{/}' is used but not defined in '${issue.rule}' (${issue.property} property)${sectionInfo}${loc}`)
        break
      }

      case LC.ISSUE_TYPES.UNUSED_VARIABLE: {
        const loc = issue.location
          ? ` at {loc}${issue.location}{/}`
          : ""

        Term.info(c`${indicator} Variable '{context}${issue.variable}{/}' is defined in '{loc}${issue.occurrence}{/}'${loc}, but is never used`)
        break
      }

      case LC.ISSUE_TYPES.PRECEDENCE_ISSUE: {
        const broadLoc = issue.broadLocation
          ? c` ({loc}${issue.broadLocation}{/})`
          : ""
        const specificLoc = issue.specificLocation
          ? c` ({loc}${issue.specificLocation}{/})`
          : ""

        if(issue.broadIndex === issue.specificIndex) {
          Term.info(c`${indicator} Scope '{context}${issue.broadScope}{/}' makes more specific '{context}${issue.specificScope}{/}' redundant in '{loc}${issue.broadRule}{/}'${broadLoc}`)
        } else {
          Term.info(c`${indicator} Scope '{context}${issue.broadScope}{/}' in '{loc}${issue.broadRule}{/}'${broadLoc} masks more specific '{context}${issue.specificScope}{/}' in '{loc}${issue.specificRule}{/}'${specificLoc}`)
        }

        break
      }

      // Semantic selector rules
      case SemanticSelectorRules.ISSUE_TYPES.INVALID_SELECTOR:
      case SemanticSelectorRules.ISSUE_TYPES.UNRECOGNISED_TOKEN_TYPE:
      case SemanticSelectorRules.ISSUE_TYPES.UNRECOGNISED_MODIFIER:
      case SemanticSelectorRules.ISSUE_TYPES.DEPRECATED_TOKEN_TYPE:
      case SemanticSelectorRules.ISSUE_TYPES.DUPLICATE_SELECTOR:
      // Semantic value rules
      case SemanticValueRules.ISSUE_TYPES.INVALID_VALUE:
      case SemanticValueRules.ISSUE_TYPES.INVALID_HEX_COLOUR:
      case SemanticValueRules.ISSUE_TYPES.INVALID_FONTSTYLE:
      case SemanticValueRules.ISSUE_TYPES.FONTSTYLE_CONFLICT:
      case SemanticValueRules.ISSUE_TYPES.DEPRECATED_PROPERTY:
      case SemanticValueRules.ISSUE_TYPES.EMPTY_RULE:
      // Semantic coherence rules
      case SemanticCoherenceRules.ISSUE_TYPES.MISSING_SEMANTIC_HIGHLIGHTING:
      case SemanticCoherenceRules.ISSUE_TYPES.SHADOWED_RULE:
      // Token colour value rules
      case TokenColorValueRules.ISSUE_TYPES.MISSING_SETTINGS:
      case TokenColorValueRules.ISSUE_TYPES.EMPTY_SETTINGS:
      case TokenColorValueRules.ISSUE_TYPES.INVALID_HEX_COLOUR:
      case TokenColorValueRules.ISSUE_TYPES.INVALID_FONTSTYLE:
      case TokenColorValueRules.ISSUE_TYPES.INVALID_VALUE:
      case TokenColorValueRules.ISSUE_TYPES.DEPRECATED_BACKGROUND:
      case TokenColorValueRules.ISSUE_TYPES.UNKNOWN_SETTINGS_PROPERTY:
      // Token colour structure rules
      case TokenColorStructureRules.ISSUE_TYPES.MULTIPLE_GLOBAL_DEFAULTS: {
        const loc = issue.location
          ? c` ({loc}${issue.location}{/})`
          : ""

        Term.info(c`${indicator} ${issue.message}${loc}`)
        break
      }
    }
  }
}

// Aliases
const LC = Lint
