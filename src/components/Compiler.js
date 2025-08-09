/**
 * @file Theme compilation engine for processing theme configuration files.
 * Handles compilation of theme source files including variable resolution,
 * imports, and output generation for VS Code color themes.
 */

import * as Data from "./DataUtil.js"
import Evaluator from "./Evaluator.js"
import * as File from "./File.js"

/**
 * Main compiler class for processing theme source files.
 * Handles the complete compilation pipeline from source to VS Code theme output.
 */
export default class Compiler {
  /**
   * Compiles a theme source file into a VS Code color theme.
   * Processes configuration, variables, imports, and theme definitions.
   *
   * @param {object} file - The file object containing source data and metadata
   * @returns {Promise<void>} Resolves when compilation is complete
   */
  static async compile(file) {
    const {source} = file
    const {config: sourceConfig} = source ?? {}
    const {vars: sourceVars} = source
    const {theme: sourceTheme} = source
    const result = {}

    const evaluate = (...arg) => Evaluator.evaluate(...arg)

    const decomposedConfig = Compiler.decomposeObject(sourceConfig)
    const resolvedConfig = evaluate({
      vars: decomposedConfig,
      theme: decomposedConfig
    })
    const recomposedConfig = Compiler.composeObject(resolvedConfig)

    const header = {
      $schema: recomposedConfig.schema,
      name: recomposedConfig.name,
      type: recomposedConfig.type
    }

    // Let's get all of the imports!
    const imports = recomposedConfig.import ?? {}
    const {imported,importedFiles} = await Compiler.import(header, imports)
    Object.assign(result, {importedFiles})

    const sourceObj = {}
    if(sourceVars && Object.keys(sourceVars).length > 0)
      sourceObj.vars = sourceVars

    if(sourceTheme && Object.keys(sourceTheme).length > 0)
      sourceObj.theme = sourceTheme

    const merged = Data.mergeObject({},
      imported.global,
      imported.colors,
      imported.tokenColors,
      sourceObj
    )

    const decomposedVars = Compiler.decomposeObject(merged.vars)
    const decomposedColors = Compiler.decomposeObject(merged.theme.colors)
    const evaluatedColors = evaluate({
      vars: decomposedVars, theme: decomposedColors
    })

    const reducer = (acc,curr) => {
      acc[curr.flatPath] = curr.value
      return acc
    }

    const colors = evaluatedColors.reduce(reducer, {})

    const decomposedtokenColors = Compiler.decomposeObject(
      merged.theme.tokenColors
    )

    const evaluatedTokenColors = evaluate({
      vars: decomposedVars, theme: decomposedtokenColors
    })
    const tokenColors = Compiler.composeArray(evaluatedTokenColors)
    const theme = {colors,tokenColors}

    const output = Data.mergeObject({},header,sourceConfig.custom ?? {},theme)
    Object.assign(result, {output})

    // Now set it all inside, FRROOOP!
    Object.assign(file, {result})
  }

  /**
   * Imports external theme files and merges their content.
   * Processes import specifications and loads referenced files.
   *
   * @param {object} header - The header object containing metadata
   * @param {object} imports - The imports specification object
   * @returns {Promise<object>} Object containing imported data and file references
   */
  static async import(header, imports) {
    const imported = {}
    const importedFiles = []

    for(const [sectionName,section] of Object.entries(imports)) {
      let inner = {}

      for(let [key,toImport] of Object.entries(section)) {
        if(!toImport)
          continue

        if(typeof toImport === "string")
          toImport = [toImport]

        if(!Data.isArrayUniform(toImport, "string"))
          throw new TypeError(
            `Import '${key}' must be a string or an array of strings.`
          )

        const resolved = toImport.map(target => {
          const subbing = Compiler.decomposeObject({path: target})
          const subbingWith = Compiler.decomposeObject(header)

          return Evaluator.evaluate({
            theme: subbing, vars: subbingWith
          })[0]
        })

        const files = await Promise.all(resolved.map(f =>
          File.resolveFilename(f.value)
        ))

        importedFiles.push(...files)

        const datas = await Promise.all(files.map(f => File.loadDataFile(f)))
        const imported = Data.mergeObject({}, ...datas)

        inner = Data.mergeObject(inner, imported)
      }

      imported[sectionName] = inner
    }

    return {imported,importedFiles}
  }

  /**
   * Decomposes a nested object into a flat array structure.
   * Converts hierarchical objects into a linear representation for processing.
   *
   * @param {object} work - The object to decompose
   * @param {Array<string>} path - The current path in the object hierarchy
   * @returns {Array<object>} Array of decomposed object entries with path information
   */
  static decomposeObject(work, path = []) {
    const isObject = Compiler.isObject

    const result = []

    for(const key in work) {
      const currPath = [...path, key]
      const item = work[key]

      if(isObject(item)) {
        result.push(...Compiler.decomposeObject(work[key], currPath))
      } else if(Array.isArray(work[key])) {
        item.forEach((item, index) => {
          const path = [...currPath, String(index+1)]
          result.push({
            key,
            value: item,
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
        result.push({key, value: item, path, flatPath: currPath.join(".")})
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
  static composeObject(decomposed) {
    const done = []

    return decomposed.reduce((acc, curr, _, arr) => {
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
  static composeArray(decomposed) {
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

      return Compiler.composeObject(section)
    })
  }

  /**
   * Checks if a value is a plain object (not null or array).
   * Utility method for type checking during compilation.
   *
   * @param {*} value - The value to check
   * @returns {boolean} True if the value is a plain object
   */
  static isObject(value) {
    return typeof value === "object" &&
           value !== null &&
           !Array.isArray(value)
  }
}
