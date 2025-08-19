import chokidar from "chokidar"
import path from "node:path"

import Compiler from "./Compiler.js"
import AuntyError from "./AuntyError.js"
import * as File from "./File.js"
import Term from "./Term.js"
import Util from "../Util.js"
import FileObject from "./FileObject.js"
import DirectoryObject from "./DirectoryObject.js"
import process from "node:process"

export default class Theme {
  #sourceFile = null
  #source = null
  #cwd = null
  #options = null
  #dependencies = []
  #lookup = null
  #breadcrumbs = null

  // Build-related properties
  #busy = false

  // Write-related properties
  #output = null
  #outputJson = null
  #outputFileName = null
  #outputHash = null

  // Watch-related properties
  #watcher = null

  constructor(themeFile, cwd, options) {
    this.#sourceFile = themeFile
    this.#outputFileName = `${themeFile.module}.color-theme.json`
    this.#cwd = process.cwd()
    this.#options = options
  }

  reset() {
    this.#output = null
    this.#outputJson = null
    this.#outputHash = null
    this.#lookup = null
    this.#breadcrumbs = null
  }

  get sourceFile() {
    return this.#sourceFile
  }

  get output() {
    return this.#output
  }

  set output(data) {
    this.#output = data
    this.#outputJson = JSON.stringify(data, null, 2) + "\n"
    this.#outputHash = Util.hashOf(this.#outputJson)
  }

  get dependencies() {
    return this.#dependencies
  }

  set dependencies(data) {
    this.#dependencies = data
  }

  get source() {
    return this.#source
  }

  get lookup() {
    return this.#lookup
  }

  set lookup(data) {
    this.#lookup = data
  }

  get breadcrumbs() {
    return this.#breadcrumbs
  }

  set breadcrumbs(data) {
    this.#breadcrumbs = data
  }

  async load() {
    const source = await File.loadDataFile(this.#sourceFile)

    if(!source.config)
      throw AuntyError.new(
        `Source file does not contain 'config' property: ${this.#sourceFile.path}`
      )

    this.#source = source

    return this
  }

  addDependency(file) {
    if(!file.isFile)
      throw AuntyError.new("File must be a dependency.")

    this.#dependencies.push(file)

    return this
  }

  loadDependencyPaths(bundle) {
    return [
      bundle.file.path,
      ...bundle.result.importedFiles.map(imported => imported.path),
    ]
  }

  // getDependencies(fileMap) {
  //   return [...new Set(getAllThemeFiles(fileMap))]
  // }

  async build(buildOptions) {
    // Store stdin handler reference to avoid multiple listeners
    // let stdinHandler = null

    this.#busy = false
    await this.#compileTheme(this.#options, buildOptions)

    return this
  }

  async #compileTheme(options, buildOptions) {
    if(this.#busy)
      return

    this.#busy = true
    try {
      // First, we pause because writing themes will trigger it again!
      if(this.#watcher) {
        await this.#watcher.close()
        this.#watcher = null
      }

      // Get rid of any artefacts, in case we're watching, or just set them
      // to default. It doesn't super matter why. Why are you asking questions?
      // Just reset already. Ok, fine.
      this.reset()

      // get a new compiler and compile this bad boy/girl/other!
      const compiler = new Compiler()
      await compiler.compile(this, buildOptions)

      // Term.status([
      //   ["success", rightAlignText(`${compileCost.toLocaleString()}ms`, 10)],
      //   `${bundle.file.module} compiled`
      // ], options)

      // if(Array.isArray(bundle.perf.compile))
      //   bundle.perf.compile.push(compileCost)
      // else
      //   bundle.perf.compile = [compileCost]

      // const {cost: writeCost, result: writeResult} =
      //   await time(async() => writeTheme(bundle, outputDir, options))

      // this.#write(options)

      // const {state: writeState, bytes: writeBytes, fileName} = writeResult

      // Term.status([
      //   ["success", rightAlignText(`${writeCost.toLocaleString()}ms`, 10)],
      //   `${fileName} <${writeState}>`,
      //   ["info", `${writeBytes.toLocaleString()} bytes`],
      // ], options)

      // if(Array.isArray(bundle.perf.write))
      //   bundle.perf.write.push(writeCost)
      // else
      //   bundle.perf.write = [writeCost]

      // Watch mode
      if(options.watch) {
        const dependencies = this.#dependencies

        this.#watcher = chokidar.watch(dependencies, {
          // Prevent watching own output files
          ignored: [this.#outputFileName],
          // Add some stability options
          awaitWriteFinish: {
            stabilityThreshold: 100,
            pollInterval: 50
          }
        })

        this.#watcher.on("change", async changed => {
          const relative = path.relative(this.#cwd, changed)
          const changedPath = relative.startsWith("..")
            ? changed
            : relative

          if(changed === this.#sourceFile.path)
            await this.load()

          // Term.status([
          //   ["modified", rightAlignText("CHANGED", 10)],
          //   changedPath,
          //   ["modified", bundle.file.module]
          // ], options)

          // if(changed === this.#sourceFile.path) {
          //   const {cost: reloadCost, result: tempBundle} =
          //       await time(async() => loadThemeAsBundle(bundle.file))
          //   const reloadedBytes = await File.fileSize(bundle.file)

          // Term.status([
          //   ["success", rightAlignText(`${reloadCost.toLocaleString()}ms`, 10)],
          //   `${bundle.file.module} loaded`,
          //   ["info", `${reloadedBytes} bytes`],
          // ], options)
          // }

          this.#compileTheme()
        })

        // // Only set up stdin handling once
        // if(!options.silent && !stdinHandler) {
        //   process.stdin.setRawMode(true)
        //   process.stdin.resume()
        //   process.stdin.setEncoding("utf8")

        //   stdinHandler = key => {
        //     if(key === "q" || key === "\u0003") {
        //       // 'q' or Ctrl+C to exit
        //       Term.info("")
        //       Term.info("Stopped watching.")
        //       Term.info("Exiting.")

        //       // Clean up
        //       if(bundle.watcher) {
        //         bundle.watcher.close()
        //       }

        //       if(stdinHandler) {
        //         process.stdin.removeListener("data", stdinHandler)
        //       }

        //       process.exit(0)
        //     } else if(key === "r" || key === "\x1b[15~") {
        //       // F5 key sends escape sequence: \x1b[15~

        //       Term.status([
        //         ["info", "REBUILDING"],
        //         bundle.file.path
        //       ], options)

        //       if(bundle.watcher) {
        //         bundle.watcher.close()
        //         bundle.watcher = null
        //       }

        //       doItUp()
        //     }
        //   }

        //   process.stdin.on("data", stdinHandler)
        // }
      }
    } finally {
      this.#busy = false
    }
  }

  async write() {
    const output = this.#outputJson

    if(this.#options.dryRun)
      return Term.log(this.#outputJson)

    // return {state: "dry-run", bytes: output.length, fileName}

    const outputDir = new DirectoryObject(this.#options.outputDir)
    const file = new FileObject(this.#outputFileName, outputDir)
    const nextHash = this.#outputHash
    const lastHash = await file.exists
      ? Util.hashOf(await File.readFile(file))
      : "kakadoodoo"

    // Skip identical bytes
    if(lastHash === nextHash)
      return

    // return {state: "skipped", bytes: output.length, fileName}

    // Real write (timed)
    if(!await outputDir.exists)
      await File.assureDirectory(outputDir, {recursive: true})

    await File.writeFile(file, `${output}`)

    Term.info(`${file.path} written`)

    // return {state: "written", bytes: output.length, fileName}
  }
}
