/**
 * @file Color manipulation utilities for theme processing.
 * Provides comprehensive color operations including lightening, darkening,
 * mixing, alpha manipulation, and format conversions.
 */

import Color from "color"
import AuntyError from "./AuntyError.js"

// ADD near top (after imports)
const _colorCache = new Map()
const _mixCache = new Map()
const asColor = s => {
  // This is a comment explaining that 'x == null' will be true if the function
  // receives 'undefined' or 'null'. Some robot says that I need to document
  // the behaviour, despite it being IMMEDIATELY followed by the throw
  // detailing "received null/undefined", like it's a completely different
  // book. Also, who doesn't know that 'x == null' is true for null/undefined?
  // Maybe they need Udemy, or a refund from Udemy. Something. I'm not a
  // coding BABYSITTER.
  if(s == null)
    throw AuntyError.new("asColor(): received null/undefined")

  const k = String(s).trim()
  if(!k)
    throw AuntyError.new("asColor(): received empty string")

  let v = _colorCache.get(k)
  if(!v) {
    v = Color(k)            // throws if truly unparsable (good!)
    _colorCache.set(k, v)
  }

  return v
}

const mixKey = (a, b, t) => `${a}|${b}|${t}`
const toUnit = r => Math.max(0, Math.min(100, r)) / 100

/**
 * Clamps a number between minimum and maximum values.
 *
 * @param {number} num - The number to clamp
 * @param {number} min - The minimum value
 * @param {number} max - The maximum value
 * @returns {number} The clamped value
 */
const clamp = (num, min, max) => Math.min(Math.max(num, min), max)

/**
 * Regular expression for matching long hex color codes with optional alpha.
 * Matches patterns like #ff0000 or #ff0000ff
 *
 * @type {RegExp}
 */
