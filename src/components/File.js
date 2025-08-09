/**
 * @file File system utilities for reading, writing, and manipulating files and directories.
 * Provides comprehensive file operations including data file loading (JSON5/YAML),
 * path resolution, and file system navigation with support for both files and directories.
 */

import * as fs from "node:fs/promises"
import path from "node:path"
import process from "node:process"
import {globby} from "globby"
import JSON5 from "json5"
import YAML from "yaml"
import {fileURLToPath, pathToFileURL} from "node:url"
import * as ValidUtil from "./Valid.js"

const {assert} = ValidUtil

/**
 * @typedef {object} FileMap
 * @property {string} path - The file path
 * @property {string} uri - The file URI
 * @property {string} absolutePath - The absolute file path
 * @property {string} absoluteUri - The absolute file URI
 * @property {string} name - The file name
 * @property {string} module - The file name without extension
 * @property {string} extension - The file extension
 * @property {true} isFile - Always true for files
 * @property {false} isDirectory - Always false for files
 * @property {DirMap} [directory] - The parent directory map (optional)
 */

/**
 * @typedef {object} DirMap
 * @property {string} path - The directory path
 * @property {string} uri - The directory URI
 * @property {string} absolutePath - The absolute directory path
 * @property {string} absoluteUri - The absolute directory URI
 * @property {string} name - The directory name
 * @property {string} separator - The path separator
 * @property {false} isFile - Always false for directories
 * @property {true} isDirectory - Always true for directories
 */

const freeze = ob => Object.freeze(ob)

const fdTypes = freeze({FILE: "file", DIRECTORY: "directory"})

/**
 * Fix slashes in a path
 *
 * @param {string} pathName - The path to fix
 * @returns {string} The fixed path
 */
function fixSlashes(pathName) {
  return pathName.replace(/\\/g, "/")
}

/**
 * Convert a path to a URI
 *
 * @param {string} pathName - The path to convert
 * @returns {string} The URI
 * @throws {Error} If the path is not a valid file path
 */
function pathToUri(pathName) {
  try {
    return pathToFileURL(pathName).href
  } catch(e) {
    void e // stfu linter
    return pathName
  }
}

/**
 * Check if a file can be read. Returns true if the file can be read, false
 *
 * @param {FileMap} FileMap - The file map to check
 * @returns {Promise<boolean>} Whether the file can be read
 */
async function canReadFile(FileMap) {
  try {
    await fs.access(FileMap.absolutePath, fs.constants.R_OK)
    return true
  } catch(_error) {
    return false
  }
}

/**
 * Check if a file can be written. Returns true if the file can be written,
 *
 * @param {FileMap} FileMap - The file map to check
 * @returns {Promise<boolean>} Whether the file can be written
 */
async function canWriteFile(FileMap) {
  try {
    await fs.access(FileMap.absolutePath, fs.constants.W_OK)
    return true
  } catch(_error) {
    return false
  }
}

/**
 * Check if a file exists
 *
 * @param {FileMap} file - The file map to check
 * @returns {Promise<boolean>} Whether the file exists
 */
async function fileExists(file) {
  try {
    await fs.access(file.absolutePath)
    return true
  } catch(_) {
    return false
  }
}

/**
 * Check if a directory exists
 *
 * @param {DirMap} dir - The directory map to check
 * @returns {Promise<boolean>} Whether the directory exists
 */
async function directoryExists(dir) {
  try {
    await fs.access(dir.absolutePath)
    return true
  } catch(_error) {
    return false
  }
}

/**
 * Convert a URI to a path
 *
 * @param {string} pathName - The URI to convert
 * @returns {string} The path
 * @throws {Error} If the URI is not a valid file URL
 */
function uriToPath(pathName) {
  try {
    return fileURLToPath(pathName)
  } catch(e) {
    void e // did you hear me?? i said stfu!
    return pathName
  }
}

/**
 * Resolves a file to an absolute path
 *
 * @param {string} file - The file to resolve
 * @param {DirMap} [dir] - The directory object to resolve the
 *                                     file in
 * @returns {Promise<FileMap>} A file object (validated)
 * @throws {Error} If the file or directory cannot be resolved.
 */
async function resolveFilename(file, dir = null) {
  assert(
    (file && typeof file === "string" && file.length > 0),
    "fileName must be a non-zero length string",
    1
  )

  file = uriToPath(file)
  const fixedFileName = fixSlashes(file)
  const directoryNamePart = fixedFileName.split("/").slice(0, -1).join("/")
  const fileNamePart = fixedFileName.split("/").pop()
  const directoryObject = dir ?? await resolveDirectory(directoryNamePart)

  const fileObject = composeFilename(fileNamePart, directoryObject)

  if(!fileObject)
    throw new Error(
      `Failed to resolve file: ${file}, looking for file: ${fileNamePart}`,
    )

  if(!(await fileExists(fileObject)))
    throw new Error(
      `Failed to resolve file: ${fileObject.absolutePath}`,
    )

  return {
    ...fileObject,
    directory: directoryObject,
  }
}

