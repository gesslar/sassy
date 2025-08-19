import AuntyCommand from "./components/AuntyCommand.js"
import AuntyError from "./components/AuntyError.js"
import * as DataUtil from "./components/DataUtil.js"
import Util from "./Util.js"
import Theme from "./components/Theme.js"
import Term from "./components/Term.js"

export default class ResolveCommand extends AuntyCommand {
  constructor(base) {
    super(base)

    this.cliCommand = "resolve <file>"
    this.cliOptions = {
      "token": ["-t, --token <key>", "resolve a key to its final evaluated value"],
    }
  }

  async execute(inputArg, options) {
    const intersection =
      DataUtil.arrayIntersection(this.cliOptionNames, Object.keys(options))

    if(intersection.length > 1)
      throw AuntyError.new(
        `The options ${this.cliOptionNames.join(", ")} are ` +
        `mutually exclusive and may only have one expressed in the request.`
      )

    const {cwd} = this
    const optionName = Object.keys(options)
      .find(o => this.cliOptionNames.includes(o))
    const resolveFunctionName = `resolve${Util.capitalize(optionName)}`
    const optionValue = options[optionName]
    const resolverFunction = this[resolveFunctionName]

    if(!resolverFunction)
      throw AuntyError.new(`No such function ${resolveFunctionName}`)

    const fileObject = await this.resolveThemeFileName(inputArg, cwd)
    const theme = new Theme(fileObject, cwd, options)

    await theme.load()
    await theme.build({saveBreadcrumbs: true})

    resolverFunction.call(this, theme, optionValue)
  }

  async resolveToken(theme, token) {
    const breadcrumbs = theme.breadcrumbs

    if(!breadcrumbs.has(token))
      return Term.info(`'${token}' not found.`)

    const trail = breadcrumbs.get(token)
    const fullTrail = this.#getFulltrail(token, trail, breadcrumbs)
    const output = `\n${token} resolves to:\n${this.#formatOutput(fullTrail)}`

    Term.info(output)
  }

  #getFulltrail(token, trail, breadcrumbs) {
    return trail.reduce((acc, curr) => {
      const [_, reference] = curr.match(/\{\{(.*)\}\}/) || []

      if(!reference) {
        acc.push(curr)
      } else {
        if(breadcrumbs.has(reference)) {
          const fork = breadcrumbs.get(reference)
          const forked = this.#getFulltrail(reference, fork, breadcrumbs)

          forked.unshift(reference)
          acc.push(forked)
        } else {
          acc.push(curr)
        }
      }

      return acc
    }, [])
  }

  #formatOutput(arr, prefix = "") {
    let result = ""

    arr.forEach((item, index) => {
      const isLastItem = index === arr.length - 1
      const connector = isLastItem ? "└── " : "├── "

      if(Array.isArray(item)) {
        // result += prefix + connector + `[${index}]\n`
        result += this.#formatOutput(item, prefix + (isLastItem ? "    " : "│   "))
      } else {
        result += prefix + connector + item + "\n"
      }
    })

    return result
  }

}
