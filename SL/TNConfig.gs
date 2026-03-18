/**
 * TNConfig — shared constants for SL6_Main library.
 *
 * Contains all hardcoded values used across library modules.
 * Consumer scripts can read these values via SL6_Main.TNConfig.
 *
 * Declared as var for GAS library export compatibility.
 *
 * ==================================================================
 * SETUP INSTRUCTIONS
 * ==================================================================
 *
 * MAIN_LIST_SS_ID must be set once during system setup.
 * All other values are library defaults and do not need to be changed.
 *
 * After running TNSetup (system initialization):
 *   1. Copy the created Main List spreadsheet ID
 *   2. Replace the placeholder value in MAIN_LIST_SS_ID below
 *   3. Publish the updated library version
 */
var TNConfig = {

  // ---------- version ----------

  /**
   * Current library version.
   * Follows Semantic Versioning: MAJOR.MINOR.PATCH[-stage]
   * All versions prior to 1.0.0 are beta.
   *
   * Access from consumer script: SL6_Main.TNConfig.VERSION
   *
   * @example
   * ctx.log.info('Library: ' + SL6_Main.TNConfig.VERSION)
   * // -> 6.1.0-beta
   *
   * @type {string}
   */
  VERSION: '6.1.0-beta',

  // ---------- system ----------

  /**
   * ID of the Main List spreadsheet.
   * Set once during system setup — never changes after that.
   *
   * Placeholder — replace with actual ID after running TNSetup.
   *
   * @type {string}
   */
  MAIN_LIST_SS_ID: 'PUT_MAIN_LIST_SPREADSHEET_ID_HERE',

  // ---------- spreadsheet ----------

  /**
   * Name of the sheet used for log output.
   * Used by TNLog when runMode is TRIGGER_LOG_UI.
   *
   * @type {string}
   */
  LOG_SHEET_NAME: 'log',

  // ---------- named ranges ----------

  /**
   * Named range in Main List spreadsheet that holds
   * the ID of the template registry spreadsheet.
   * Used by TNTemplateSelector.
   *
   * @type {string}
   */
  TEMPLATES_RANGE_NAME: 'templatesList',

  // ---------- defaults ----------

  /**
   * Default execution mode when runMode is not specified in TNInitiation.
   *
   * @type {string}
   */
  DEFAULT_RUN_MODE: 'USER_SILENT',

  /**
   * Default data backend when dataMode is not specified in TNInitiation.
   * 'GAS' uses SpreadsheetApp; 'API' uses Sheets Advanced API.
   *
   * @type {string}
   */
  DEFAULT_DATA_MODE: 'GAS',

  /**
   * Default minimum log level when logLevel is not specified in TNInitiation.
   * Messages below this level are suppressed.
   *
   * @type {string}
   */
  DEFAULT_LOG_LEVEL: 'INFO',

  /**
   * Default date/time format string for TNHelpers.formatDate and TNLog.
   * Uses Utilities.formatDate pattern syntax.
   *
   * @type {string}
   */
  DEFAULT_DATE_FORMAT: 'dd.MM.yyyy HH:mm:ss',

  /**
   * Safety margin in milliseconds used by TNRunTime.shouldStop() and assertTime().
   * Execution is considered unsafe when timeLeft drops below this value.
   *
   * @type {number}
   */
  DEFAULT_SAFETY_MS: 30 * 1000,

  /**
   * Fallback script name used when TNInitiation cannot detect the caller function name.
   *
   * @type {string}
   */
  UNKNOWN_SCRIPT_NAME: 'unknownScript'

}