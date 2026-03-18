/**
 * TNDataProcessor — spreadsheet data access and update factory.
 *
 * Supports reading and writing ranges, named ranges, full sheets,
 * table discovery, and batch operations.
 *
 * Backend selection (GAS / API) is driven by ctx.dataMode.
 * All public methods respect the configured backend — no mixed calls.
 */
function TNDataProcessor(ctx) {

  // ---------- internal helpers ----------

  function _mode() {
    return ctx && ctx.dataMode ? ctx.dataMode : 'GAS'
  }

  function _getSheet(ss, name) {
    const sheet = ss.getSheetByName(name)
    if (!sheet) throw new Error('TNDataProcessor: sheet not found: ' + name)
    return sheet
  }

  // ---------- clear ----------

  /**
   * Clears all content in a sheet except the header row (row 1).
   *
   * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
   * @param {string} sheetName
   */
  function clearExceptHeader(ss, sheetName) {
    if (_mode() === 'API') {
      const ssId = ss.getId()
      const meta = Sheets.Spreadsheets.get(ssId, {
        ranges: ["'" + sheetName + "'"],
        fields: 'sheets(properties(gridProperties))'
      })
      const props = meta.sheets[0].properties.gridProperties
      const lastRow = props.rowCount
      const lastCol = props.columnCount

      if (lastRow <= 1) return

      Sheets.Spreadsheets.Values.clear(
        ssId,
        "'" + sheetName + "'!A2:" + _colLetter(lastCol) + lastRow
      )
      return
    }

    const sheet = _getSheet(ss, sheetName)
    const lastRow = sheet.getLastRow()
    if (lastRow > 1) {
      sheet
        .getRange(2, 1, lastRow - 1, sheet.getMaxColumns())
        .clearContent()
    }
  }

  // ---------- read / write ranges ----------

  /**
   * Reads range data using configured backend.
   *
   * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
   * @param {string} sheetName
   * @param {string} range - A1 notation
   * @param {Object} [options]
   * @param {boolean} [options.display=false] - Return display values (GAS only)
   * @returns {Array<Array<any>>}
   */
  function readRange(ss, sheetName, range, options) {
    const opts = options || {}

    if (_mode() === 'API') {
      const res = Sheets.Spreadsheets.Values.get(
        ss.getId(),
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
   *
   * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
   * @param {string} sheetName
   * @param {string} range - A1 notation, top-left anchor
   * @param {Array<Array<any>>|any} data
   */
  function writeRange(ss, sheetName, range, data) {
    if (!data) return

    const values = Array.isArray(data[0]) ? data : [[data]]

    if (_mode() === 'API') {
      Sheets.Spreadsheets.Values.update(
        { values: values },
        ss.getId(),
        "'" + sheetName + "'!" + range,
        { valueInputOption: 'USER_ENTERED' }
      )
      return
    }

    const sheet = _getSheet(ss, sheetName)
    sheet
      .getRange(range)
      .offset(0, 0, values.length, values[0].length)
      .setValues(values)
  }

  /**
   * Reads all data from a sheet including the header row.
   * Returns a 2D array.
   *
   * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
   * @param {string} sheetName
   * @returns {Array<Array<any>>}
   */
  function readSheet(ss, sheetName) {
    if (_mode() === 'API') {
      const res = Sheets.Spreadsheets.Values.get(
        ss.getId(),
        "'" + sheetName + "'"
      )
      return res.values || []
    }

    const sheet = _getSheet(ss, sheetName)
    return sheet.getDataRange().getValues()
  }

  /**
   * Appends a single row to the end of a sheet.
   *
   * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
   * @param {string} sheetName
   * @param {Array<any>} rowArray
   */
  function appendRow(ss, sheetName, rowArray) {
    if (!rowArray || !rowArray.length) return

    if (_mode() === 'API') {
      Sheets.Spreadsheets.Values.append(
        { values: [rowArray] },
        ss.getId(),
        "'" + sheetName + "'",
        { valueInputOption: 'USER_ENTERED', insertDataOption: 'INSERT_ROWS' }
      )
      return
    }

    const sheet = _getSheet(ss, sheetName)
    sheet.appendRow(rowArray)
  }

  // ---------- named ranges ----------

  /**
   * Reads value from a named range.
   * Returns scalar for single-cell ranges, 2D array otherwise.
   *
   * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
   * @param {string} rangeName
   * @param {Object} [options]
   * @param {boolean} [options.display=false]
   * @returns {any}
   */
  function readNamedRange(ss, rangeName, options) {
    const opts = options || {}
    const range = ss.getRangeByName(rangeName)
    if (!range) return null

    const values = opts.display ? range.getDisplayValues() : range.getValues()
    return values.length === 1 && values[0].length === 1
      ? values[0][0]
      : values
  }

  /**
   * Writes value to a named range.
   *
   * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
   * @param {string} rangeName
   * @param {any} value
   */
  function writeNamedRange(ss, rangeName, value) {
    const range = ss.getRangeByName(rangeName)
    if (!range) return

    const data = Array.isArray(value)
      ? Array.isArray(value[0]) ? value : [value]
      : [[value]]

    range.offset(0, 0, data.length, data[0].length).setValues(data)
  }

  // ---------- copy / update ----------

  /**
   * Copies data from source range to destination range.
   *
   * @param {Object} params
   * @param {Spreadsheet} params.sourceSS
   * @param {string} params.sourceSheet
   * @param {string} params.sourceRange
   * @param {Spreadsheet} params.destSS
   * @param {string} params.destSheet
   * @param {string} params.destRange
   * @param {boolean} [params.clear=true] - Clear destination before writing
   */
  function copyRange(params) {
    const values = readRange(params.sourceSS, params.sourceSheet, params.sourceRange)

    if (params.clear !== false) {
      clearExceptHeader(params.destSS, params.destSheet)
    }

    writeRange(params.destSS, params.destSheet, params.destRange, values)
  }

  /**
   * Updates destination named range with value from source named range.
   *
   * @param {Spreadsheet} sourceSS
   * @param {Spreadsheet} destSS
   * @param {string} sourceName
   * @param {string} destName
   */
  function updateNamedRange(sourceSS, destSS, sourceName, destName) {
    const value = readNamedRange(sourceSS, sourceName)
    writeNamedRange(destSS, destName, value)
  }

  // ---------- table discovery ----------

  /**
   * Finds a header row containing all specified column names anywhere in the sheet.
   * The header row may start at any column and any row.
   * Returns structured table data with headers, column indexes, and values.
   *
   * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
   * @param {string} sheetName
   * @param {string[]} searchHeaders - Column names to locate (all must be present)
   *
   * @returns {{
   *   headers:     string[],           // all non-empty headers in the found row
   *   indexes:     number[],           // sheet column indexes (0-based) of all headers
   *   valuesRaw:   Array<Array<any>>,  // all rows below header, full width of sheet
   *   valuesClean: Array<Array<any>>   // rows below header, only header columns, in header order
   * }|null} null if header row not found
   *
   * @example
   * const table = data.findTable(ctx.ss, 'Report', ['Region', 'Status'])
   * // table.headers     → ['Region', 'Name', 'Score', 'Status']
   * // table.indexes     → [3, 4, 5, 6]  (columns D–G, 0-based)
   * // table.valuesRaw   → [['North', 'Alice', 95, 'active'], ...]
   * // table.valuesClean → [['North', 'active'], ...]  (only Region + Status)
   */
  function findTable(ss, sheetName, searchHeaders) {
    if (!searchHeaders || !searchHeaders.length) return null

    const allData = readSheet(ss, sheetName)
    if (!allData || !allData.length) return null

    // find the header row: the first row that contains all searchHeaders
    let headerRowIndex = -1
    for (let r = 0; r < allData.length; r++) {
      const row = allData[r]
      const hasAll = searchHeaders.every(function (h) {
        return row.indexOf(h) !== -1
      })
      if (hasAll) {
        headerRowIndex = r
        break
      }
    }

    if (headerRowIndex === -1) return null

    const headerRow = allData[headerRowIndex]

    // collect all non-empty headers and their sheet column indexes (0-based)
    const headers = []
    const indexes = []
    for (let c = 0; c < headerRow.length; c++) {
      const cell = String(headerRow[c]).trim()
      if (cell !== '') {
        headers.push(cell)
        indexes.push(c)
      }
    }

    // data rows: everything below the header row, skip fully empty rows
    const dataRows = allData.slice(headerRowIndex + 1).filter(function (row) {
      return row.some(function (cell) { return cell !== '' && cell !== null })
    })

    // valuesRaw: full rows as-is
    const valuesRaw = dataRows

    // valuesClean: only the columns that are in headers, in header order
    // indexes[] maps headers[] positions to sheet column positions
    const valuesClean = dataRows.map(function (row) {
      return indexes.map(function (colIdx) {
        return row[colIdx] !== undefined ? row[colIdx] : ''
      })
    })

    return {
      headers:     headers,
      indexes:     indexes,
      valuesRaw:   valuesRaw,
      valuesClean: valuesClean
    }
  }

  // ---------- batch read ----------

  /**
   * Reads multiple ranges from a single spreadsheet in one operation.
   * In API mode: uses batchGet — single HTTP request.
   * In GAS mode: executes sequentially.
   *
   * Returns an array of results in the same order as the input operations.
   * Each result is a 2D array (same format as readRange).
   *
   * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
   * @param {Array<{sheet: string, range: string}>} operations
   * @returns {Array<Array<Array<any>>>}
   *
   * @example
   * const [orders, config, summary] = data.batchRead(ctx.ss, [
   *   { sheet: 'Orders',  range: 'A2:D' },
   *   { sheet: 'Config',  range: 'A1:B' },
   *   { sheet: 'Summary', range: 'C5'   }
   * ])
   */
  function batchRead(ss, operations) {
    if (!operations || !operations.length) return []

    if (_mode() === 'API') {
      const ranges = operations.map(function (op) {
        return "'" + op.sheet + "'!" + op.range
      })

      const res = Sheets.Spreadsheets.Values.batchGet(ss.getId(), {
        ranges: ranges
      })

      return (res.valueRanges || []).map(function (vr) {
        return vr.values || []
      })
    }

    // GAS mode: sequential reads
    return operations.map(function (op) {
      return readRange(ss, op.sheet, op.range)
    })
  }

  // ---------- batch write ----------

  /**
   * Writes multiple ranges in a single operation.
   * In API mode: uses batchUpdate for a single HTTP request.
   * In GAS mode: executes sequentially (SpreadsheetApp has no native batch API).
   *
   * @param {Array<{ss: Spreadsheet, sheet: string, range: string, values: Array<Array<any>>}>} operations
   *
   * @example
   * data.batchWrite([
   *   { ss: ctx.ss, sheet: 'Orders',  range: 'A2', values: [['val1', 'val2']] },
   *   { ss: ctx.ss, sheet: 'Summary', range: 'B5', values: [['total']] }
   * ])
   */
  function batchWrite(operations) {
    if (!operations || !operations.length) return

    if (_mode() === 'API') {
      // group operations by spreadsheet ID for minimal requests
      const bySpreadsheet = {}
      operations.forEach(function (op) {
        const ssId = op.ss.getId()
        if (!bySpreadsheet[ssId]) {
          bySpreadsheet[ssId] = { ss: op.ss, data: [] }
        }
        bySpreadsheet[ssId].data.push({
          range:  "'" + op.sheet + "'!" + op.range,
          values: Array.isArray(op.values[0]) ? op.values : [[op.values]]
        })
      })

      Object.keys(bySpreadsheet).forEach(function (ssId) {
        const group = bySpreadsheet[ssId]
        Sheets.Spreadsheets.Values.batchUpdate(
          {
            valueInputOption: 'USER_ENTERED',
            data: group.data
          },
          ssId
        )
      })
      return
    }

    // GAS mode: sequential writes
    operations.forEach(function (op) {
      writeRange(op.ss, op.sheet, op.range, op.values)
    })
  }

  // ---------- internal utilities ----------

  /**
   * Converts a 1-based column number to A1 letter notation.
   * Used internally for API range construction.
   *
   * @param {number} col - 1-based column number
   * @returns {string}
   */
  function _colLetter(col) {
    let letter = ''
    while (col > 0) {
      const rem = (col - 1) % 26
      letter = String.fromCharCode(65 + rem) + letter
      col = Math.floor((col - 1) / 26)
    }
    return letter
  }

  // ---------- export ----------

  return {
    clearExceptHeader,
    readRange,
    writeRange,
    readSheet,
    appendRow,
    readNamedRange,
    writeNamedRange,
    copyRange,
    updateNamedRange,
    findTable,
    batchRead,
    batchWrite
  }
}