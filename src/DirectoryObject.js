/**
 * @file DirectoryObject.js
 * @description Class representing a directory and its metadata, including path
 * resolution and existence checks.
 */

import path from "node:path"
import util from "node:util"

import File from "./File.js"

/**
 * DirectoryObject encapsulates metadata and operations for a directory,
 * including path resolution and existence checks.
 *
 * @property {string} supplied - The supplied directory
 * @property {string} path - The resolved path
 * @property {string} uri - The directory URI
 * @property {string} name - The directory name
 * @property {string} module - The directory name without extension
 * @property {string} extension - The directory extension (usually empty)
 * @property {boolean} isFile - Always false
 * @property {boolean} isDirectory - Always true
 * @property {Promise<boolean>} exists - Whether the directory exists (async)
 */
export default class DirectoryObject {
  /**
   * @type {object}
   * @private
   * @property {string|null} supplied - User-supplied path
   * @property {string|null} path - The absolute file path
   * @property {string|null} uri - The file URI
   * @property {string|null} name - The file name
   * @property {string|null} module - The file name without extension
   * @property {string|null} extension - The file extension
   * @property {boolean} isFile - Always false
   * @property {boolean} isDirectory - Always true
   */
  #meta = Object.seal({
    supplied: null,
    path: null,
    uri: null,
    name: null,
    module: null,
    extension: null,
    isFile: false,
    isDirectory: true,
    directory: null,
  })

  /**
   * Constructs a DirectoryObject instance.
   *
   * @param {string} directory - The directory path
   */
  constructor(directory) {
    const fixedDir = File.fixSlashes(directory ?? ".")
    const {base,ext} = File.deconstructFilenameToParts(fixedDir)
    const fileUri = File.pathToUri(fixedDir)
    const filePath = File.uriToPath(fileUri)

    this.#meta.supplied = fixedDir
    this.#meta.path = filePath
    this.#meta.uri = fileUri
    this.#meta.name = base
    this.#meta.extension = ext
    this.#meta.module = path.basename(this.supplied, this.extension)

    Object.freeze(this.#meta)
  }

  /**
   * Returns a string representation of the DirectoryObject.
   *
   * @returns {string} string representation of the DirectoryObject
   */
  toString() {
    return `[DirectoryObject: ${this.path}]`
  }

  /**
   * Returns a JSON representation of the DirectoryObject.
   *
   * @returns {object} JSON representation of the DirectoryObject
   */
  toJSON() {
    return {
      supplied: this.supplied,
      path: this.path,
      uri: this.uri,
      name: this.name,
      module: this.module,
      extension: this.extension,
      isFile: this.isFile,
      isDirectory: this.isDirectory
    }
  }

  /**
   * Custom inspect method for Node.js console.
   *
   * @returns {object} JSON representation of this object.
   */
  [util.inspect.custom]() {
    return this.toJSON()
  }

  /**
   * Checks if the directory exists (async).
   *
   * @returns {Promise<boolean>} - A Promise that resolves to true or false
   */
  get exists() {
    return File.directoryExists(this)
  }

  /**
   * Return the path as passed to the constructor.
   *
   * @returns {string} The directory path
   */
  get supplied() {
    return this.#meta.supplied
  }

  /**
   * Return the resolved path
   *
   * @returns {string} The directory path
   */
  get path() {
    return this.#meta.path
  }

  /**
   * Returns the URI of the current directory.
   *
   * @returns {string} The directory URI
   */
  get uri() {
    return this.#meta.uri
  }

  /**
   * Returns the directory name with extension (if any) without the path.
   *
   * @returns {string} The directory name
   */
  get name() {
    return this.#meta.name
  }

  /**
   * Returns the directory name without the path or extension.
   *
   * @returns {string} The directory name without extension
   */
  get module() {
    return this.#meta.module
  }

  /**
   * Returns the directory extension. Will be an empty string if unavailable.
   *
   * @returns {string} The directory extension
   */
  get extension() {
    return this.#meta.extension
  }

  /**
   * Returns false. Because this is a directory.
   *
   * @returns {boolean} Always false
   */
  get isFile() {
    return this.#meta.isFile
  }

  /**
   * We're a directory!
   *
   * @returns {boolean} Always true
   */
  get isDirectory() {
    return this.#meta.isDirectory
  }
}
