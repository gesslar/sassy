/**
 * @file Compiler.js
 *
 * Defines the Compiler class, the main engine for processing theme configuration files.
 * Handles all phases of theme compilation:
 *   1. Import resolution (merging modular theme files)
 *   2. Variable decomposition and flattening
 *   3. Token evaluation and colour function application
 *   4. Recursive resolution of references
 *   5. Output assembly for VS Code themes
 * Supports extension points for custom phases and output formats.
 */

import {Collection, Data, FileObject, Sass, Term, Util} from "@gesslar/toolkit"
import Evaluator from "./Evaluator.js"

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
  async compile(theme) {
    try {
      const source = theme.getSource()
      const {config: sourceConfig} = source ?? {}
      const {vars: sourceVars} = source
      const {theme: sourceTheme} = source

      const evaluator = new Evaluator()
      const evaluate = (...arg) => evaluator.evaluate(...arg)

      const config = this.#decomposeObject(sourceConfig)

      evaluate(config)
      const recompConfig = this.#composeObject(config)

      const header = {
        $schema: recompConfig.$schema,
        name: recompConfig.name,
        type: recompConfig.type
      }

      // Let's get all of the imports!
      const imports = recompConfig.import ?? []
      const {imported,importByFile} =
        await this.#import(imports, theme)

      importByFile.forEach((themeData,file) => {
        theme.addDependency(file,themeData)
      })

      // Handle tokenColors separately - imports first, then main source
      // (append-only)
      const mergedTokenColors = [
        ...(imported.tokenColors ?? []),
        ...(sourceTheme?.tokenColors ?? [])
      ]

      const merged = Data.mergeObject({},
        imported,
        {
          vars: sourceVars ?? {},
          colors: sourceTheme?.colors ?? {},
          semanticTokenColors: sourceTheme?.semanticTokenColors ?? {},
        }
      )

      // Add tokenColors after merging to avoid mergeObject processing
      merged.tokenColors = mergedTokenColors

      // Shred them up! Kinda. And evaluate the variables in place
      const vars = this.#decomposeObject(merged.vars)

      evaluate(vars)

      const workColors = this.#decomposeObject(merged.colors)

      evaluate(workColors)

      const workTokenColors = this.#decomposeObject(merged.tokenColors)

      evaluate(workTokenColors)

      const workSemanticTokenColors =
        this.#decomposeObject(merged.semanticTokenColors)

      evaluate(workSemanticTokenColors)

      theme.setLookup(evaluator.lookup)

      // Now let's do some reducing... into a form that works for VS Code
      const reducer = (acc,curr) => {
        acc[curr.flatPath] = curr.value

        return acc
      }

      // Assemble into one object with the proper keys
      const colors = workColors.reduce(reducer, {})
      const tokenColors = this.#composeArray(workTokenColors)
      const semanticTokenColors = workSemanticTokenColors.reduce(reducer, {})

      // Mix and maaatch all jumbly wumbly...
      const output = Data.mergeObject(
        {},
        header,
        sourceConfig.custom ?? {},
        {
          colors,
          tokenColors,
          semanticTokenColors,
        }
      )

      // Voilà!
      theme.setOutput(output)
      theme.setPool(evaluator.pool)
    } catch(error) {
      throw Sass.new(`Compiling ${theme.getName()}`, error)
    }
  }

  /**
   * Imports external theme files and merges their content.
   * Processes import specifications and loads referenced files.
   *
   * @param {Array<string>} imports - The import filenames.
   * @param {Theme} theme - The theme object being compiled.
   * @returns {Promise<object,Map>} Object containing imported data and file references
   */
  async #import(imports, theme) {
    const imported = {
      vars: {},
      colors: {},
      tokenColors: [],
      semanticTokenColors: {}
    }
    const importByFile = new Map()

    imports = typeof imports === "string"
      ? [imports]
      : imports

    if(!Collection.isArrayUniform(imports, "string"))
      throw new Sass(
        `All import entries must be strings. Got ${JSON.stringify(imports)}`
      )

    const loaded = new Map()

    for(const importing of imports) {
      try {
        const file = new FileObject(importing, theme.getSourceFile().directory)

        // Get the cached version or a new version. Who knows? I don't know.
        const {result, cost} = await Util.time(async() => {
          return await theme.getCache().loadCachedData(file)
        })

        if(theme.getOptions().nerd) {
          Term.status([
            ["muted", Util.rightAlignText(`${cost.toLocaleString()}ms`, 10), ["[","]"]],
            "",
            ["muted", `${file.toString()}`],
            ["muted", `${theme.getName()}`,["(",")"]],
          ], theme.getOptions())
        }

        if(result)
          loaded.set(file, result)

      } catch(error) {
        throw Sass.new(`Attempting to import ${importing}`, error)
      }
    }

    loaded.forEach((load, file) => {
      const vars = load?.vars ?? {}
      const colors = load?.theme?.colors ?? {}
      const tokenColors = load?.theme?.tokenColors ?? []
      const semanticTokenColors = load?.theme?.semanticTokenColors ?? {}

      importByFile.set(file, new Map([
        ["vars", vars],
        ["colors", colors],
        ["tokenColors", tokenColors],
        ["semanticTokenColors", semanticTokenColors]
      ]))

      imported.vars =
        Data.mergeObject(imported.vars, vars)
      imported.colors =
        Data.mergeObject(imported.colors, colors)
      imported.tokenColors =
        [...imported.tokenColors, ...tokenColors]
      imported.semanticTokenColors =
        Data.mergeObject(imported.semanticTokenColors, semanticTokenColors)
    })

    return {imported,importByFile}
  }

  /**
   * Decomposes a nested object into flat entries with path information.
   * Recursively processes objects and arrays to create a flat structure for
   * evaluation.
   *
   * @param {object} work - The object to decompose
   * @param {string[]} path - Current path array for nested properties
   * @returns {Array<object>} Array of decomposed object entries with path information
   */
  #decomposeObject(work, path = []) {
    const isObject = this.#isObject

    const result = []

    for(const key in work) {
      const currPath = [...path, key]
      const item = work[key]

      if(isObject(item)) {
        result.push(...this.#decomposeObject(work[key], currPath))
      } else if(Array.isArray(work[key])) {
        work[key].forEach((item, index) => {
          const path = [...currPath, String(index+1)]

          result.push({
            key,
            value: String(item),
            path,
            flatPath: path.join("."),
            array: {
              path: path.slice(0, -1),
              flatPath: path.slice(0, -1).join("."),
              index
            }
          })
        })
      } else {
        result.push({key, value: String(item), path, flatPath: currPath.join(".")})
      }
    }

    return result
  }

  /**
   * Recomposes a decomposed object array back into a hierarchical object structure.
   * Reconstructs nested objects from the flat representation created by decomposeObject.
   *
   * @param {Array<object>} decomposed - Array of decomposed object entries
   * @returns {object} The recomposed hierarchical object
   */
  #composeObject(decomposed) {
    const done = []

    return decomposed.reduce((acc, curr, index, arr) => {
      // Test for an array
      if("array" in curr) {
        const array = curr.array
        const fp = array.flatPath

        if(done.includes(array.flatPath))
          return acc

        const matches = arr.filter(a => "array" in a && a.array.flatPath === fp)
        const fps = matches.map(m => m.array.flatPath)
        const sorted = matches.sort((a,b) => a.array.index - b.array.index)
        const value = sorted.map(m => m.value)

        done.push(...fps)
        Data.setNestedValue(acc, array.path, value)
      } else {
        if(done.includes(curr.flatPath))
          return acc

        const keyPath = [...curr.path, curr.key]

        done.push(curr.flatPath)
        Data.setNestedValue(acc, keyPath, curr.value)
      }

      return acc
    }, {})
  }

  /**
   * Composes decomposed object entries into array structures.
   * Reconstructs array-based configurations from decomposed format.
   *
   * @param {Array<object>} decomposed - Array of decomposed object entries
   * @returns {Array} The composed array structure
   */
  #composeArray(decomposed) {
    const sections = decomposed.reduce((acc,curr) => {
      if(!acc.includes(curr.path[0]))
        acc.push(curr.path[0])

      return acc
    }, [])
    const sorted = sections.sort((a,b) => parseInt(a) - parseInt(b))

    return sorted.map(curr => {
      const section = decomposed
        .filter(c => c.path[0] === curr)
        .map(c => {
          const [_, newFlatPath] = c.flatPath.match(/^\w+\.(.*)$/)
          const newPath = c.path.slice(1)

          return Object.assign(c, {
            path: newPath,
            flatPath: newFlatPath
          })
        })

      return this.#composeObject(section)
    })
  }

  /**
   * Checks if a value is a plain object (not null or array).
   * Utility method for type checking during compilation.
   *
   * @param {unknown} value - The value to check
   * @returns {boolean} True if the value is a plain object
   */
  #isObject(value) {
    return typeof value === "object" &&
           value !== null &&
           !Array.isArray(value)
  }
}
