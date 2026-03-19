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

import {Collection, Data, Sass, Term, Util, Valid} from "@gesslar/toolkit"

import Evaluator from "./Evaluator.js"
import YamlSource from "./YamlSource.js"

/**
 * @import {Theme} from "./Theme.js"
 */

/**
 * Main compiler class for processing theme source files.
 * Handles the complete compilation pipeline from source to VS Code theme output.
 */
export default class Compiler {
  /** @type {import("@gesslar/toolkit").Cache|null} */
  #cache = null

  /**
   * Creates a new Compiler instance.
   *
   * @param {object} [options] - Compiler options
   * @param {import("@gesslar/toolkit").Cache} [options.cache] - Cache instance for imported files
   */
  constructor({cache} = {}) {
    this.#cache = cache ?? null
  }

  /**
   * Compiles a theme source file into a VS Code colour theme.
   * Composes the theme via {@link #compose}, then evaluates all variables
   * and colour functions to produce the final output.
   *
   * @param {Theme} theme - The file object containing source data and metadata
   * @returns {Promise<void>} Resolves when compilation is complete
   */
  async compile(theme) {
    try {
      const {recompConfig, sourceConfig, merged, allPriors} =
        await this.#compose(theme)

      // Cache the proof before evaluation mutates merged
      this.#cacheProof(theme, recompConfig, merged, allPriors)

      const header = {
        $schema: recompConfig.$schema,
        name: recompConfig.name,
        type: recompConfig.type
      }

      // Inject prior values as real palette tokens so the evaluator can
      // resolve séance variable references with full provenance
      if(allPriors.size > 0) {
        const priorTree = {}

        allPriors.forEach((value, pathStr) => {
          Data.setNestedValue(priorTree, pathStr.split("."), value)
        })

        merged.palette.__prior__ = priorTree
      }

      const evaluator = new Evaluator().setTheme(theme)
      const evaluate = (...arg) => evaluator.evaluate(...arg)

      // Palette first — self-contained, cannot reach outside itself
      const palette = this.#decomposeObject({palette: merged.palette ?? {}})

      evaluate(palette)

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
        .map(entry => {
          if(Array.isArray(entry.scope))
            return {...entry, scope: entry.scope.join(", ")}

          return entry
        })
      const semanticTokenColors = this.#composeObject(workSemanticTokenColors)

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
      throw Sass.new(`Compiling '${theme.getName()}'`, error)
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
    const importByFile = new Map()
    const imported = {
      palette: {},
      vars: {},
      colors: {},
      tokenColors: [],
      semanticTokenColors: {}
    }

    imports = typeof imports === "string"
      ? [imports]
      : imports

    if(!Collection.isArrayUniform(imports, "string"))
      throw Sass.new(
        `All import entries must be strings. Got ${JSON.stringify(imports)}`
      )

    const loaded = new Map()

    const themeSource = theme.getSourceFile()
    const themeDirectory = themeSource.parent

    for(const importing of imports) {
      try {
        const file = themeDirectory.getFile(importing)

        if(this.#cache)
          file.withCache(this.#cache)

        const {result, cost} = await Util.time(
          async() => await file.loadData()
        )

        if(theme.getOption("nerd")) {
          const cwd = theme.getCwd()
          const label = cwd
            ? file.relativeTo(cwd)
            : file.path

          Term.status([
            ["muted", Util.rightAlignText(`${cost.toLocaleString()}ms`, 10), ["[","]"]],
            "",
            ["muted", `${label}`],
            ["muted", `${theme.getName()}`,["(",")"]],
          ], theme.getOptions())
        }

        if(result) {
          const ys = await YamlSource.fromFile(file, theme.getCwd())

          loaded.set(file, {data: result, yamlSource: ys})
        }

      } catch(error) {
        throw Sass.new(`Attempting to import '${importing}'`, error)
      }
    }

    const allPriors = new Map()

    loaded.forEach(({data: load, yamlSource}, file) => {
      const palette = load?.palette ?? {}
      const vars = load?.vars ?? {}
      const colors = load?.theme?.colors ?? {}
      const tokenColors = load?.theme?.tokenColors ?? []
      const semanticTokenColors = load?.theme?.semanticTokenColors ?? {}

      importByFile.set(file, {
        source: new Map([
          ["palette", palette],
          ["vars", vars],
          ["colors", colors],
          ["tokenColors", tokenColors],
          ["semanticTokenColors", semanticTokenColors]
        ]),
        yamlSource,
      })

      const {transformed, priors} =
        this.#séance(imported.palette, palette, allPriors)

      priors.forEach((v, k) => allPriors.set(k, v))

      imported.palette =
        Data.mergeObject(imported.palette, transformed)
      imported.vars =
        Data.mergeObject(imported.vars, vars)
      imported.colors =
        Data.mergeObject(imported.colors, colors)
      imported.tokenColors =
        [...imported.tokenColors, ...tokenColors]
      imported.semanticTokenColors =
        Data.mergeObject(imported.semanticTokenColors, semanticTokenColors)
    })

    return {imported, importByFile, allPriors}
  }

  /**
   * Decomposes a nested object into flat entries with path information.
   * Recursively processes objects and arrays to create a flat structure for
   * evaluation.
   *
   * @param {object} work - The object to decompose
   * @param {Array<string>} path - Current path array for nested properties
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
          // Dear robot reviewer in the cloud, understand that this is an
          // intentional decision. I'm here for the girls, the gays, the theys,
          // and the less nerdy folk who might just want to build a theme who
          // haven't grown up making out with DEC Alphas in a darkened server
          // room while the sys admin has gone to lunch. So, this is 1-based as
          // most people see 1 as the first, not the second. This is basically
          // an affordance for normies. We don't judge here. Stop judging.
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
      } else if(item != null) {
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

          Object.assign(c, {path: newPath, flatPath: newFlatPath})

          if("array" in c) {
            const newArrayPath = c.array.path.slice(1)
            c.array = {...c.array, path: newArrayPath, flatPath: newArrayPath.join(".")}
          }

          return c
        })

      return this.#composeObject(section)
    })
  }

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
  #séance(accumulated, incoming, existingPriors = new Map()) {
    const priors = new Map()
    const isObject = this.#isObject

    const syntheticKey = pathStr => {
      if(!existingPriors.has(pathStr) && !priors.has(pathStr))
        return pathStr

      let version = 2

      while(
        existingPriors.has(`__${version}__.${pathStr}`) ||
        priors.has(`__${version}__.${pathStr}`)
      )
        version++

      return `__${version}__.${pathStr}`
    }

    const walk = (acc, obj, path) => {
      const result = {}

      for(const [key, val] of Object.entries(obj)) {
        const fullPath = [...path, key]

        if(isObject(val)) {
          result[key] = walk(acc?.[key] ?? {}, val, fullPath)
        } else if(
          typeof val === "string" &&
          /\^(?:\(\)|\{\})?/.test(val) &&
          typeof acc?.[key] === "string"
        ) {
          const pathStr = fullPath.join(".")
          const sk = syntheticKey(pathStr)

          result[key] = val.replaceAll(/\^(?:\(\)|\{\})?/g, `$(palette.__prior__.${sk})`)
          priors.set(sk, acc[key])
        } else {
          result[key] = val
        }
      }

      return result
    }

    return {transformed: walk(accumulated, incoming, []), priors}
  }

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
  async proof(theme) {
    Valid.type(theme, "Theme")

    if(theme.hasProof())
      return theme.getProof(true)

    try {
      const {recompConfig, merged, allPriors} = await this.#compose(theme)

      return this.#buildProof(theme, recompConfig, merged, allPriors)
    } catch(error) {
      throw Sass.new(`Proofing '${theme.getName()}'`, error)
    }
  }

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
  #buildProof(theme, recompConfig, merged, allPriors) {
    // Inline séance references: replace $(palette.__prior__.<key>) with
    // the actual prior value so the proof reads naturally
    if(allPriors.size > 0)
      this.#inlinePriors(merged.palette, allPriors)

    // Strip internal bookkeeping
    delete merged.palette?.__prior__

    const config = {...recompConfig}
    delete config.import

    const result = {
      config,
      palette: merged.palette ?? {},
      vars: merged.vars ?? {},
      theme: {
        colors: merged.colors ?? {},
        tokenColors: merged.tokenColors ?? [],
        semanticTokenColors: merged.semanticTokenColors ?? {},
      }
    }

    theme.setProof(result)

    return result
  }

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
  #cacheProof(theme, recompConfig, merged, allPriors) {
    // Deep clone merged before evaluation mutates it
    const snapshot = structuredClone(merged)

    this.#buildProof(theme, recompConfig, snapshot, allPriors)
  }

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
  async #compose(theme) {
    const source = theme.getSource()
    const {config: sourceConfig} = source ?? {}
    const {palette: sourcePalette} = source
    const {vars: sourceVars} = source
    const {theme: sourceTheme} = source

    // Evaluate config so $(type) in import paths resolves
    const evaluator = new Evaluator()
    const evaluate = (...arg) => evaluator.evaluate(...arg)
    const config = this.#decomposeObject(sourceConfig)

    evaluate(config)

    const recompConfig = this.#composeObject(config)

    // Let's get all of the imports!
    const imports = recompConfig.import ?? []
    const {imported, importByFile, allPriors} =
      await this.#import(imports, theme)

    importByFile.forEach(
      ({source, yamlSource}, file) =>
        theme.addDependency(file, source, yamlSource)
    )

    // Add main theme file last so findSourceLocation() (which iterates in
    // reverse) finds the effective definition first — overrides in the main
    // file take precedence over imports, and later imports over earlier ones.
    const mainDepSource = new Map()

    if(source?.vars) {
      mainDepSource.set("vars", source.vars)
    }

    if(source?.theme?.colors) {
      mainDepSource.set("colors", source.theme.colors)
    }

    if(source?.theme?.tokenColors) {
      mainDepSource.set("tokenColors", source.theme.tokenColors)
    }

    if(source?.theme?.semanticTokenColors) {
      mainDepSource.set("semanticTokenColors", source.theme.semanticTokenColors)
    }

    theme.addDependency(
      theme.getSourceFile(),
      mainDepSource,
      theme.getMainYamlSource()
    )

    // Handle tokenColors separately - imports first, then main source
    // (append-only)
    const mergedTokenColors = [
      ...(imported.tokenColors ?? []),
      ...(sourceTheme?.tokenColors ?? [])
    ]

    // Build origin map so findSourceLocation() can map compiled tokenColors
    // indices back to the correct source file and local index.
    const tcOrigins = []

    importByFile.forEach(({source}, file) => {
      const tc = source.get("tokenColors") ?? []
      tc.forEach((_, i) => tcOrigins.push({file, localIndex: i}))
    })

    const mainTc = sourceTheme?.tokenColors ?? []
    mainTc.forEach((_, i) =>
      tcOrigins.push({file: theme.getSourceFile(), localIndex: i})
    )

    theme.setTokenColorOrigins(tcOrigins)

    // Apply séance to source palette against the accumulated imported palette
    const {transformed: transformedPalette, priors: sourcePriors} =
      this.#séance(imported.palette, sourcePalette ?? {}, allPriors)

    sourcePriors.forEach((v, k) => allPriors.set(k, v))

    const merged = Data.mergeObject({},
      imported,
      {
        palette: transformedPalette,
        vars: sourceVars ?? {},
        colors: sourceTheme?.colors ?? {},
        semanticTokenColors: sourceTheme?.semanticTokenColors ?? {},
      }
    )

    // Add tokenColors after merging to avoid mergeObject processing
    merged.tokenColors = mergedTokenColors

    return {recompConfig, sourceConfig, merged, allPriors}
  }

  /**
   * Walks an object tree and replaces all `$(palette.__prior__.<key>)`
   * references with the actual prior values from the priors map.
   *
   * @param {object} obj - The object to walk (mutated in place)
   * @param {Map<string, string>} priors - Map of séance keys to prior values
   * @private
   */
  #inlinePriors(obj, priors) {
    const pattern = /\$\(palette\.__prior__\.([^)]+)\)/g

    const replace = str =>
      str.replace(pattern, (_, key) => priors.get(key) ?? _)

    const walk = target => {
      for(const [key, val] of Object.entries(target)) {
        if(typeof val === "string")
          target[key] = replace(val)
        else if(this.#isObject(val))
          walk(val)
      }
    }

    walk(obj)
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
