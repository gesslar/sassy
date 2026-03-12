#!/usr/bin/env node

import assert from "node:assert/strict"
import {describe, it} from "node:test"
import {DirectoryObject} from "@gesslar/toolkit"
import path from "node:path"
import {fileURLToPath} from "node:url"
import YamlSource from "../src/YamlSource.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

describe("YamlSource.fromFile()", () => {
  const cwd = new DirectoryObject(__dirname)

  it("returns a YamlSource for a .yaml file", async() => {
    const file = cwd.getFile("./fixtures/simple-theme.yaml")
    const source = await YamlSource.fromFile(file, cwd)

    assert.ok(source instanceof YamlSource)
    assert.ok(source.ast)
    assert.ok(source.filePath)
  })

  it("uses relative path as filePath when cwd provided", async() => {
    const file = cwd.getFile("./fixtures/simple-theme.yaml")
    const source = await YamlSource.fromFile(file, cwd)

    assert.equal(
      source.filePath,
      "fixtures/simple-theme.yaml"
    )
  })

  it("uses absolute path as filePath when no cwd", async() => {
    const file = cwd.getFile("./fixtures/simple-theme.yaml")
    const source = await YamlSource.fromFile(file)

    assert.equal(source.filePath, file.path)
  })

  it("returns null for non-YAML extensions", async() => {
    const file = cwd.getFile("../package.json")
    const result = await YamlSource.fromFile(file, cwd)

    assert.equal(result, null)
  })

  it("returns null when file does not exist", async() => {
    const file = cwd.getFile("./fixtures/nonexistent.yaml")
    const result = await YamlSource.fromFile(file, cwd)

    assert.equal(result, null)
  })

  it("builds a location map from the parsed content", async() => {
    const file = cwd.getFile("./fixtures/simple-theme.yaml")
    const source = await YamlSource.fromFile(file, cwd)

    assert.ok(source.locationMap.size > 0)
    assert.ok(source.getLocation("config.name"))
  })
})