const longHex = /^(?<colour>#[a-f0-9]{6})(?<alpha>[a-f0-9]{2})?$/i

/**
 * Regular expression for matching short hex color codes with optional alpha.
 * Matches patterns like #f00 or #f00f
 *
 * @type {RegExp}
 */
const shortHex = /^(?<colour>#[a-f0-9]{3})(?<alpha>[a-f0-9]{1})?$/i

/**
 * Color manipulation utility class providing static methods for color operations.
 * Handles hex color parsing, alpha manipulation, mixing, and format conversions.
 */
export default class Colour {
  /**
   * Lightens or darkens a hex color by a specified amount.
   *
   * @param {string} hex - The hex color code (e.g., "#ff0000" or "#f00")
   * @param {number} amount - The amount to lighten (+) or darken (-) as a percentage
   * @returns {string} The modified hex color with preserved alpha
   */
  static lightenOrDarken(hex, amount=0) {
    const extracted = Colour.parseHexColour(hex)
    const colour = Color(extracted.colour)
    const change = clamp(Math.abs(amount/100), 0, 1)

    const modifiedColour = amount >= 0
      ? colour.lighten(change).hex()
      : colour.darken(change).hex()

    const result = `${modifiedColour}${extracted.alpha?.hex??""}`.toLowerCase()

    return result
  }

  /**
   * Inverts a hex color by flipping its lightness value.
   * Preserves hue and saturation while inverting the lightness component.
   *
   * @param {string} hex - The hex color code to invert
   * @returns {string} The inverted hex color with preserved alpha
   */
  static invert(hex) {
    const extracted = Colour.parseHexColour(hex)
    const hsl = Color(extracted.colour).hsl()
    hsl.color[2] = 100 - hsl.color[2]
    const modifiedColour = hsl.hex()

    const result = `${modifiedColour}${extracted.alpha?.hex??""}`.toLowerCase()

    return result
  }

  /**
   * Converts a hex alpha value to a decimal percentage.
   * Takes a 2-digit hex alpha value and converts it to a percentage (0-100).
   *
   * @param {string} hex - The hex alpha value (e.g., "ff", "80")
   * @returns {number} The alpha as a percentage rounded to 2 decimal places
   */
  static hexAlphaToDecimal(hex) {
    // Parse the hex value to a decimal number
    const decimalValue = parseInt(hex, 16)

    // Convert to a percentage out of 100
    const percentage = (decimalValue / 255) * 100

    // Return the result rounded to two decimal places
    return Math.round(percentage * 100) / 100
  }

  /**
   * Converts a decimal percentage to a hex alpha value.
   * Takes a percentage (0-100) and converts it to a 2-digit hex alpha value.
   *
   * @param {number} dec - The alpha percentage (0-100)
   * @returns {string} The hex alpha value (e.g., "ff", "80")
   */
  static decimalAlphaToHex(dec) {
    // Ensure the input is between 0 and 100
    const percentage = clamp(dec, 0, 100)

    // Convert percentage to decimal (0-255)
    const decimalValue = Math.round((percentage * 255) / 100)

    // Convert to hex and ensure it's two digits
    return decimalValue.toString(16).padStart(2, "0")
  }

  /**
   * Normalizes a short hex color code to a full 6-character format.
   * Converts 3-character hex codes like "#f00" to "#ff0000".
   *
   * @param {string} code - The short hex color code
   * @returns {string} The normalized 6-character hex color code
   */
  static normalizeHex(code) {
    const matches = code.match(shortHex)

    if(!matches)
      throw AuntyError.new(`Invalid hex format. Expecting #aaa/aaa, got '${code}'`)

    const [_,hex] = matches

    return hex.split("").reduce((acc,curr) => acc + curr.repeat(2)).toLowerCase()
  }

  /**
   * Parses a hex color string and extracts color and alpha components.
   * Supports both short (#f00) and long (#ff0000) formats with optional alpha.
   *
   * @param {string} hex - The hex color string to parse
   * @returns {object} Object containing color and optional alpha information
   * @throws {AuntyError} If the hex value is invalid or missing
   */
  static parseHexColour(hex) {
    const parsed =
      hex.match(longHex)?.groups ||
      hex.match(shortHex)?.groups ||
      null

    if(!parsed)
      throw AuntyError.new(`Missing or invalid hex colour: ${hex}`)

    const result = {}

    result.colour = parsed.colour.length === 3
      ? Colour.normalizeHex(parsed.colour)
      : parsed.colour

    if(parsed.alpha) {
      parsed.alpha = parsed.alpha.length === 1
        ? Colour.normalizeHex(parsed.alpha)
        : parsed.alpha

      result.alpha = {
        hex: parsed.alpha,
        decimal: Colour.hexAlphaToDecimal(parsed.alpha) / 100.0
      }
    }

    return result
  }

  /**
   * Sets the alpha transparency of a hex color to a specific value.
   * Replaces any existing alpha with the new value.
   *
   * @param {string} hex - The hex color code
   * @param {number} amount - The alpha value (0-1, where 0 is transparent and 1 is opaque)
   * @returns {string} The hex color with the new alpha value
   */
  static setAlpha(hex, amount) {
    const work = Colour.parseHexColour(hex)
    const alpha = clamp(amount, 0, 1)
    const result = Color(work.colour).alpha(alpha).hexa().toLowerCase()

    return result
  }

  /**
   * Adjusts the alpha transparency of a hex color by a relative amount.
   * Multiplies the current alpha by (1 + amount) and clamps the result.
   *
   * @param {string} hex - The hex color code
   * @param {number} amount - The relative amount to adjust alpha (-1 to make transparent, positive to increase)
   * @returns {string} The hex color with adjusted alpha
   */
  static addAlpha(hex, amount) {
    const work = Colour.parseHexColour(hex)
    const currentAlpha = (work.alpha?.decimal ?? 1)
    const newAlpha = clamp(currentAlpha * (1 + amount), 0, 1)
    const result = Colour.setAlpha(hex, newAlpha)

    return result
  }

  /**
   * Removes alpha channel from a hex color, returning only the solid color.
   *
   * @param {string} hex - The hex color code with or without alpha
   * @returns {string} The solid hex color without alpha
   */
  static solid(hex) {
    return Colour.parseHexColour(hex).colour
  }

  /**
   * Mixes two hex colors together in a specified ratio.
   * Blends both the colors and their alpha channels if present.
   *
   * @param {string} colorA - The first hex color
   * @param {string} colorB - The second hex color
   * @param {number} ratio - The mixing ratio as percentage (0-100, where 50 is equal mix)
   * @returns {string} The mixed hex color with blended alpha
   */
  static mix(colorA, colorB, ratio = 50) {
    const t = toUnit(ratio)

    // memoize by raw inputs (strings) + normalized ratio
    const key = mixKey(colorA, colorB, t)
    if(_mixCache.has(key))
      return _mixCache.get(key)

    const c1 = asColor(colorA)
    const c2 = asColor(colorB)

    // color-space mix
    const mixed = c1.mix(c2, t)

    // alpha blend too
    const a = c1.alpha() * (1 - t) + c2.alpha() * t
    const out = (a < 1 ? mixed.alpha(a).hexa() : mixed.hex()).toLowerCase()

    _mixCache.set(key, out)
    return out
  }


  /**
   * Converts color values from various formats to hex.
   * Supports RGB, RGBA, HSL, HSLA, HSV, and HSVA color modes.
   *
   * @param {string} mode - The color mode ("rgb", "rgba", "hsl", "hsla", "hsv", "hsva")
   * @param {number} alpha - The alpha value (0-1) for non-alpha modes
   * @param {...number} args - The color component values (depends on mode)
   * @returns {string} The resulting hex color
   * @throws {AuntyError} If the wrong number of values is provided
   */
  static toHex(mode, alpha, ...args) {
    const values = args
      .filter(v => v != null)
      .map((v, index) => {
        if(mode === "rgb" || mode === "rgba")
          return clamp(Number(v), 0, 255)

        if(index === 0 && mode.match(/^(hsl|hsv)/))
          return clamp(Number(v), 0, 360)

        return clamp(Number(v), 0, 100)
      })

    if(values.length !== 3)
      throw AuntyError.new(`${mode}() requires three number values.`)

    if(alpha != null)
      alpha = clamp(Number(alpha), 0, 1)

    return mode.endsWith("a")
      ? Color[mode.slice(0, -1)](values)
        .alpha(alpha ?? 1)
        .hexa()
        .toLowerCase()
      : Color[mode](values)
        .hex()
        .toLowerCase()
  }
}
