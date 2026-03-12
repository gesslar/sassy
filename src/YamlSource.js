/**
 * @file YamlSource.js
 *
 * Parses YAML text with yaml-eslint-parser to produce an AST with full
 * source-location information. Builds a path → location map so that
 * any dotted key path (e.g. "theme.colors.editor.background") can be
 * resolved to a {line, column} in the original file.
 */

import {parseForESLint} from "yaml-eslint-parser"

/**
 * @typedef {object} SourceLocation
 * @property {number} line - 1-based line number
 * @property {number} column - 0-based column offset
 */

/**
 * @typedef {object} LocationEntry
 * @property {SourceLocation} key - Location of the key
 * @property {SourceLocation} value - Location of the value (falls back to key)
 */

/**
 * Wraps a parsed YAML AST and provides fast path-to-location lookups.
 */
/**
 * @import {FileObject} from "@gesslar/toolkit"
 * @import {DirectoryObject} from "@gesslar/toolkit"
 */

export default class YamlSource {
  /**
   * Creates a YamlSource from a file, using the cwd for relative labelling.
   * Returns null for non-YAML files or on parse failure.
   *
   * @param {FileObject} file - The file to parse
   * @param {DirectoryObject} [cwd] - Optional cwd for relative path labels
   * @returns {Promise<YamlSource?>} The parsed YAML source or null
   */
  static async fromFile(file, cwd) {
    const ext = file.extension

    if(ext !== ".yaml" && ext !== ".yml")
      return null

    try {
      const label = cwd
        ? file.relativeTo(cwd)
        : file.path
      const text = await file.read()

      return new YamlSource(text, label)
    } catch {
      return null
    }
  }

  /** @type {Map<string, LocationEntry>} */
  #locationMap = new Map()

  /** @type {object} */
  #ast = null

  /** @type {string|null} */
  #filePath = null

  /**
   * Parses YAML source text and builds the internal location map.
   *
   * @param {string} text - Raw YAML source text
   * @param {string} [filePath] - Optional file path for display in messages
   */
  constructor(text, filePath) {
    const {ast} = parseForESLint(text)

    this.#ast = ast
    this.#filePath = filePath ?? null
    this.#buildLocationMap()
  }

  /**
   * Gets the key source location for a dotted key path.
   *
   * @param {string} dottedPath - Dot-separated key path (e.g. "vars.bg")
   * @returns {SourceLocation|null} Location or null if not found
   */
  getLocation(dottedPath) {
    return this.#locationMap.get(dottedPath)?.key ?? null
  }

  /**
   * Gets the value source location for a dotted key path.
   *
   * @param {string} dottedPath - Dot-separated key path (e.g. "vars.bg")
   * @returns {SourceLocation|null} Location or null if not found
   */
  getValueLocation(dottedPath) {
    return this.#locationMap.get(dottedPath)?.value ?? null
  }

  /**
   * Formats a location as "file:line:column" or "line:column" for display.
   *
   * @param {string} dottedPath - Dot-separated key path
   * @param {"key"|"value"} [target="key"] - Whether to locate the key or value
   * @returns {string|null} Formatted location string or null if not found
   */
  formatLocation(dottedPath, target = "key") {
    const loc = target === "value"
      ? this.getValueLocation(dottedPath)
      : this.getLocation(dottedPath)

    if(!loc)
      return null

    const position = `${loc.line}:${loc.column + 1}`

    return this.#filePath
      ? `${this.#filePath}:${position}`
      : position
  }

  /**
   * Gets the parsed AST.
   *
   * @returns {object} The yaml-eslint-parser AST
   */
  get ast() {
    return this.#ast
  }

  /**
   * Gets the file path associated with this source.
   *
   * @returns {string|null} The file path or null
   */
  get filePath() {
    return this.#filePath
  }

  /**
   * Gets the full location map (for debugging or advanced use).
   *
   * @returns {Map<string, SourceLocation>} The complete path→location map
   */
  get locationMap() {
    return this.#locationMap
  }

  /**
   * Walks the AST and populates the location map.
   *
   * @private
   */
  #buildLocationMap() {
    for(const doc of this.#ast.body) {
      if(doc.content?.type === "YAMLMapping")
        this.#walkMapping(doc.content, [])
    }
  }

  /**
   * Walks a YAMLMapping node, recording locations for each key.
   *
   * @param {object} mapping - YAMLMapping AST node
   * @param {Array<string>} path - Current path segments
   * @private
   */
  #walkMapping(mapping, path) {
    for(const pair of mapping.pairs) {
      const key = pair.key?.value

      if(key == null)
        continue

      const fullPath = [...path, key]
      const pathStr = fullPath.join(".")

      const keyLoc = pair.key.loc.start
      const valLoc = pair.value?.loc?.start ?? keyLoc

      this.#locationMap.set(pathStr, {
        key: {line: keyLoc.line, column: keyLoc.column},
        value: {line: valLoc.line, column: valLoc.column},
      })

      if(pair.value?.type === "YAMLMapping")
        this.#walkMapping(pair.value, fullPath)
      else if(pair.value?.type === "YAMLSequence")
        this.#walkSequence(pair.value, fullPath)
    }
  }

  /**
   * Walks a YAMLSequence node, recording locations for each entry.
   *
   * @param {object} seq - YAMLSequence AST node
   * @param {Array<string>} path - Current path segments
   * @private
   */
  #walkSequence(seq, path) {
    seq.entries.forEach((entry, i) => {
      const fullPath = [...path, String(i)]
      const pathStr = fullPath.join(".")

      if(entry.loc) {
        const loc = {line: entry.loc.start.line, column: entry.loc.start.column}

        this.#locationMap.set(pathStr, {key: loc, value: loc})
      }

      if(entry.type === "YAMLMapping")
        this.#walkMapping(entry, fullPath)
      else if(entry.type === "YAMLSequence")
        this.#walkSequence(entry, fullPath)
    })
  }
}
