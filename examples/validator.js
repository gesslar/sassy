// scripts/validate-examples.mjs
import {spawn} from "node:child_process"            // ✨ swap in spawn
import {readdir, stat} from "node:fs/promises"
import {basename} from "node:path"
import console from "node:console"
import process from "node:process"
import { DirectoryObject, FileObject } from "@gesslar/toolkit"

/** @type {DirectoryObject} */
const EXAMPLES_BASE = new DirectoryObject("./examples")
/** @type {Array<DirectoryObject>} */
const EXAMPLES_DIRS = [EXAMPLES_BASE.getDirectory("advanced/src"), EXAMPLES_BASE.getDirectory("simple")]
/** @type {DirectoryObject} */
const EXAMPLES_OUTPUT_DIR = EXAMPLES_BASE.getDirectory(`output`)

// stream child output directly to this TTY
/**
 *
 * @param cmd
 * @param args
 * @param env
 */
function run(cmd, args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: "inherit",
      env: {...process.env, FORCE_COLOR: "1", ...env},
      shell: false,
    })
    child.on("exit", code => (code === 0 ? resolve() : reject(new Error(`exit ${code}`))))
    child.on("error", reject)
  })
}

/**
 *
 * @param {DirectoryObject} dir - The directory
 * @returns {AsyncGenerator<FileObject>} The file object.
 */
async function* walk(dir) {
  const {directories, files} = await dir.read()

  for(const item of [...directories, ...files].flat()) {
    if(item.isDirectory)
      yield *walk(item)
    else
      yield item
  }
}

/** @type {Array<FileObject} */
const sources = []
await Promise.all(
  EXAMPLES_DIRS.map(async dir => {
    for await (const file of walk(dir)) {
      if([".yaml", ".json5"].includes(file.extension))
        sources.push(file)
    }
  })
)

if(sources.length === 0) {
  console.log("No YAML/JSON5 examples found.")
  process.exit(0)
}

let ok = 0, fail = 0

for(const f of sources) {
  const out = EXAMPLES_OUTPUT_DIR.getFile(`${f.module}.color-theme.json`)

  try {
    // shows the exact command; still useful, but actual output now streams live
    console.debug(["build", "-o", EXAMPLES_OUTPUT_DIR.path, f].join(" "))

    await run("node", ["src/cli.js", "build", "-n", "-o", EXAMPLES_OUTPUT_DIR.path, f.path])

    try {
      if(await out.exists)
        ok++
      else
        fail++
    } catch(e) {
      console.error(e.message)
      fail++
    }
  } catch(e) {
    // spawn doesn't buffer stdout/stderr; this is just a summary line
    console.error("✗ failed", f, "\n", e?.message || e)
    fail++
  }
}

console.log(`\nExamples: ${ok} ok, ${fail} failed.`)
process.exit(fail ? 1 : 0)
