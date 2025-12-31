/**
 * @file Colour manipulation utilities for theme processing.
 * Provides comprehensive colour operations including lightening, darkening,
 * mixing, alpha manipulation, and format conversions.
 */

import {
  converter,
  formatHex,
  formatHex8,
  hsl,
  interpolate,
  parse
} from "culori"

import {Util, Sass} from "@gesslar/toolkit"
// Cache for parsed colours to improve performance
const _colourCache = new Map()

// Cache for mixed colours to avoid recomputation
const _mixCache = new Map()

/**
 * Parses a colour string into a colour object with caching.
 *
 * @param {string} s - The colour string to parse
 * @returns {object} The parsed colour object
 * @throws {Sass} If the input is null, undefined, or empty
 */
const asColour = s => {
  // This is a comment explaining that 'x == null' will be true if the function
  // receives 'undefined' or 'null'. Some robot says that I need to document
  // the behaviour, despite it being IMMEDIATELY followed by the throw
  // detailing "received null/undefined", like it's a completely different
  // book. Also, who doesn't know that 'x == null' is true for null/undefined?
  // Maybe they need Udemy, or a refund from Udemy. Something. I'm not a
  // coding BABYSITTER. - gesslar @ 2025-08-13
  //
  // Addendum consequent to a recent robot's review. I will not be removing
  // the above. That you take issue with this is exactly why this comment
  // exists. I will not be judged on the quality of my work by my documentation
  // verbiage. I'm going to say it right here, in plain view: if someone's
  // poor, puritanical little pearls are so delicate as to be abraded by the
  // above message, they should (in any combination of)
  //
  // 1. avoid looking at any of the other comments in this project which are
  //    way worse,
  // 2. find another project that is as good or better than this one at its
  //    purpose,
  // 3. recall that this project is Unlicensed, and are invited to fork off.
  //
  // snoochie boochies, with love, gesslar @ 2025-09-02
  if(s == null)
    throw Sass.new("asColour(): received null/undefined")

  const k = String(s).trim()

  if(!k)
    throw Sass.new("asColour(): received empty string")

  let v = _colourCache.get(k)

  if(!v) {
    v = parse(k) // returns undefined if invalid

    if(!v)
      throw Sass.new(`Unable to parse colour: ${k}`)

    _colourCache.set(k, v)
  }

  return v
}

/**
 * Generates a cache key for colour mixing operations.
 *
 * @param {string} a - First colour string
 * @param {string} b - Second colour string
 * @param {number} t - Mixing ratio (0-1)
 * @returns {string} Cache key
 */
const mixKey = (a, b, t) => `${a}|${b}|${t}`

/**
 * Converts a percentage to a unit value (0-1).
 *
 * @param {number} r - Percentage value
 * @returns {number} Unit value
 */
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
 * Colour manipulation utility class providing static methods for colour operations.
 * Handles hex colour parsing, alpha manipulation, mixing, and format conversions.
 */
