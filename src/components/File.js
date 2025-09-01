/**
 * @file File system utilities for reading, writing, and manipulating files and directories.
 * Provides comprehensive file operations including data file loading (JSON5/YAML),
 * path resolution, and file system navigation with support for both files and directories.
 */

import * as fs from "node:fs/promises"
import path from "node:path"
import {globby} from "globby"
import JSON5 from "json5"
import YAML from "yaml"
import {fileURLToPath, pathToFileURL} from "node:url"

import {assert} from "./Valid.js"
import FileObject from "./FileObject.js"
import DirectoryObject from "./DirectoryObject.js"
import {uniformStringArray} from "./DataUtil.js"
import AuntyError from "./AuntyError.js"

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
 * @param {FileObject} file - The file map to check
 * @returns {Promise<boolean>} Whether the file can be read
 */
async function canReadFile(file) {
  try {
    await fs.access(file.path, fs.constants.R_OK)
    return true
  } catch(_) {
    return false
  }
}

/**
 * Check if a file can be written. Returns true if the file can be written,
 *
 * @param {FileObject} file - The file map to check
 * @returns {Promise<boolean>} Whether the file can be written
 */
async function canWriteFile(file) {
  try {
    await fs.access(file.path, fs.constants.W_OK)
    return true
  } catch(_error) {
    return false
  }
}

/**
 * Check if a file exists
 *
 * @param {FileObject} file - The file map to check
 * @returns {Promise<boolean>} Whether the file exists
 */
async function fileExists(file) {
  try {
    await fs.access(file.path, fs.constants.R_OK)
    return true
  } catch(_) {
    return false
  }
}

/**
 * Determines the size of a file.
 *
 * @param {FileObject} file - The file object to test
 * @returns {Promise<number?>} - The size of the file or null, if it doesn't exist.
 */
async function fileSize(file) {
  try {
    const stat = await fs.stat(file.path)
    return stat.size
  } catch(_) {
    return null
  }
}

/**
 * Gets the last modification time of a file.
 * Used by the caching system to determine if cached data is still valid.
 *
 * @param {FileObject} file - The file object to check
 * @returns {Promise<Date|null>} The last modification time, or null if file doesn't exist
 */
async function fileModified(file) {
  try {
    const stat = await fs.stat(file.path)
    return stat.mtime
  } catch(_) {
    return null
  }
}

/**
 * Check if a directory exists
 *
 * @param {DirectoryObject} dirObject - The directory map to check
 * @returns {Promise<boolean>} Whether the directory exists
 */
async function directoryExists(dirObject) {
  try {
    (await fs.opendir(dirObject.path)).close()

    return true
  } catch(_) {
    return false
  }
}

/**
 * Convert a URI to a path
 *
 * @param {string} pathName - The URI to convert
 * @returns {string} The path
 */
function uriToPath(pathName) {
  try {
    return fileURLToPath(pathName)
  } catch(_) {
    return pathName
  }
}

/**
 * @typedef {object} FileParts
 * @property {string} base - The file name with extension
 * @property {string} dir - The directory path
 * @property {string} ext - The file extension (including dot)
 */

/**
 * Deconstruct a filename into parts
 *
 * @param {string} fileName - The filename to deconstruct
 * @returns {FileParts} The filename parts
 */
function deconstructFilenameToParts(fileName) {
  assert(typeof fileName === "string" && fileName.length > 0,
    "file must be a non-zero length string", 1)

  return path.parse(fileName)
}

/**
 * Retrieve all files matching a specific glob pattern.
 *
 * @param {string|string[]} glob - The glob pattern(s) to search.
 * @returns {Promise<Array<FileObject>>} A promise that resolves to an array of file objects
 * @throws {AuntyError} If the input is not a string or array of strings.
 * @throws {AuntyError} If the glob pattern array is empty or for other search failures.
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
    throw AuntyError.new(
      `Invalid glob pattern: Array must contain only strings. Got ${JSON.stringify(glob)}`,
    )

  // Use Globby to fetch matching files

  const filesArray = await globby(globbyArray)
  const files = filesArray.map(file => new FileObject(file))

  // Flatten the result and remove duplicates
  return files
}

/**
 * Lists the contents of a directory.
 *
 * @param {string} directory - The directory to list.
 * @returns {Promise<{files: Array<FileObject>, directories: Array<DirectoryObject>}>} The files and
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
    .map(({fullPath}) => new FileObject(fullPath))

  const directories = results
    .filter(({stat}) => stat.isDirectory())
    .map(({fullPath}) => new DirectoryObject(fullPath))

  return {files, directories}
}

/**
 * Reads the content of a file asynchronously.
 *
 * @param {FileObject} fileObject - The file map containing the file path
 * @returns {Promise<string>} The file contents
 */
async function readFile(fileObject) {
  const filePath = fileObject.path

  if(!(await fileObject.exists))
    throw AuntyError.new(`No such file '${filePath}'`)

  if(!filePath)
    throw AuntyError.new("No absolute path in file map")

  return await fs.readFile(filePath, "utf8")
}

/**
 * Writes content to a file synchronously.
 *
 * @param {FileObject} fileObject - The file map containing the file path
 * @param {string} content - The content to write
 */
async function writeFile(fileObject, content) {
  if(!fileObject.path)
    throw AuntyError.new("No absolute path in file")

  await fs.writeFile(fileObject.path, content, "utf8")
}

/**
 * Loads an object from JSON or YAML provided a fileMap
 *
 * @param {FileObject} fileObject - The FileObj file to load containing
 *  JSON or YAML text.
 * @returns {object} The parsed data object.
 */
async function loadDataFile(fileObject) {
  const content = await readFile(fileObject)

  try {
    return JSON5.parse(content)
  } catch{
    try {
      return YAML.parse(content)
    } catch{
      throw AuntyError.new(`Content is neither valid JSON nor valid YAML:\n'${fileObject.path}'`)
    }
  }
}

/**
 * Ensures a directory exists, creating it if necessary
 *
 * @async
 * @param {DirectoryObject} dirObject - The path or DirMap of the directory to assure exists
 * @param {object} [options] - Any options to pass to mkdir
 * @returns {Promise<boolean>} True if directory exists, false otherwise
 * @throws {AuntyError} If directory creation fails
 */
async function assureDirectory(dirObject, options = {}) {
  if(await dirObject.exists)
    return true

  try {
    await fs.mkdir(dirObject.path, options)
  } catch(e) {
    throw AuntyError.new(`Unable to create directory '${dirObject.path}': ${e.message}`)
  }

  return dirObject.exists
}

/**
 * Computes the relative path from one file or directory to another.
 *
 * If the target is outside the source (i.e., the relative path starts with ".."),
 * returns the absolute path to the target instead.
 *
 * @param {FileObject|DirectoryObject} from - The source file or directory object
 * @param {FileObject|DirectoryObject} to - The target file or directory object
 * @returns {string} The relative path from `from` to `to`, or the absolute path if not reachable
 */
function relativeOrAbsolutePath(from, to) {
  const relative = path.relative(from.path, to.path)

  return relative.startsWith("..")
    ? to.path
    : relative
}

export {
  // Functions
  assureDirectory,
  canReadFile,
  canWriteFile,
  deconstructFilenameToParts,
  directoryExists,
  fileExists,
  fileModified,
  fileSize,
  fixSlashes,
  getFiles,
  loadDataFile,
  ls,
  pathToUri,
  readFile,
  relativeOrAbsolutePath,
  uriToPath,
  writeFile,
}
