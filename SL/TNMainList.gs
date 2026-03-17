/**
 * TNMainList — centralized reader for Main List spreadsheet.
 *
 * Responsibilities:
 * - Read named ranges from Main List
 * - Read full sheets (values)
 *
 * Notes:
 * - Spreadsheet ID is stored inside the module
 * - Uses TNDataProcessor for data access
 * - Uses TNLog for logging (if ctx provided)
 */
var TNMainList = (function () {

  // --------------------------------------------------
  // configuration
  // --------------------------------------------------

  /** @type {string} */
  var MAIN_LIST_SS_ID = 'PUT_MAIN_LIST_SPREADSHEET_ID_HERE';

  /** @type {Object|null} */
  var _ctx = null;

  // --------------------------------------------------
  // lifecycle
  // --------------------------------------------------

  /**
   * Initializes TNMainList with execution context.
   * Called automatically from TNInitiation if enabled.
   *
   * @param {Object} ctx
   */
  function init(ctx) {
    _ctx = ctx;
    if (_ctx && _ctx.log) {
      _ctx.log.info('TNMainList initialized');
    }
  }

  // --------------------------------------------------
  // helpers
  // --------------------------------------------------

  function _getSS() {
    return SpreadsheetApp.openById(MAIN_LIST_SS_ID);
  }

  function _log(msg) {
    if (_ctx && _ctx.log) {
      _ctx.log.info(msg);
    }
  }

  // --------------------------------------------------
  // public API
  // --------------------------------------------------

  /**
   * Reads value from named range in Main List.
   *
   * @param {string} rangeName
   * @returns {*}
   */
  function readNamedRange(rangeName) {
    if (!rangeName) {
      throw new Error('TNMainList.readNamedRange: rangeName is required');
    }

    var ss = _getSS();
    var value = ss.getRangeByName(rangeName).getValue();

    _log('Read named range: ' + rangeName);
    return value;
  }

  /**
   * Reads all values from a sheet in Main List.
   *
   * @param {string} sheetName
   * @returns {Array<Array<any>>}
   */
  function readSheet(sheetName) {
    if (!sheetName) {
      throw new Error('TNMainList.readSheet: sheetName is required');
    }

    var ss = _getSS();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      throw new Error('TNMainList: sheet not found: ' + sheetName);
    }

    var values = sheet.getDataRange().getValues();
    _log('Read sheet: ' + sheetName);

    return values;
  }

  return {
    init: init,
    readNamedRange: readNamedRange,
    readSheet: readSheet
  };

})();