export default class Colour {
  /**
   * Regular expression for matching long hex colour codes with optional alpha.
   * Matches patterns like #ff0000 or #ff0000ff
   *
   * @type {RegExp}
   */
  static longHex = /^(?<colour>#[a-f0-9]{6})(?<alpha>[a-f0-9]{2})?$/i

  /**
   * Regular expression for matching short hex colour codes with optional alpha.
   * Matches patterns like #f00 or #f00f
   *
   * @type {RegExp}
   */
  static shortHex = /^(?<colour>#[a-f0-9]{3})(?<alpha>[a-f0-9]{1})?$/i

  /**
   * Lightens or darkens a hex colour by a specified amount.
   * Always uses OKLCH as the working color space for consistent perceptual results.
   *
   * @param {string} hex - The hex colour code (e.g., "#ff0000" or "#f00")
   * @param {number} amount - The amount to lighten (+) or darken (-) as a percentage
   * @returns {string} The modified hex colour with preserved alpha
   */
  static lightenOrDarken(hex, amount=0) {
    const extracted = Colour.parseHexColour(hex)
    const colour = parse(extracted.colour)

    // Always convert to OKLCH for lightness math (perceptually uniform)
    const oklchColor = converter("oklch")(colour)

    // Use multiplicative scaling for more natural results
    const factor = 1 + (amount / 100)

    oklchColor.l = clamp(oklchColor.l * factor, 0, 1)

    const result = `${formatHex(oklchColor)}${extracted.alpha?.hex??""}`.toLowerCase()

    return result
  }

  /**
   * Lightens or darkens a color using OKLCH as working space for consistent results.
   * Preserves original color information from tokens when available.
   *
   * @param {ThemeToken|object|string} tokenOrColor - ThemeToken, Culori color object, or hex string
   * @param {number} amount - The amount to lighten (+) or darken (-) as a percentage
   * @returns {string} The modified hex colour
   */
  static lightenOrDarkenWithToken(tokenOrColor, amount=0) {
    let sourceColor

    if(tokenOrColor?.getParsedColor) {
      // It's a ThemeToken - use the parsed color
      sourceColor = tokenOrColor.getParsedColor()
    } else if(tokenOrColor?.mode) {
      // It's already a parsed Culori color object
      sourceColor = tokenOrColor
    } else {
      // Fallback to string parsing
      sourceColor = parse(tokenOrColor)
    }

    if(!sourceColor) {
      throw Sass.new(`Cannot parse color from: ${tokenOrColor}`)
    }

    // Always convert to OKLCH for lightness math (consistent perceptual results)
    const oklchColor = converter("oklch")(sourceColor)

    // Use multiplicative scaling
    const factor = 1 + (amount / 100)

    oklchColor.l = clamp(oklchColor.l * factor, 0, 1)

    return formatHex(oklchColor).toLowerCase()
  }

  /**
   * Inverts a hex colour by flipping its lightness value.
   * Preserves hue and saturation while inverting the lightness component.
   *
   * @param {string} hex - The hex colour code to invert
   * @returns {string} The inverted hex colour with preserved alpha
   */
  static invert(hex) {
    const extracted = Colour.parseHexColour(hex)
    const hslColour = hsl(extracted.colour)

    hslColour.l = 1 - hslColour.l  // culori uses 0-1 for lightness
    const modifiedColour = formatHex(hslColour)

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

  static isHex(value) {
    return Colour.shortHex.test(value) ||
           Colour.longHex.test(value)
  }

  /**
   * Normalises a short hex colour code to a full 6-character format.
   * Converts 3-character hex codes like "#f00" to "#ff0000".
   *
   * @param {string} code - The short hex colour code
   * @returns {string} The normalized 6-character hex colour code
   */
  static normaliseHex(code) {
    // did some rube give us a long hex?
    if(Colour.longHex.test(code))
      // send it back! pshaw!
      return code

    const matches = code.match(Colour.shortHex)

    if(!matches)
      throw Sass.new(`Invalid hex format. Expecting #aaa/aaa, got '${code}'`)

    const [_,hex] = matches

    return hex.split("").reduce((acc,curr) => acc + curr.repeat(2), "").toLowerCase()
  }

  /**
   * Parses a hex colour string and extracts colour and alpha components.
   * Supports both short (#f00) and long (#ff0000) formats with optional alpha.
   *
   * @param {string} hex - The hex colour string to parse
   * @returns {object} Object containing colour and optional alpha information
   * @throws {Sass} If the hex value is invalid or missing
   */
  static parseHexColour(hex) {
    const parsed =
      hex.match(Colour.longHex)?.groups ||
      hex.match(Colour.shortHex)?.groups ||
      null

    if(!parsed)
      throw Sass.new(`Missing or invalid hex colour: ${hex}`)

    const result = {}

    result.colour = parsed.colour.length === 3
      ? Colour.normaliseHex(parsed.colour)
      : parsed.colour

    if(parsed.alpha) {
      parsed.alpha = parsed.alpha.length === 1
        ? Colour.normaliseHex(parsed.alpha)
        : parsed.alpha

      result.alpha = {
        hex: parsed.alpha,
        decimal: Colour.hexAlphaToDecimal(parsed.alpha) / 100.0
      }
    }

    return result
  }

  /**
   * Sets the alpha transparency of a hex colour to a specific value.
   * Replaces any existing alpha with the new value.
   *
   * @param {string} hex - The hex colour code
   * @param {number} amount - The alpha value (0-1, where 0 is transparent and 1 is opaque)
   * @returns {string} The hex colour with the new alpha value
   */
  static setAlpha(hex, amount) {
    const work = Colour.parseHexColour(hex)
    const alpha = clamp(amount, 0, 1)
    const colour = parse(work.colour)
    const result = formatHex8({...colour, alpha}).toLowerCase()

    return result
  }

  /**
   * Adjusts the alpha transparency of a hex colour by a relative amount.
   * Multiplies the current alpha by (1 + amount) and clamps the result.
   *
   * @param {string} hex - The hex colour code
   * @param {number} amount - The relative amount to adjust alpha (-1 to make transparent, positive to increase)
   * @returns {string} The hex colour with adjusted alpha
   */
  static addAlpha(hex, amount) {
    const work = Colour.parseHexColour(hex)
    const currentAlpha = (work.alpha?.decimal ?? 1)
    const newAlpha = clamp(currentAlpha * (1 + amount), 0, 1)
    const result = Colour.setAlpha(hex, newAlpha)

    return result
  }

  /**
   * Removes alpha channel from a hex colour, returning only the solid colour.
   *
   * @param {string} hex - The hex colour code with or without alpha
   * @returns {string} The solid hex colour without alpha
   */
  static solid(hex) {
    return Colour.parseHexColour(hex).colour
  }

  /**
   * Mixes two hex colours together in a specified ratio.
   * Blends both the colours and their alpha channels if present.
   *
   * @param {string} colourA - The first hex colour
   * @param {string} colourB - The second hex colour
   * @param {number} ratio - The mixing ratio as percentage (0-100, where 50 is equal mix)
   * @returns {string} The mixed hex colour with blended alpha
   */
  static mix(colourA, colourB, ratio = 50) {
    const t = toUnit(ratio)

    // memoize by raw inputs (strings) + normalized ratio
    const key = mixKey(colourA, colourB, t)

    if(_mixCache.has(key))
      return _mixCache.get(key)

    const c1 = asColour(colourA)
    const c2 = asColour(colourB)

    // colour-space mix using culori interpolation
    const colourSpace = (c1.mode === "oklch" || c2.mode === "oklch") ? "oklch" : "rgb"
    const interpolateFn = interpolate([c1, c2], colourSpace)
    const mixed = interpolateFn(t)

    // alpha blend too
    const a1 = c1.alpha ?? 1
    const a2 = c2.alpha ?? 1
    const a = a1 * (1 - t) + a2 * t
    const withAlpha = {...mixed, alpha: a}
    const out = (a < 1 ? formatHex8(withAlpha) : formatHex(mixed)).toLowerCase()

    _mixCache.set(key, out)

    return out
  }

  static async getColourParser(name) {
    const culori = await import("culori")
    const capped = Util.capitalize(name)
    const parserName = `parse${capped}`
    const fn = culori[parserName]

    return typeof fn === "function" ? fn : null
  }

  /**
   * Converts colour values from various formats to hex.
   * Supports RGB, RGBA, HSL, HSLA, OKLCH, and OKLCHA colour modes, and MORE!
   *
   * @param {string} input - The colour expression
   * @returns {string} The resulting hex colour
   * @throws {Sass} If the wrong function or value is provided
   */
  static toHex(input) {
    const colourObj = parse(input)

    if(!colourObj)
      throw Sass.new(`Invalid colour function invocation: ${input}`)

    const formatter = "alpha" in colourObj
      ? formatHex8
      : formatHex

    return formatter(colourObj)
  }
}
