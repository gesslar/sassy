import fs from "node:fs/promises"
import path from "node:path"
import {fileURLToPath} from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Test utilities for the sassy test suite
 */
export class TestUtils {
  /**
   * Get the absolute path to the test fixtures directory
   *
   * @returns {string} Path to fixtures directory
   */
  static getFixturesPath() {
    return path.resolve(__dirname, "../fixtures")
  }

  /**
   * Get the absolute path to the examples directory
   *
   * @returns {string} Path to examples directory
   */
  static getExamplesPath() {
    return path.resolve(__dirname, "../../examples")
  }

  /**
   * Get the absolute path to a test file in the fixtures directory
   *
   * @param {string} filename - Name of the fixture file
   * @returns {string} Full path to the fixture file
   */
  static getFixturePath(filename) {
    return path.join(this.getFixturesPath(), filename)
  }

  /**
   * Get the absolute path to an example file
   *
   * @param {string} filename - Name of the example file
   * @returns {string} Full path to the example file
   */
  static getExamplePath(filename) {
    return path.join(this.getExamplesPath(), filename)
  }

  /**
   * Create a temporary testing directory
   *
   * @param {string} name - Name of the testing directory
   * @returns {Promise<string>} Path to the created directory
   */
  static async createTestDir(name) {
    const testDir = path.join(this.getFixturesPath(), name)
    await fs.mkdir(testDir, {recursive: true})

    return testDir
  }

  /**
   * Clean up a testing directory
   *
   * @param {string} dirPath - Path to directory to clean up
   * @returns {Promise<void>}
   */
  static async cleanupTestDir(dirPath) {
    try {
      await fs.rm(dirPath, {recursive: true, force: true})
    } catch(error) {
      // Ignore cleanup errors in tests
      console.warn(`Warning: Could not clean up test directory ${dirPath}:`, error.message)
    }
  }

  /**
   * Create a test file with content
   *
   * @param {string} filePath - Path where to create the file
   * @param {string} content - Content to write to the file
   * @returns {Promise<void>}
   */
  static async createTestFile(filePath, content) {
    await fs.mkdir(path.dirname(filePath), {recursive: true})
    await fs.writeFile(filePath, content, "utf8")
  }

  /**
   * Read a test file
   *
   * @param {string} filePath - Path to the file
   * @returns {Promise<string>} File contents
   */
  static async readTestFile(filePath) {
    return await fs.readFile(filePath, "utf8")
  }

  /**
   * Assert that an error is of expected type and contains expected message
   *
   * @param {Error} error - The error to check
   * @param {new (...args: Array<unknown>) => Error} expectedType - Expected error constructor
   * @param {string|RegExp} [expectedMessage] - Expected message or pattern
   */
  static assertError(error, expectedType, expectedMessage) {
    if(!(error instanceof expectedType)) {
      throw new Error(`Expected error of type ${expectedType.name}, got ${error.constructor.name}`)
    }

    if(expectedMessage) {
      if(typeof expectedMessage === "string") {
        if(!error.message.includes(expectedMessage)) {
          throw new Error(`Expected error message to contain "${expectedMessage}", got "${error.message}"`)
        }
      } else if(expectedMessage instanceof RegExp) {
        if(!expectedMessage.test(error.message)) {
          throw new Error(`Expected error message to match ${expectedMessage}, got "${error.message}"`)
        }
      }
    }
  }

  /**
   * Sleep for a specified number of milliseconds
   *
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  static async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
