/**
 * TNMainList — centralized reader for Main List spreadsheet.
 *
 * Responsibilities:
 * - Read named ranges from Main List spreadsheet
 * - Read full sheets (all values)
 * - Read multiple named ranges in one call
 *
 * Notes:
 * - Spreadsheet ID must be set via MAIN_LIST_SS_ID before use
 * - SS object is opened once in TNInitiation and passed via constructor
 * - Uses ctx.data (TNDataProcessor) for all data access
 * - Uses ctx.log (TNLog) for logging
 * - Enabled via enableMainList: true in TNInitiation options
 *
 * @param {Object} ctx - Script execution context from TNInitiation
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss - Pre-opened Main List spreadsheet
 * @returns {Object} TNMainList public API
 */
function TNMainList(ctx, ss) {

  // ---------- public API ----------

  /**
   * Reads value from a named range in Main List spreadsheet.
   * Returns scalar for single-cell ranges, array for multi-cell.
   *
   * @param {string} rangeName
   * @returns {*}
   */
  function readNamedRange(rangeName) {
    if (!rangeName) {
      throw new Error('TNMainList.readNamedRange: rangeName is required')
    }

    const value = ctx.data.readNamedRange(ss, rangeName)
    ctx.log.debug('TNMainList: read named range: ' + rangeName)
    return value
  }

  /**
   * Reads all data from a sheet in Main List spreadsheet.
   * Returns 2D array including header row.
   *
   * @param {string} sheetName
   * @returns {Array<Array<any>>}
   */
  function readSheet(sheetName) {
    if (!sheetName) {
      throw new Error('TNMainList.readSheet: sheetName is required')
    }

    const values = ctx.data.readSheet(ss, sheetName)
    ctx.log.debug('TNMainList: read sheet: ' + sheetName)
    return values
  }

  /**
   * Reads multiple named ranges in a single call.
   * Returns an object keyed by range name.
   * SS is opened only once — reuses the instance from TNInitiation.
   *
   * @param {string[]} rangeNames
   * @returns {Object.<string, *>}
   *
   * @example
   * const config = mainList.readMultiple(['Department', 'Year', 'Region'])
   * // → { Department: 'Sales', Year: 2024, Region: 'North' }
   */
  function readMultiple(rangeNames) {
    if (!rangeNames || !rangeNames.length) {
      throw new Error('TNMainList.readMultiple: rangeNames array is required')
    }

    const result = {}
    rangeNames.forEach(function (name) {
      result[name] = ctx.data.readNamedRange(ss, name)
    })

    ctx.log.debug('TNMainList: read multiple ranges: ' + rangeNames.join(', '))
    return result
  }

  // ---------- export ----------

  return {
    readNamedRange,
    readSheet,
    readMultiple
  }
}