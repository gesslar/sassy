/**
 * @file Type specification and validation utilities.
 * Provides TypeSpec class for parsing and validating complex type specifications
 * including arrays, unions, and options.
 */

import * as DataUtil from "./DataUtil.js"
import AuntyError from "./AuntyError.js"

const {isEmpty, typeOf, isArrayUniform, isValidType} = DataUtil

/**
 * Type specification class for parsing and validating complex type definitions.
 * Supports union types, array types, and validation options.
 */
export default class TypeSpec {
  #specs

  /**
   * Creates a new TypeSpec instance.
   *
   * @param {string} string - The type specification string (e.g., "string|number", "object[]")
   * @param {object} options - Additional parsing options
   */
  constructor(string, options) {
    this.#specs = []
    this.#parse(string, options)
    Object.freeze(this.#specs)
    this.specs = this.#specs
    this.length = this.#specs.length
    this.stringRepresentation = this.toString()
    Object.freeze(this)
  }

  /**
   * Returns a string representation of the type specification.
   *
   * @returns {string} The type specification as a string (e.g., "string|number[]")
   */
  toString() {
    return this.#specs
      .map(spec => {
        return `${spec.typeName}${spec.array ? "[]" : ""}`
      })
      .join("|")
  }

  /**
   * Returns a JSON representation of the TypeSpec.
   *
   * @returns {object} Object containing specs, length, and string representation
   */
  toJSON() {
    // Serialize as a string representation or as raw data
    return {
      specs: this.#specs,
      length: this.length,
      stringRepresentation: this.toString(),
    }
  }

  /**
   * Executes a provided function once for each type specification.
   *
   * @param {Function} callback - Function to execute for each spec
   */
  forEach(callback) {
    this.#specs.forEach(callback)
  }

  /**
   * Tests whether all type specifications pass the provided test function.
   *
   * @param {Function} callback - Function to test each spec
   * @returns {boolean} True if all specs pass the test
   */
  every(callback) {
    return this.#specs.every(callback)
  }

  /**
   * Tests whether at least one type specification passes the provided test function.
   *
   * @param {Function} callback - Function to test each spec
   * @returns {boolean} True if at least one spec passes the test
   */
  some(callback) {
    return this.#specs.some(callback)
  }

  /**
   * Creates a new array with all type specifications that pass the provided test function.
   *
   * @param {Function} callback - Function to test each spec
   * @returns {Array} New array with filtered specs
   */
  filter(callback) {
    return this.#specs.filter(callback)
  }

  /**
   * Creates a new array populated with the results of calling the provided function on every spec.
   *
   * @param {Function} callback - Function to call on each spec
   * @returns {Array} New array with mapped values
   */
  map(callback) {
    return this.#specs.map(callback)
  }

  /**
   * Executes a reducer function on each spec, resulting in a single output value.
   *
   * @param {Function} callback - Function to execute on each spec
   * @param {*} initialValue - Initial value for the accumulator
   * @returns {*} The final accumulated value
   */
  reduce(callback, initialValue) {
    return this.#specs.reduce(callback, initialValue)
  }

  /**
   * Returns the first type specification that satisfies the provided testing function.
   *
   * @param {Function} callback - Function to test each spec
   * @returns {object|undefined} The first spec that matches, or undefined
   */
  find(callback) {
    return this.#specs.find(callback)
  }

  /**
   * Tests whether a value matches any of the type specifications.
   * Handles array types, union types, and empty value validation.
   *
   * @param {*} value - The value to test against the type specifications
   * @param {object} options - Validation options
   * @param {boolean} options.allowEmpty - Whether empty values are allowed
   * @returns {boolean} True if the value matches any type specification
   */
  match(value, options) {
    const allowEmpty = options?.allowEmpty ?? true
    const empty = isEmpty(value)

    // If we have a list of types, because the string was validly parsed,
    // we need to ensure that all of the types that were parsed are valid types
    // in JavaScript.
    if(this.length && !this.every(t => isValidType(t.typeName)))
      return false

    // Now, let's do some checking with the types, respecting the array flag
    // with the value
    const valueType = typeOf(value)
    const isArray = valueType === "array"

    // We need to ensure that we match the type and the consistency of the types
    // in an array, if it is an array and an array is allowed.
    const matchingTypeSpec = this.filter(spec => {
      const {typeName: allowedType, array: allowedArray} = spec

      if(valueType === allowedType && !isArray && !allowedArray)
        return !allowEmpty ? !empty : true

      if(isArray) {
        if(allowedType === "array")
          if(!allowedArray)
            return true

        if(empty)
          if(allowEmpty)
            return true

        return isArrayUniform(value, allowedType)
      }
    })

    return matchingTypeSpec.length > 0
  }

  /**
   * Parses a type specification string into individual type specs.
   * Handles union types separated by delimiters and array notation.
   *
   * @private
   * @param {string} string - The type specification string to parse
   * @param {object} options - Parsing options
   * @param {string} options.delimiter - The delimiter for union types
   * @throws {TypeError} If the type specification is invalid
   */
  #parse(string, options) {
    const delimiter = options?.delimiter ?? "|"
    const parts = string.split(delimiter)

    this.#specs = parts.map(part => {
      const typeMatches = /(\w+)(\[\])?/.exec(part)
      if(!typeMatches || typeMatches.length !== 3)
        throw AuntyError.new(`Invalid type: ${part}`)

      if(!isValidType(typeMatches[1]))
        throw AuntyError.new(`Invalid type: ${typeMatches[1]}`)

      return {
        typeName: typeMatches[1],
        array: typeMatches[2] === "[]",
      }
    })
  }
}
