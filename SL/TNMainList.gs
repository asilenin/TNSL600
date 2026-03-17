/**
 * TNMainList — centralized reader for Main List spreadsheet.
 *
 * Responsibilities:
 * - Read named ranges from Main List spreadsheet
 * - Read full sheets (all values)
 *
 * Notes:
 * - Spreadsheet ID must be set via MAIN_LIST_SS_ID before use
 * - Uses ctx.data (TNDataProcessor) for all data access
 * - Uses ctx.log (TNLog) for logging
 *
 * @param {Object} ctx - Script execution context from TNInitiation
 * @returns {Object} TNMainList public API
 */
function TNMainList(ctx) {

  // ---------- configuration ----------

  /**
   * ID of the Main List spreadsheet.
   * Replace with the actual spreadsheet ID before use.
   *
   * @type {string}
   */
  const MAIN_LIST_SS_ID = 'PUT_MAIN_LIST_SPREADSHEET_ID_HERE'

  // ---------- internal helpers ----------

  function _getSS() {
    return SpreadsheetApp.openById(MAIN_LIST_SS_ID)
  }

  function _log(msg) {
    if (ctx && ctx.log) {
      ctx.log.info(msg)
    }
  }

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

    const ss = _getSS()
    const value = ctx.data.readNamedRange(ss, rangeName)

    _log('TNMainList: read named range: ' + rangeName)
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

    const ss = _getSS()
    const sheet = ss.getSheetByName(sheetName)

    if (!sheet) {
      throw new Error('TNMainList.readSheet: sheet not found: ' + sheetName)
    }

    const values = sheet.getDataRange().getValues()
    _log('TNMainList: read sheet: ' + sheetName)

    return values
  }

  // ---------- export ----------

  return {
    readNamedRange,
    readSheet
  }
}