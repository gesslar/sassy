/**
 * @file Data utility functions for type checking, object manipulation, and array operations.
 * Provides comprehensive utilities for working with JavaScript data types and structures.
 */

import TypeSpec from "./Type.js"
import Sass from "./Sass.js"
import Valid from "./Valid.js"

export default class Data {
/**
 * Array of JavaScript primitive type names.
 * Includes basic types and object categories from the typeof operator.
 *
 * @type {string[]}
 */
  static primitives = Object.freeze([
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
  ])

  /**
   * Array of JavaScript constructor names for built-in objects.
   * Includes common object types and typed arrays.
   *
   * @type {string[]}
   */
  static constructors = Object.freeze([
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
  ])

  /**
   * Combined array of all supported data types (primitives and constructors in lowercase).
   * Used for type validation throughout the utility functions.
   *
   * @type {string[]}
   */
  static dataTypes = Object.freeze([
    ...Data.primitives,
    ...Data.constructors.map(c => c.toLowerCase())
  ])

  /**
   * Array of type names that can be checked for emptiness.
   * These types have meaningful empty states that can be tested.
   *
   * @type {string[]}
   */
  static emptyableTypes = Object.freeze(["string", "array", "object"])

  /**
   * Appends a string to another string if it does not already end with it.
   *
   * @param {string} string - The string to append to
   * @param {string} append - The string to append
   * @returns {string} The appended string
   */
  static appendString(string, append) {
    return string.endsWith(append) ? string : `${string}${append}`
  }

