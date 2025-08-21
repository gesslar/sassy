import AuntyCommand from "./components/AuntyCommand.js"
import Term from "./components/Term.js"
import Theme from "./components/Theme.js"

/**
 * Command handler for building VS Code themes from source files.
 * Handles compilation, watching for changes, and output generation.
 */
export default class BuildCommand extends AuntyCommand {
  /**
   * Creates a new BuildCommand instance.
   *
   * @param {object} base - Base configuration containing cwd and packageJson
   */
  constructor(base) {
    super(base)

    this.cliCommand = "build <file...>"
    this.cliOptions = {
      "watch": ["-w, --watch", "watch for changes"],
      "output-dir": ["-o, --output-dir <dir>", "specify an output directory"],
      "dry-run": ["-n, --dry-run", "print theme JSON to stdout; do not write files"],
      "silent": ["-s, --silent", "silent mode. only print errors or dry-run"],
    }
  }

  /**
   * Executes the build command for the provided theme files.
   * Processes each file in parallel, optionally watching for changes.
   *
   * @param {string[]} fileNames - Array of theme file paths to process
   * @param {object} options - Build options including watch, output-dir, dry-run, silent
   * @returns {Promise<void>} Resolves when all files are processed
   */
  async execute(fileNames, options) {
    if(options.watch) {
      Term.status([
        ["info", "WATCH MODE"],
        "F5=recompile, q=quit"
      ], options)
      Term.info()
    }

    const {cwd} = this

    await Promise.allSettled(
      fileNames.map(async fileName => {
        const fileObject = await this.resolveThemeFileName(fileName, cwd)
        const theme = new Theme(fileObject, cwd, options)

        await theme.load()
        await theme.build()
        await theme.write()

        return theme
      })
    )

    // Ok nothing crashed heretofore, so... ok let's make the output directory
    // if it doesn't already exist.

    // await Promise.allSettled(
    //   inputArgs.map(input => processTheme({input, cwd, options}))
    // )
  }
}
