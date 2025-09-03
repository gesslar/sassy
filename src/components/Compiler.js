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

import * as Data from "./DataUtil.js"
import Evaluator from "./Evaluator.js"
import FileObject from "./FileObject.js"
import AuntyError from "./AuntyError.js"

/**
 * Main compiler class for processing theme source files.
 * Handles the complete compilation pipeline from source to VS Code theme output.
 */
export default class Compiler {
  #theme

  /**
   * Compiles a theme source file into a VS Code colour theme.
   * Processes configuration, variables, imports, and theme definitions.
   *
   * @param {object} theme - The file object containing source data and metadata
   * @returns {Promise<void>} Resolves when compilation is complete
   */
  async compile(theme) {
    this.#theme = theme

    await Promise.resolve()  // yielding control in the event loop or something

    const source = theme.source
    const file = theme.sourceFile
    const {config: sourceConfig} = source ?? {}
    const {vars: sourceVars} = source
    const {theme: sourceTheme} = source

    const evaluator = new Evaluator()
    const evaluate = (...arg) => evaluator.evaluate(...arg)
    const decompConfig = this.#decomposeObject(sourceConfig)
    const resolvedConfig = evaluate(decompConfig)
    const recompConfig = this.#composeObject(resolvedConfig)

    const header = {
      $schema: recompConfig.schema,
      name: recompConfig.name,
      type: recompConfig.type
    }

    // Let's get all of the imports!
    const imports = recompConfig.import ?? {}
    const {imported,importedFiles} =
      await this.#import({file,imports})

    theme.dependencies = importedFiles

    const sourceObj = {}
    if(sourceVars && Object.keys(sourceVars).length > 0)
      sourceObj.vars = sourceVars

    if(sourceTheme && Object.keys(sourceTheme).length > 0)
      sourceObj.theme = sourceTheme

    const merged = Data.mergeObject({},
      imported.global,
      imported.colors,
      imported.tokenColors,
      imported.semanticTokenColors,
      sourceObj
    )

    // Shred them up! Kinda.
    const decompVars =
      this.#decomposeObject(merged.vars)
    const decompColors =
      this.#decomposeObject(merged.theme.colors)
    const decompTokenColors =
      this.#decomposeObject(merged.theme.tokenColors)
    const decompSemanticTokenColors =
      this.#decomposeObject(merged.theme.semanticTokenColors)

    // First let's evaluate the variables
    evaluate(decompVars) // but we don't need the return value, only the lookup
    theme.lookup = evaluator.lookup
    const evalColors =
      evaluate(decompColors, theme.lookup)
    const evalTokenColors =
      evaluate(decompTokenColors, theme.lookup)
    const evalSemanticTokenColors =
      evaluate(decompSemanticTokenColors, theme.lookup)

    // Now let's do some reducing... into a form that works for VS Code
    const reducer = (acc,curr) => {
      acc[curr.flatPath] = curr.value
      return acc
    }
    // Assemble into one object with the proper keys
    const colors = evalColors.reduce(reducer, {})
    const tokenColors = this.#composeArray(evalTokenColors)
    const semanticTokenColors = evalSemanticTokenColors.reduce(reducer, {})
    const themeColours = {colors,semanticTokenColors,tokenColors}

    // Mix and maaatch all jumbly wumbly...
    const output = Data.mergeObject(
      {},
      header,
      sourceConfig.custom ?? {},
      themeColours
    )
    // Voilà!
    theme.output = output
    theme.pool = evaluator.pool
  }

  /**
   * Imports external theme files and merges their content.
   * Processes import specifications and loads referenced files.
   *
   * @param {object} params - Object containing parameters for the importation.
   * @param {FileObject} params.file - The file being imported into
   * @param {object} params.imports - The imports specification object
   * @returns {Promise<object>} Object containing imported data and file references
   */
  async #import({file, imports}) {
    const imported = {}
    const importedFiles = []

    const importPromises = await Promise.allSettled(
      Object.entries(imports).map(async([sectionName,target]) => {
        if(!target)
          return

        const importing = typeof target === "string" ? [target] : target

        if(!Data.isArrayUniform(importing, "string"))
          throw new AuntyError(
            `Import '${sectionName}' must be a string or an array of strings.`
          )


        const files = importing.map(f => new FileObject(f, file.directory))

        importedFiles.push(...files)

        const filePromises = await Promise.allSettled(files.map(file => this.#theme.cache.loadCachedData(file)))
        const rejected = filePromises.filter(({status}) => status === "rejected")
        if(rejected.length > 0)
          throw AuntyError.new(`Unable to load file(s).\n${rejected.map(({reason}) => reason)}`)

        const importedData = filePromises.map(({value}) => value)
        const mergedData = Data.mergeObject({}, ...importedData)
        const inner = Data.mergeObject(
          {}, imported[sectionName] ?? {}, mergedData
        )

        imported[sectionName] = inner
      })
    )


    const rejected = importPromises.filter((({status}) => status === "rejected"))
    if(rejected.length > 0)
      throw AuntyError.new(`Unable to import file(s).\n${rejected.map(({reason}) => reason)}`)

    return {imported,importedFiles}
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
        item.forEach((item, index) => {
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
   * @param {*} value - The value to check
   * @returns {boolean} True if the value is a plain object
   */
  #isObject(value) {
    return typeof value === "object" &&
           value !== null &&
           !Array.isArray(value)
  }
}
