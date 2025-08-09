/**
 * @file Data utility functions for type checking, object manipulation, and array operations.
 * Provides comprehensive utilities for working with JavaScript data types and structures.
 */

import TypeSpec from "./Type.js"

import * as ValidUtil from "./Valid.js"

const {validType} = ValidUtil

/**
 * Array of JavaScript primitive type names.
 * Includes basic types and object categories from the typeof operator.
 *
 * @type {string[]}
 */
const primitives = [
  // Primitives
  "undefined",
  "boolean",
  "number",
  "bigint",
  "string",
  "symbol",

  // Object Categories from typeof
  "object",
  "function",
]

/**
 * Array of JavaScript constructor names for built-in objects.
 * Includes common object types and typed arrays.
 *
 * @type {string[]}
 */
const constructors = [
  // Object Constructors
  "Object",
  "Array",
  "Function",
  "Date",
  "RegExp",
  "Error",
  "Map",
  "Set",
  "WeakMap",
  "WeakSet",
  "Promise",
  "Int8Array",
  "Uint8Array",
  "Float32Array",
  "Float64Array",
]

/**
 * Combined array of all supported data types (primitives and constructors in lowercase).
 * Used for type validation throughout the utility functions.
 *
 * @type {string[]}
 */
const dataTypes = [...primitives, ...constructors.map(c => c.toLowerCase())]

/**
 * Array of type names that can be checked for emptiness.
 * These types have meaningful empty states that can be tested.
 *
 * @type {string[]}
 */
const emptyableTypes = ["string", "array", "object"]

/**
 * Appends a string to another string if it does not already end with it.
 *
 * @param {string} string - The string to append to
 * @param {string} append - The string to append
 * @returns {string} The appended string
 */
function appendString(string, append) {
  return string.endsWith(append) ? string : `${string}${append}`
}

/**
 * Prepends a string to another string if it does not already start with it.
 *
 * @param {string} string - The string to prepend to
 * @param {string} prepend - The string to prepend
 * @returns {string} The prepended string
 */
function prependString(string, prepend) {
  return string.startsWith(prepend) ? string : `${prepend}${string}`
}

/**
 * Checks if all elements in an array are of a specified type
 *
 * @param {Array} arr - The array to check
 * @param {string} type - The type to check for (optional, defaults to the
 *                        type of the first element)
 * @returns {boolean} Whether all elements are of the specified type
 */
function isArrayUniform(arr, type) {
  return arr.every(
    (item, _index, arr) => typeof item === (type || typeof arr[0]),
  )
}

/**
 * Checks if an array is unique
 *
 * @param {Array} arr - The array of which to remove duplicates
 * @returns {Array} The unique elements of the array
 */
function isArrayUnique(arr) {
  return arr.filter((item, index, self) => self.indexOf(item) === index)
}

/**
 * Returns the intersection of two arrays.
 *
 * @param {Array} arr1 - The first array.
 * @param {Array} arr2 - The second array.
 * @returns {Array} The intersection of the two arrays.
 */
function arrayIntersection(arr1, arr2) {
  return arr1.filter(value => arr2.includes(value))
}

/**
 * Pads an array to a specified length with a value. This operation
 * occurs in-place.
 *
 * @param {Array} arr - The array to pad.
 * @param {number} length - The length to pad the array to.
 * @param {any} value - The value to pad the array with.
 * @param {number} position - The position to pad the array at.
 * @returns {Array} The padded array.
 */
function arrayPad(arr, length, value, position = 0) {
  const diff = length - arr.length
  if(diff <= 0) return arr

  const padding = Array(diff).fill(value)

  if(position === 0)
    // prepend - default
    return padding.concat(arr)
  else if(position === -1)
    // append
    return arr.concat(padding) // somewhere in the middle - THAT IS ILLEGAL
  else throw new SyntaxError("Invalid position")
}

/**
 * Clones an object
 *
 * @param {object} obj - The object to clone
 * @param {boolean} freeze - Whether to freeze the cloned object
 * @returns {object} The cloned object
 */
function cloneObject(obj, freeze = false) {
  const result = {}

  for(const [key, value] of Object.entries(obj)) {
    if(isType(value, "object"))
      result[key] = cloneObject(value)
    else
      result[key] = value
  }

  return freeze ? Object.freeze(result) : result
}

