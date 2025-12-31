// scripts/validate-examples.mjs
import {spawn} from "node:child_process"            // ✨ swap in spawn
import {readdir, stat} from "node:fs/promises"
import {join, extname, basename} from "node:path"
import console from "node:console"
import process from "node:process"

const EXAMPLES_BASE = "./examples"
const EXAMPLES_DIRS = ["advanced/src", "simple"]
const EXAMPLES_OUTPUT_DIR = `${EXAMPLES_BASE}/output`

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
 * @param dir
 */
async function* walk(dir) {
  for(const name of await readdir(dir)) {
    const p = join(dir, name)
    const s = await stat(p)
    if(s.isDirectory())
      yield *walk(p)
    else
      yield p
  }
}

const sources = []
await Promise.all(
  EXAMPLES_DIRS.map(async dir => {
    for await(const file of await walk(`${EXAMPLES_BASE}/${dir}`)) {
      if([".yaml", ".json5"].includes(extname(file)))
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
  const out = basename(f).replace(/\.(yaml|json5)$/i, ".color-theme.json")

  try {
    // shows the exact command; still useful, but actual output now streams live
    console.debug(["build", "-o", EXAMPLES_OUTPUT_DIR, f].join(" "))

    await run("node", ["src/cli.js", "build", "-o", EXAMPLES_OUTPUT_DIR, f])

    try {
      await stat(`${EXAMPLES_OUTPUT_DIR}/${out}`)
    } catch(e) {
      console.error(e.message)
      fail++
      continue
    }

    ok++
  } catch(e) {
    // spawn doesn't buffer stdout/stderr; this is just a summary line
    console.error("✗ failed", f, "\n", e?.message || e)
    fail++
  }
}

console.log(`\nExamples: ${ok} ok, ${fail} failed.`)
process.exit(fail ? 1 : 0)