/**
 * Compose a file path from a directory and a file
 *
 * @param {string} file - The file
 * @param {string|DirMap} dir - The directory
 * @returns {FileMap} A file object (does not check for file existence)
 * @throws {TypeError} If directoryNameorObject is not a string or DirMap, or if fileName is not a string.
 * @throws {Error} If the directory object is not a directory.
 */
function composeFilename(file, dir) {
  assert(
    dir && (typeof dir === "string" || (typeof dir === "object" && dir.isDirectory !== undefined)),
    "dir must be a string or DirMap",
    1
  )

  assert(
    file && typeof file === "string" && file.length > 0,
    "file must be a non-zero length string",
    2
  )

  let dirObject

  dir = dir ?? process.cwd()

  if(typeof dir === "string") {
    dirObject = composeDirectory(dir)
  } else if(typeof dir === "object" && dir !== null && dir.isDirectory === true) {
    dirObject = dir
  } else {
    throw new TypeError("directoryNameorObject must be a string or a DirMap with isDirectory === true")
  }

  file = path.resolve(dirObject.path, file)

  return mapFilename(file)
}

/**
 * Map a file to a FileMap
 *
 * @param {string} file - The file to map
 * @returns {FileMap} A file object
 * @throws {TypeError} If fileName is not a string.
 */
function mapFilename(file) {
  assert(
    file && typeof file === "string" && file.length > 0,
    "file must be a string",
    1
  )

  return {
    path: file,
    uri: pathToUri(file),
    absolutePath: path.resolve(process.cwd(), file),
    absoluteUri: pathToUri(path.resolve(process.cwd(), file)),
    name: path.basename(file),
    module: path.basename(file, path.extname(file)),
    extension: path.extname(file),
    isFile: true,
    isDirectory: false,
  }
}

/**
 * Map a directory to a DirMap
 *
 * @param {string} dir - The directory to map
 * @returns {DirMap} A directory object
 * @throws {TypeError} If directoryName is not a string.
 */
function mapDirectory(dir) {
  assert(
    dir && typeof dir === "string" && dir.length > 0,
    "dir must be a non-zero length string",
    1)

  return {
    path: dir,
    uri: pathToUri(dir),
    absolutePath: path.resolve(process.cwd(), dir),
    absoluteUri: pathToUri(path.resolve(process.cwd(), dir)),
    name: path.basename(dir),
    separator: path.sep,
    isFile: false,
    isDirectory: true,
  }
}

/**
 * @typedef {object} FileParts
 * @property {string} basename - The file name with extension
 * @property {string} dirname - The directory path
 * @property {string} extname - The file extension (including dot)
 */

/**
 * Deconstruct a filename into parts
 *
 * @param {string} file - The filename to deconstruct
 * @returns {FileParts} The filename parts
 * @throws {TypeError} If fileName is not a string.
 */
function deconstructFilenameToParts(file) {
  assert(file && typeof file === "string" && file.length,
    "file must be a non-zero length string")

  const {basename, dirname, extname} = path.parse(file)

  return {basename, dirname, extname}
}

/**
 * Retrieve all files matching a specific glob pattern.
 *
 * @param {string|string[]} glob - The glob pattern(s) to search.
 * @returns {Promise<Array<FileMap>>} A promise that resolves to an array of file objects
 * @throws {TypeError} If the input is not a string or array of strings.
 * @throws {Error} If the glob pattern array is empty or for other search failures.
 */
async function getFiles(glob) {
  assert(
    ((typeof glob === "string" && glob.length > 0) ||
    (Array.isArray(glob) && uniformStringArray(glob) && glob.length > 0)),
    "glob must be a non-empty string or array of strings.",
    1
  )

  const globbyArray = (
    typeof glob === "string"
      ? glob
        .split("|")
        .map(g => g.trim())
        .filter(Boolean)
      : glob
  ).map(g => fixSlashes(g))

  if(
    Array.isArray(globbyArray) &&
    uniformStringArray(globbyArray) &&
    !globbyArray.length
  )
    throw new Error(
      `Invalid glob pattern: Array must contain only strings. Got ${JSON.stringify(glob)}`,
    )

  // Use Globby to fetch matching files

  const filesArray = await globby(globbyArray)
  const files = filesArray.map(file => mapFilename(file))

  // Flatten the result and remove duplicates
  return files
}