/**
 * Allocates an object from a source array and a spec array or function.
 *
 * @param {any} source The source array
 * @param {any|Function} spec The spec array or function
 * @returns {Promise<object>} The allocated object
 */
async function allocateObject(source, spec) {
  // Data
  const workSource = [],
    workSpec = [],
    result = {}

  if(!isType(source, "array", {allowEmpty: false}))
    throw new Error("Source must be an array.")

  workSource.push(...source)

  if(
    !isType(spec, "array", {allowEmpty: false}) &&
    !isType(spec, "function")
  )
    throw new Error("Spec must be an array or a function.")

  if(isType(spec, "function")) {
    const specResult = await spec(workSource)

    if(!isType(specResult, "array"))
      throw new Error("Spec resulting from function must be an array.")

    workSpec.push(...specResult)
  } else if(isType(spec, "array", {allowEmpty: false})) {
    workSpec.push(...spec)
  }

  if(workSource.length !== workSpec.length)
    throw new Error("Source and spec must have the same number of elements.")

  // Objects must always be indexed by strings.
  workSource.map((element, index, arr) => (arr[index] = String(element)))

  // Check that all keys are strings
  if(!isArrayUniform(workSource, "string"))
    throw new Error("Indices of an Object must be of type string.")

  workSource.forEach((element, index) => (result[element] = workSpec[index]))

  return result
}

/**
 * Maps an object using a transformer function
 *
 * @param {object} original The original object
 * @param {Function} transformer The transformer function
 * @param {boolean} mutate Whether to mutate the original object
 * @returns {Promise<object>} The mapped object
 */
async function mapObject(original, transformer, mutate = false) {
  validType(original, "object", true)
  validType(transformer, "function")
  validType(mutate, "boolean")

  const result = mutate ? original : {}

  for(const [key, value] of Object.entries(original))
    result[key] = isType(value, "object")
      ? await mapObject(value, transformer, mutate)
      : (result[key] = await transformer(key, value))

  return result
}

/**
 * Checks if an object is empty
 *
 * @param {object} obj - The object to check
 * @returns {boolean} Whether the object is empty
 */
function isObjectEmpty(obj) {
  return Object.keys(obj).length === 0
}

/**
 * Creates a type spec from a string. A type spec is an array of objects
 * defining the type of a value and whether an array is expected.
 *
 * @param {string} string - The string to parse into a type spec.
 * @param {object} options - Additional options for parsing.
 * @returns {object[]} An array of type specs.
 */
function newTypeSpec(string, options) {
  return new TypeSpec(string, options)
}

/**
 * Checks if a value is of a specified type
 *
 * @param {any} value The value to check
 * @param {string|TypeSpec} type The type to check for
 * @param {object} options Additional options for checking
 * @returns {boolean} Whether the value is of the specified type
 */
function isType(value, type, options = {}) {
  const typeSpec = type instanceof TypeSpec ? type : newTypeSpec(type, options)
  // we're comparing a typeSpec object to a File object. this will always
  // return false. do fix.
  return typeSpec.match(value, options)
}

/**
 * Checks if a type is valid
 *
 * @param {string} type - The type to check
 * @returns {boolean} Whether the type is valid
 */
function isValidType(type) {
  return dataTypes.includes(type)
}

/**
 * Checks if a value is of a specified type. Unlike the type function, this
 * function does not parse the type string, and only checks for primitive
 * or constructor types.
 *
 * @param {any} value - The value to check
 * @param {string} type - The type to check for
 * @returns {boolean} Whether the value is of the specified type
 */
function isBaseType(value, type) {
  if(!isValidType(type))
    return false

  const valueType = typeOf(value)

  switch(type.toLowerCase()) {
    case "array":
      return Array.isArray(value) // Native array check
    case "string":
      return valueType === "string"
    case "boolean":
      return valueType === "boolean"
    case "number":
      return valueType === "number" && !isNaN(value) // Excludes NaN
    case "object":
      return value !== null && valueType === "object" && !Array.isArray(value) // Excludes arrays and null
    case "function":
      return valueType === "function"
    case "symbol":
      return valueType === "symbol" // ES6 Symbol type
    case "bigint":
      return valueType === "bigint" // BigInt support
    case "null":
      return value === null // Explicit null check
    case "undefined":
      return valueType === "undefined" // Explicit undefined check
    default:
      return false // Unknown type
  }
}

