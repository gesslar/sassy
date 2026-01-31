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
    static longHex: RegExp;
    /**
     * Regular expression for matching short hex colour codes with optional alpha.
     * Matches patterns like #f00 or #f00f
     *
     * @type {RegExp}
     */
    static shortHex: RegExp;
    /**
     * Lightens or darkens a hex colour by a specified amount.
     * Always uses OKLCH as the working color space for consistent perceptual results.
     *
     * @param {string} hex - The hex colour code (e.g., "#ff0000" or "#f00")
     * @param {number} amount - The amount to lighten (+) or darken (-) as a percentage
     * @returns {string} The modified hex colour with preserved alpha
     */
    static lightenOrDarken(hex: string, amount?: number): string;
    /**
     * Lightens or darkens a color using OKLCH as working space for consistent results.
     * Preserves original color information from tokens when available.
     *
     * @param {ThemeToken|object|string} tokenOrColor - ThemeToken, Culori color object, or hex string
     * @param {number} amount - The amount to lighten (+) or darken (-) as a percentage
     * @returns {string} The modified hex colour
     */
    static lightenOrDarkenWithToken(tokenOrColor: converter | object | string, amount?: number): string;
    /**
     * Inverts a hex colour by flipping its lightness value.
     * Preserves hue and saturation while inverting the lightness component.
     *
     * @param {string} hex - The hex colour code to invert
     * @returns {string} The inverted hex colour with preserved alpha
     */
    static invert(hex: string): string;
    /**
     * Converts a hex alpha value to a decimal percentage.
     * Takes a 2-digit hex alpha value and converts it to a percentage (0-100).
     *
     * @param {string} hex - The hex alpha value (e.g., "ff", "80")
     * @returns {number} The alpha as a percentage rounded to 2 decimal places
     */
    static hexAlphaToDecimal(hex: string): number;
    /**
     * Converts a decimal percentage to a hex alpha value.
     * Takes a percentage (0-100) and converts it to a 2-digit hex alpha value.
     *
     * @param {number} dec - The alpha percentage (0-100)
     * @returns {string} The hex alpha value (e.g., "ff", "80")
     */
    static decimalAlphaToHex(dec: number): string;
    static isHex(value: any): boolean;
    /**
     * Normalises a short hex colour code to a full 6-character format.
     * Converts 3-character hex codes like "#f00" to "#ff0000".
     *
     * @param {string} code - The short hex colour code
     * @returns {string} The normalized 6-character hex colour code
     */
    static normaliseHex(code: string): string;
    /**
     * Parses a hex colour string and extracts colour and alpha components.
     * Supports both short (#f00) and long (#ff0000) formats with optional alpha.
     *
     * @param {string} hex - The hex colour string to parse
     * @returns {object} Object containing colour and optional alpha information
     * @throws {Sass} If the hex value is invalid or missing
     */
    static parseHexColour(hex: string): object;
    /**
     * Sets the alpha transparency of a hex colour to a specific value.
     * Replaces any existing alpha with the new value.
     *
     * @param {string} hex - The hex colour code
     * @param {number} amount - The alpha value (0-1, where 0 is transparent and 1 is opaque)
     * @returns {string} The hex colour with the new alpha value
     */
    static setAlpha(hex: string, amount: number): string;
    /**
     * Adjusts the alpha transparency of a hex colour by a relative amount.
     * Multiplies the current alpha by (1 + amount) and clamps the result.
     *
     * @param {string} hex - The hex colour code
     * @param {number} amount - The relative amount to adjust alpha (-1 to make transparent, positive to increase)
     * @returns {string} The hex colour with adjusted alpha
     */
    static addAlpha(hex: string, amount: number): string;
    /**
     * Removes alpha channel from a hex colour, returning only the solid colour.
     *
     * @param {string} hex - The hex colour code with or without alpha
     * @returns {string} The solid hex colour without alpha
     */
    static solid(hex: string): string;
    /**
     * Mixes two hex colours together in a specified ratio.
     * Blends both the colours and their alpha channels if present.
     *
     * @param {string} colourA - The first hex colour
     * @param {string} colourB - The second hex colour
     * @param {number} ratio - The mixing ratio as percentage (0-100, where 50 is equal mix)
     * @returns {string} The mixed hex colour with blended alpha
     */
    static mix(colourA: string, colourB: string, ratio?: number): string;
    static getColourParser(name: any): Promise<any>;
    /**
     * Converts colour values from various formats to hex.
     * Supports RGB, RGBA, HSL, HSLA, OKLCH, and OKLCHA colour modes, and MORE!
     *
     * @param {string} input - The colour expression
     * @returns {string} The resulting hex colour
     * @throws {Sass} If the wrong function or value is provided
     */
    static toHex(input: string): string;
}
//# sourceMappingURL=Colour.d.ts.map