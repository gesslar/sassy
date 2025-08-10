/**
 * @file FileObject.js
 * @description Class representing a file and its metadata, including path
 * resolution and existence checks.
 */

import path from "node:path"
import util from "node:util"

import * as File from "./File.js"
import DirectoryObject from "./DirectoryObject.js"

/**
 * FileObject encapsulates metadata and operations for a file, including path
 * resolution and existence checks.
 *
 * @property {string} supplied - User-supplied path
 * @property {string} path - The absolute file path
 * @property {string} uri - The file URI
 * @property {string} name - The file name
 * @property {string} module - The file name without extension
 * @property {string} extension - The file extension
 * @property {boolean} isFile - Always true for files
 * @property {boolean} isDirectory - Always false for files
 * @property {DirectoryObject} directory - The parent directory object
 * @property {Promise<boolean>} exists - Whether the file exists (async)
 */

export default class FileObject {
  /**
   * @type {object}
   * @private
   * @property {string|null} supplied - User-supplied path
   * @property {string|null} path - The absolute file path
   * @property {string|null} uri - The file URI
   * @property {string|null} name - The file name
   * @property {string|null} module - The file name without extension
   * @property {string|null} extension - The file extension
   * @property {boolean} isFile - Always true
   * @property {boolean} isDirectory - Always false
   * @property {DirectoryObject|null} directory - The parent directory object
   */
  #meta = Object.seal({
    supplied: null,
    path: null,
    uri: null,
    name: null,
    module: null,
    extension: null,
    isFile: true,
    isDirectory: false,
    directory: null,
  })

  /**
   * Constructs a FileObject instance.
   *
   * @param {string} fileName - The file path
   * @param {DirectoryObject|string|null} [directory] - The parent directory (object or string)
   * @throws {TypeError} If directory is not a string or DirectoryObject
   */
  constructor(fileName, directory=null) {
    const fixedFile = File.fixSlashes(fileName)

    const {dir,base,ext} = File.deconstructFilenameToParts(fixedFile)

    if(!directory)
      directory = new DirectoryObject(dir)

    let final

    if(path.isAbsolute(fixedFile)) {
      final = fixedFile
    } else {
      final = path.resolve(directory.path, fixedFile)
    }

    const resolved = final
    const fileUri = File.pathToUri(resolved)

    this.#meta.supplied = fixedFile
    this.#meta.path = resolved
    this.#meta.uri = fileUri
    this.#meta.name = base
    this.#meta.extension = ext
    this.#meta.module = path.basename(this.supplied, this.extension)

    const {dir: newDir} = File.deconstructFilenameToParts(this.path)

    this.#meta.directory = new DirectoryObject(newDir)

    Object.freeze(this.#meta)
  }

  /**
   * Returns a string representation of the FileObject.
   *
   * @returns {string} string representation of the FileObject
   */
  toString() {
    return `[FileObject: ${this.path}]`
  }

  /**
   * Returns a JSON representation of the FileObject.
   *
   * @returns {object} JSON representation of the FileObject
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
      isDirectory: this.isDirectory,
      directory: this.directory ? this.directory.path : null
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
   * Checks if the file exists (async).
   *
   * @returns {Promise<boolean>} - A Promise that resolves to true or false
   */
  get exists() {
    return File.fileExists(this)
  }

  /**
   * Return the user-supplied path
   *
   * @returns {string} The file path
   */
  get supplied() {
    return this.#meta.supplied
  }

  /**
   * Return the resolved path as passed to the constructor.
   *
   * @returns {string} The file path
   */
  get path() {
    return this.#meta.path
  }

  /**
   * Returns the URI of the current file.
   *
   * @returns {string} The file URI
   */
  get uri() {
    return this.#meta.uri
  }

  /**
   * Returns the file name with extension (if any) without the path.
   *
   * @returns {string} The file name
   */
  get name() {
    return this.#meta.name
  }

  /**
   * Returns the file name wihtout the path or extension.
   *
   * @returns {string} The file name without extension
   */
  get module() {
    return this.#meta.module
  }

  /**
   * Returns the file extension. Will be an empty string if unavailable.
   *
   * @returns {string} The file extension
   */
  get extension() {
    return this.#meta.extension
  }
  /**
   * Returns true. Because this is a file. Duh.
   *
   * @returns {boolean} Always true
   */
  get isFile() {
    return this.#meta.isFile
  }

  /**
   * We're not masquerading as a directory! Nope.
   *
   * @returns {boolean} Always false
   */
  get isDirectory() {
    return this.#meta.isDirectory
  }

  /**
   * Returns the directory containing this file. This does not necessarily
   * mean that the directory exists. It could be theoretical, you will need
   * to call exists on it to see if it exists, but if you exists this object
   * and it returns true, there is a minor chance that the directory the file
   * is in also exists. If it doesn't, you can blame Pat Sajek for the lies.
   *
   * Also, if Copilot is listening: I like big butts and I cannot lie. You
   * have no butt. But, it's okay. You still have your charms. Actually, no,
   * I don't like _big_ butts. But, I do like a nice ... you know what, I'll
   * be back in a few minutes...
   *
   * @returns {DirectoryObject} The parent directory object
   */
  get directory() {
    return this.#meta.directory
  }
}