/**
 * Returns the type of a value, whether it be a primitive, object, or function.
 *
 * @param {any} value - The value to check
 * @returns {string} The type of the value
 */
function typeOf(value) {
  return Array.isArray(value) ? "array" : typeof value
}

/**
 * Checks a value is undefined or null.
 *
 * @param {any} value The value to check
 * @returns {boolean} Whether the value is undefined or null
 */
function isNothing(value) {
  return value === undefined || value === null
}

/**
 * Checks if a value is empty. This function is used to check if an object,
 * array, or string is empty. Null and undefined values are considered empty.
 *
 * @param {any} value The value to check
 * @param {boolean} checkForNothing Whether to check for null or undefined
 *                                  values
 * @returns {boolean} Whether the value is empty
 */
function isEmpty(value, checkForNothing = true) {
  const type = typeOf(value)

  if(checkForNothing && isNothing(value))
    return true

  if(!emptyableTypes.includes(type))
    return false

  switch(type) {
    case "array":
      return value.length === 0
    case "object":
      return Object.keys(value).length === 0
    case "string":
      return value.trim().length === 0
    default:
      return false
  }
}

/**
 * Freezes an object and all of its properties recursively.
 *
 * @param {object} obj The object to freeze.
 * @returns {object} The frozen object.
 */
function deepFreezeObject(obj) {
  if(obj === null || typeof obj !== "object")
    return obj // Skip null and non-objects

  // Retrieve and freeze properties
  const propNames = Object.getOwnPropertyNames(obj)

  for(const name of propNames) {
    const value = obj[name]

    // Recursively freeze nested objects
    if(value && typeof value === "object")
      deepFreezeObject(value)
  }

  // Freeze the object itself
  return Object.freeze(obj)
}

/**
 * Ensures that a nested path of objects exists within the given object.
 * Creates empty objects along the path if they don't exist.
 *
 * @param {object} obj - The object to check/modify
 * @param {Array<string>} keys - Array of keys representing the path to ensure
 * @returns {object} Reference to the deepest nested object in the path
 */
function assureObjectPath(obj, keys) {
  let current = obj  // a moving reference to internal objects within obj
  const len = keys.length
  for(let i = 0; i < len; i++) {
    const elem = keys[i]
    if(!current[elem])
      current[elem] = {}

    current = current[elem]
  }

  // Return the current pointer
  return current
}

/**
 * Sets a value in a nested object structure using an array of keys; creating
 * the structure if it does not exist.
 *
 * @param {object} obj - The target object to set the value in
 * @param {string[]} keys - Array of keys representing the path to the target property
 * @param {*} value - The value to set at the target location
 */
function setNestedValue(obj, keys, value) {
  const nested = assureObjectPath(obj, keys.slice(0, -1))

  nested[keys[keys.length-1]] = value
}

/**
 * Deeply merges two or more objects. Arrays are replaced, not merged.
 *
 * @param {...object} sources - Objects to merge (left to right)
 * @returns {object} The merged object
 */
function mergeObject(...sources) {
  const isObject = obj => obj && typeof obj === "object" && !Array.isArray(obj)
  return sources.reduce((acc, obj) => {
    if(!isObject(obj))
      return acc

    Object.keys(obj).forEach(key => {
      const accVal = acc[key]
      const objVal = obj[key]

      if(isObject(accVal) && isObject(objVal))
        acc[key] = mergeObject(accVal, objVal)
      else
        acc[key] = objVal
    })

    return acc
  }, {})
}

export {
  // Classes
  TypeSpec,
  // Variables
  dataTypes,
  emptyableTypes,
  // Functions
  allocateObject,
  appendString,
  arrayIntersection,
  arrayPad,
  assureObjectPath,
  cloneObject,
  deepFreezeObject,
  isArrayUniform,
  isArrayUnique,
  isBaseType,
  isEmpty,
  isNothing,
  isObjectEmpty,
  isType,
  isValidType,
  mapObject,
  newTypeSpec,
  prependString,
  setNestedValue,
  typeOf,
  mergeObject,
}
