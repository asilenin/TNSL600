/**
 * TNHelpers — shared utility functions for SL6_Main library.
 *
 * Provides common helpers used both internally by library modules
 * and available to consumer scripts via SL6_Main.TNHelpers.
 *
 * Declared as var for GAS library export compatibility.
 *
 * Usage from consumer script:
 *   const h = SL6_Main.TNHelpers
 *   h.formatDate(new Date())
 *   h.chunkArray(rows, 100)
 */
var TNHelpers = {

  // ---------- boolean ----------

  /**
   * Normalizes a value to boolean.
   * Handles native booleans and spreadsheet string representations.
   *
   * @param {any} value
   * @returns {boolean}
   *
   * @example
   * TNHelpers.normalizeBoolean(true)    // → true
   * TNHelpers.normalizeBoolean('TRUE')  // → true
   * TNHelpers.normalizeBoolean('false') // → false
   * TNHelpers.normalizeBoolean(null)    // → false
   */
  normalizeBoolean: function (value) {
    if (value === true) return true
    if (value === false) return false
    if (typeof value === 'string') {
      return value.toUpperCase() === 'TRUE'
    }
    return false
  },

  /**
   * Returns true if value is a boolean true or the string 'TRUE'.
   * Used to detect active/checked flags from spreadsheet checkboxes.
   *
   * @param {any} value
   * @returns {boolean}
   *
   * @example
   * TNHelpers.isActiveFlag(true)    // → true
   * TNHelpers.isActiveFlag('TRUE')  // → true
   * TNHelpers.isActiveFlag(false)   // → false
   * TNHelpers.isActiveFlag('')      // → false
   */
  isActiveFlag: function (value) {
    return value === true || value === 'TRUE'
  },

  // ---------- id ----------

  /**
   * Generates a new unique identifier (UUID v4).
   * Wrapper over Utilities.getUuid() for readability and testability.
   *
   * Used internally for ctx.executionId.
   * Also useful in consumer scripts for generating record IDs,
   * batch identifiers, or any unique key.
   *
   * @returns {string} UUID v4 string, e.g. '110e8400-e29b-41d4-a716-446655440000'
   *
   * @example
   * TNHelpers.generateId()
   * // → '110e8400-e29b-41d4-a716-446655440000'
   */
  generateId: function () {
    return Utilities.getUuid()
  },

  // ---------- date ----------

  /**
   * Formats a Date object as a string using spreadsheet timezone.
   *
   * @param {Date} date
   * @param {string} [timezone] - IANA timezone. Defaults to active spreadsheet timezone.
   * @param {string} [format='dd.MM.yyyy HH:mm:ss'] - Utilities.formatDate format string
   * @returns {string}
   *
   * @example
   * TNHelpers.formatDate(new Date())
   * // → '18.03.2026 14:32:05'
   *
   * TNHelpers.formatDate(new Date(), 'America/New_York', 'MM/dd/yyyy')
   * // → '03/18/2026'
   */
  formatDate: function (date, timezone, format) {
    var tz = timezone || SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone()
    var fmt = format || 'dd.MM.yyyy HH:mm:ss'
    return Utilities.formatDate(date, tz, fmt)
  },

  // ---------- array ----------

  /**
   * Splits an array into chunks of the specified size.
   * Useful for batch processing large datasets within API rate limits.
   *
   * @param {Array<any>} array
   * @param {number} size - Chunk size (must be >= 1)
   * @returns {Array<Array<any>>}
   *
   * @example
   * TNHelpers.chunkArray([1, 2, 3, 4, 5], 2)
   * // → [[1, 2], [3, 4], [5]]
   *
   * TNHelpers.chunkArray(rows, 100)
   * // → array of row batches, each up to 100 rows
   */
  chunkArray: function (array, size) {
    if (!array || !array.length) return []
    if (!size || size < 1) throw new Error('TNHelpers.chunkArray: size must be >= 1')

    var result = []
    for (var i = 0; i < array.length; i += size) {
      result.push(array.slice(i, i + size))
    }
    return result
  },

  // ---------- control flow ----------

  /**
   * Pauses execution for the specified number of milliseconds.
   * Wrapper over Utilities.sleep for readability.
   *
   * Useful for respecting API rate limits between batch operations.
   *
   * @param {number} ms - Duration in milliseconds
   *
   * @example
   * TNHelpers.sleep(1000)  // pause for 1 second
   * TNHelpers.sleep(500)   // pause for 500ms between API calls
   */
  sleep: function (ms) {
    Utilities.sleep(ms)
  },

  // ---------- validation ----------

  /**
   * Returns true if value is empty: null, undefined, '', [], or {}.
   *
   * @param {any} value
   * @returns {boolean}
   *
   * @example
   * TNHelpers.isEmpty(null)   // → true
   * TNHelpers.isEmpty('')     // → true
   * TNHelpers.isEmpty([])     // → true
   * TNHelpers.isEmpty({})     // → true
   * TNHelpers.isEmpty('hi')   // → false
   * TNHelpers.isEmpty([1])    // → false
   * TNHelpers.isEmpty(0)      // → false  (0 is a valid value)
   * TNHelpers.isEmpty(false)  // → false  (false is a valid value)
   */
  isEmpty: function (value) {
    if (value === null || value === undefined) return true
    if (typeof value === 'string') return value === ''
    if (Array.isArray(value)) return value.length === 0
    if (typeof value === 'object') return Object.keys(value).length === 0
    return false
  }

}