  /**
   * Prepends a string to another string if it does not already start with it.
   *
   * @param {string} string - The string to prepend to
   * @param {string} prepend - The string to prepend
   * @returns {string} The prepended string
   */
  static prependString(string, prepend) {
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
  static isArrayUniform(arr, type) {
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
  static isArrayUnique(arr) {
    return arr.filter((item, index, self) => self.indexOf(item) === index)
  }

  /**
   * Returns the intersection of two arrays.
   *
   * @param {Array} arr1 - The first array.
   * @param {Array} arr2 - The second array.
   * @returns {Array} The intersection of the two arrays.
   */
  static arrayIntersection(arr1, arr2) {
    const [short,long] = [arr1,arr2].sort((a,b) => a.length - b.length)

    return short.filter(value => long.includes(value))
  }

  /**
   * Checks whether two arrays have any elements in common.
   *
   * This function returns `true` if at least one element from `arr1` exists in
   * `arr2`, and `false` otherwise. It optimizes by iterating over the shorter
   * array for efficiency.
   *
   * Example:
   *   arrayIntersects([1, 2, 3], [3, 4, 5]) // returns true
   *   arrayIntersects(["a", "b"], ["c", "d"]) // returns false
   *
   * @param {Array} arr1 - The first array to check for intersection.
   * @param {Array} arr2 - The second array to check for intersection.
   * @returns {boolean} True if any element is shared between the arrays, false otherwise.
   */
  static arrayIntersects(arr1, arr2) {
    const [short,long] = [arr1,arr2].sort((a,b) => a.length - b.length)

    return !!short.find(value => long.includes(value))
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
  static arrayPad(arr, length, value, position = 0) {
    const diff = length - arr.length

    if(diff <= 0)
      return arr

    const padding = Array(diff).fill(value)

    if(position === 0)
    // prepend - default
      return padding.concat(arr)
    else if(position === -1)
    // append
      return arr.concat(padding) // somewhere in the middle - THAT IS ILLEGAL
    else
      throw Sass.new("Invalid position")
  }

  /**
   * Clones an object
   *
   * @param {object} obj - The object to clone
   * @param {boolean} freeze - Whether to freeze the cloned object
   * @returns {object} The cloned object
   */
  static cloneObject(obj, freeze = false) {
    const result = {}

    for(const [key, value] of Object.entries(obj)) {
      if(Data.isType(value, "object"))
        result[key] = Data.cloneObject(value)
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
  static async allocateObject(source, spec) {
  // Data
    const workSource = [],
      workSpec = [],
      result = {}

    if(!Data.isType(source, "array", {allowEmpty: false}))
      throw Sass.new("Source must be an array.")

    workSource.push(...source)

    if(
      !Data.isType(spec, "array", {allowEmpty: false}) &&
      !Data.isType(spec, "function")
    )
      throw Sass.new("Spec must be an array or a function.")

    if(Data.isType(spec, "function")) {
      const specResult = await spec(workSource)

      if(!Data.isType(specResult, "array"))
        throw Sass.new("Spec resulting from function must be an array.")

      workSpec.push(...specResult)
    } else if(Data.isType(spec, "array", {allowEmpty: false})) {
      workSpec.push(...spec)
    }

    if(workSource.length !== workSpec.length)
      throw Sass.new("Source and spec must have the same number of elements.")

    // Objects must always be indexed by strings.
    workSource.map((element, index, arr) => (arr[index] = String(element)))

    // Check that all keys are strings
    if(!Data.isArrayUniform(workSource, "string"))
      throw Sass.new("Indices of an Object must be of type string.")

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
  static async mapObject(original, transformer, mutate = false) {
    Valid.validType(original, "object", {allowEmpty: true})
    Valid.validType(transformer, "function")
    Valid.validType(mutate, "boolean")

    const result = mutate ? original : {}

    for(const [key, value] of Object.entries(original))
      result[key] = Data.isType(value, "object")
        ? await Data.mapObject(value, transformer, mutate)
        : (result[key] = await transformer(key, value))

    return result
  }

  /**
   * Checks if an object is empty
   *
   * @param {object} obj - The object to check
   * @returns {boolean} Whether the object is empty
   */
  static isObjectEmpty(obj) {
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
  static newTypeSpec(string, options) {
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
  static isType(value, type, options = {}) {
    const typeSpec = type instanceof TypeSpec
      ? type
      : Data.newTypeSpec(type, options)

    return typeSpec.match(value, options)
  }

  /**
   * Checks if a type is valid
   *
   * @param {string} type - The type to check
   * @returns {boolean} Whether the type is valid
   */
  static isValidType(type) {
    return Data.dataTypes.includes(type)
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
  static isBaseType(value, type) {
    if(!Data.isValidType(type))
      return false

    const valueType = Data.typeOf(value)

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
  static typeOf(value) {
    return Array.isArray(value) ? "array" : typeof value
  }

  /**
   * Checks a value is undefined or null.
   *
   * @param {any} value The value to check
   * @returns {boolean} Whether the value is undefined or null
   */
  static isNothing(value) {
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
  static isEmpty(value, checkForNothing = true) {
    const type = Data.typeOf(value)

    if(checkForNothing && Data.isNothing(value))
      return true

    if(!Data.emptyableTypes.includes(type))
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
  static deepFreezeObject(obj) {
    if(obj === null || typeof obj !== "object")
      return obj // Skip null and non-objects

    // Retrieve and freeze properties
    const propNames = Object.getOwnPropertyNames(obj)

    for(const name of propNames) {
      const value = obj[name]

      // Recursively freeze nested objects
      if(value && typeof value === "object")
        Data.deepFreezeObject(value)
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
  static assureObjectPath(obj, keys) {
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
  static setNestedValue(obj, keys, value) {
    const nested = Data.assureObjectPath(obj, keys.slice(0, -1))

    nested[keys[keys.length-1]] = value
  }

  /**
   * Deeply merges two or more objects. Arrays are replaced, not merged.
   *
   * @param {...object} sources - Objects to merge (left to right)
   * @returns {object} The merged object
   */
  static mergeObject(...sources) {
    const isObject = obj => obj && typeof obj === "object" && !Array.isArray(obj)

    return sources.reduce((acc, obj) => {
      if(!isObject(obj))
        return acc

      Object.keys(obj).forEach(key => {
        const accVal = acc[key]
        const objVal = obj[key]

        if(isObject(accVal) && isObject(objVal))
          acc[key] = Data.mergeObject(accVal, objVal)
        else
          acc[key] = objVal
      })

      return acc
    }, {})
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
  static uniformStringArray(arr) {
    return Array.isArray(arr) && arr.every(item => typeof item === "string")
  }

  /**
   * Filters an array asynchronously using a predicate function.
   * Applies the predicate to all items in parallel and returns filtered results.
   *
   * @param {Array} arr - The array to filter
   * @param {Function} predicate - Async predicate function that returns a promise resolving to boolean
   * @returns {Promise<Array>} Promise resolving to the filtered array
   */
  static async asyncFilter(arr, predicate) {
    const results = await Promise.all(arr.map(predicate))

    return arr.filter((_, index) => results[index])
  }

}
