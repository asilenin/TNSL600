/**
 * TNDataProcessor — spreadsheet data access and update factory.
 *
 * Adds support for reading and writing Named Ranges.
 *
 * Backend selection (GAS / API) is driven by ctx.dataMode.
 */
function TNDataProcessor(ctx) {

  // ---------- helpers ----------

  function _mode() {
    return ctx && ctx.dataMode ? ctx.dataMode : 'GAS'
  }

  function _getSheet(ss, name) {
    return ss.getSheetByName(name)
  }

  // ---------- core operations ----------

  /**
   * Clears all content in sheet except header row (row 1).
   */
  function clearExceptHeader(sheet) {
    const lastRow = sheet.getLastRow()
    if (lastRow > 1) {
      sheet
        .getRange(2, 1, lastRow - 1, sheet.getMaxColumns())
        .clearContent()
    }
  }

  /**
   * Reads range data using configured backend.
   */
  function readRange(ss, sheetName, range, options) {
    const opts = options || {}

    if (_mode() === 'API') {
      const ssId = ss.getId()
      const res = Sheets.Spreadsheets.Values.get(
        ssId,
        "'" + sheetName + "'!" + range
      )
      return res.values || []
    }

    const sheet = _getSheet(ss, sheetName)
    const r = sheet.getRange(range)
    return opts.display ? r.getDisplayValues() : r.getValues()
  }

  /**
   * Writes range data using configured backend.
   */
  function writeRange(ss, sheetName, range, data) {
    if (!data) return

    if (_mode() === 'API') {
      const ssId = ss.getId()
      Sheets.Spreadsheets.Values.update(
        { values: Array.isArray(data[0]) ? data : [[data]] },
        ssId,
        "'" + sheetName + "'!" + range,
        { valueInputOption: 'USER_ENTERED' }
      )
      return
    }

    const sheet = _getSheet(ss, sheetName)
    const rows = Array.isArray(data) && Array.isArray(data[0]) ? data.length : 1
    const cols = rows > 1 ? data[0].length : 1

    sheet
      .getRange(range)
      .offset(0, 0, rows, cols)
      .setValues(Array.isArray(data[0]) ? data : [[data]])
  }

  // ---------- named ranges ----------

  /**
   * Reads value from a named range.
   *
   * @param {Spreadsheet} ss
   * @param {string} rangeName
   * @param {Object} [options]
   * @param {boolean} [options.display=false]
   * @returns {any}
   */
  function readNamedRange(ss, rangeName, options) {
    const opts = options || {}

    const range = ss.getRangeByName(rangeName)
    if (!range) return null

    if (opts.display) {
      const values = range.getDisplayValues()
      return values.length === 1 && values[0].length === 1
        ? values[0][0]
        : values
    }

    const values = range.getValues()
    return values.length === 1 && values[0].length === 1
      ? values[0][0]
      : values
  }

  /**
   * Writes value to a named range.
   *
   * @param {Spreadsheet} ss
   * @param {string} rangeName
   * @param {any} value
   */
  function writeNamedRange(ss, rangeName, value) {
    const range = ss.getRangeByName(rangeName)
    if (!range) return

    const data =
      Array.isArray(value)
        ? Array.isArray(value[0]) ? value : [value]
        : [[value]]

    range
      .offset(0, 0, data.length, data[0].length)
      .setValues(data)
  }

  /**
   * Copies data from source sheet to destination sheet.
   */
  function copyRange(params) {
    const data = readRange(
      params.sourceSS,
      params.sourceSheet,
      params.sourceRange
    )

    const destWS = _getSheet(params.destSS, params.destSheet)
    if (params.clear !== false) {
      clearExceptHeader(destWS)
    }

    writeRange(
      params.destSS,
      params.destSheet,
      params.destRange,
      data
    )
  }

  /**
   * Updates destination named range with value from source named range.
   */
  function updateNamedRange(sourceSS, destSS, sourceName, destName) {
    const value = readNamedRange(sourceSS, sourceName)
    writeNamedRange(destSS, destName, value)
  }

  // ---------- export ----------

  return {
    clearExceptHeader,
    readRange,
    writeRange,
    readNamedRange,
    writeNamedRange,
    copyRange,
    updateNamedRange
  }
}