/**
 * Checks if all elements in an array are strings.
 *
 * @param {Array} arr - The array to check.
 * @returns {boolean} Returns true if all elements are strings, false otherwise.
 * @example
 * uniformStringArray(['a', 'b', 'c']) // returns true
 * uniformStringArray(['a', 1, 'c']) // returns false
 */
function uniformStringArray(arr) {
  return Array.isArray(arr) && arr.every(item => typeof item === "string")
}

/**
 * Resolves a path to an absolute path
 *
 * @param {string} dir - The path to resolve
 * @returns {Promise<DirMap>} The directory object
 * @throws {TypeError} If directoryName is not a string.
 * @throws {Error} If the directory cannot be resolved.
 */
async function resolveDirectory(dir) {
  assert(dir && typeof dir === "string" && dir.length > 0, "dir must be a non-empty string", 1)

  const directoryObject = mapDirectory(dir)

  try {
    (await fs.opendir(directoryObject.absolutePath)).close()
  } catch(e) {
    throw new Error(
      `Failed to resolve directory '${directoryObject.absolutePath}', value passed: '${dir}'\n${e.message}`,
    )
  }

  return directoryObject
}

/**
 * Compose a directory map from a path
 *
 * @param {string} directory - The directory
 * @returns {DirMap} A directory object
 */
function composeDirectory(directory) {
  return mapDirectory(directory)
}

/**
 * Lists the contents of a directory.
 *
 * @param {string} directory - The directory to list.
 * @returns {Promise<{files: Array<FileMap>, directories: Array<DirMap>}>} The files and
 * directories in the directory.
 */
async function ls(directory) {
  const found = await fs.readdir(directory, {withFileTypes: true})
  const results = await Promise.all(
    found.map(async dirent => {
      const fullPath = path.join(directory, dirent.name)
      const stat = await fs.stat(fullPath)
      return {dirent, stat, fullPath}
    }),
  )

  const files = results
    .filter(({stat}) => stat.isFile())
    .map(({fullPath}) => mapFilename(fullPath))

  const directories = results
    .filter(({stat}) => stat.isDirectory())
    .map(({fullPath}) => mapDirectory(fullPath))

  return {files, directories}
}

/**
 * Reads the content of a file asynchronously.
 *
 * @param {FileMap} fileObject - The file map containing the file path
 * @returns {Promise<string>} The file contents
 */
async function readFile(fileObject) {
  const {absolutePath} = fileObject

  if(!absolutePath)
    throw new Error("No absolute path in file map")

  const content = await fs.readFile(absolutePath, "utf8")

  return content
}

/**
 * Writes content to a file synchronously.
 *
 * @param {FileMap} fileObject - The file map containing the file path
 * @param {string} content - The content to write
 */
async function writeFile(fileObject, content) {
  const absolutePath = fileObject.absolutePath

  if(!absolutePath)
    throw new Error("No absolute path in file map")

  await fs.writeFile(absolutePath, content, "utf8")
}

/**
 * Loads an object from JSON or YAML provided a fileMap
 *
 * @param {object} fileMap - The FileObj file to load containing
 *  JSON or YAML text.
 * @returns {object} The parsed data object.
 */
async function loadDataFile(fileMap) {
  const content = await readFile(fileMap)

  try {
    return JSON5.parse(content)
  } catch{
    try {
      return YAML.parse(content)
    } catch{
      throw new Error(`'${fileMap.path}' Content is neither valid JSON nor valid YAML`)
    }
  }
}

/**
 * Ensures a directory exists, creating it if necessary
 *
 * @async
 * @param {string} dir - The path or DirMap of the directory to assure exists
 * @param {object} [options] - Any options to pass to mkdir
 * @returns {Promise<DirMap>} A directory object for the assured directory
 * @throws {Error} If directory creation fails
 */
async function assureDirectory(dir, options = {}) {
  if(await directoryExists(dir))
    return await resolveDirectory(dir)

  try {
    await fs.mkdir(dir, options)

    return await resolveDirectory(dir)
  } catch(e) {
    throw new Error(`Unable to create directory '${dir}': ${e.message}`)
  }
}

export {
  // Constants
  fdTypes,
  // Functions
  assureDirectory,
  canReadFile,
  canWriteFile,
  composeDirectory,
  composeFilename,
  deconstructFilenameToParts,
  directoryExists,
  fileExists,
  fixSlashes,
  getFiles,
  ls,
  loadDataFile,
  mapDirectory,
  mapFilename,
  pathToUri,
  readFile,
  resolveDirectory,
  resolveFilename,
  uriToPath,
  writeFile,
}
