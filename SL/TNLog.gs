/**
 * TNLog — centralized logging service for SL/TN script factory.
 *
 * Responsibilities:
 * - Buffered logging with configurable log levels
 * - Console output (always enabled)
 * - Optional writing logs to spreadsheet ('log' sheet)
 * - Execution grouping with elapsed time
 * - Extra context fields attached to log records
 * - Log sheet rotation (call manually or via scheduled trigger)
 *
 * UI interactions (toast, alert, modal) are NOT handled here.
 * For user interaction use TNModal.
 *
 * IMPORTANT:
 * This module is exported as a factory function
 * to ensure compatibility with Google Apps Script libraries.
 */
function TNLog() {

  // ---------- internal state ----------

  let _ctx = null
  let _config = {
    console: true,
    file: false,
    level: 'INFO'
  }

  const LEVELS = {
    DEBUG:   10,
    INFO:    20,
    SUCCESS: 25,
    ALERT:   30,
    ERROR:   40
  }

  /** @type {{ label: string, ts: number }[]} */
  let _groupStack = []

  /** @type {Object} */
  let _extraContext = {}

  // ---------- public api ----------

  /**
   * Configures TNLog using execution context.
   * Called automatically from TNInitiation().
   *
   * @param {Object} options
   * @param {Object} options.context  - Script execution context (ctx)
   * @param {boolean} options.file   - Enable writing logs to spreadsheet
   * @param {string} options.level   - Minimal log level
   */
  function configure(options) {
    try {
      options = options || {}
      _ctx = options.context || null
      _config = Object.assign(_config, options)
    } catch (e) {
      console.error('TNLog.configure failed', e)
    }
  }

  // ---------- log levels ----------

  /** @param {string} message */
  function debug(message) {
    _log('DEBUG', message)
  }

  /** @param {string} message */
  function info(message) {
    _log('INFO', message)
  }

  /** @param {string} message */
  function success(message) {
    _log('SUCCESS', message)
  }

  /** @param {string} message */
  function alert(message) {
    _log('ALERT', message)
  }

  /** @param {Error|string} error */
  function error(error) {
    const msg =
      error instanceof Error
        ? error.stack || error.message
        : String(error)
    _log('ERROR', msg)
  }

  // ---------- grouping ----------

  /**
   * Opens a named log group. Logs a begin marker at DEBUG level.
   * Groups can be nested.
   *
   * @param {string} label
   */
  function group(label) {
    _groupStack.push({ label: label, ts: Date.now() })
    _log('DEBUG', '── begin: ' + label + ' ──')
  }

  /**
   * Closes the most recently opened log group.
   * Logs an end marker with elapsed time at DEBUG level.
   */
  function groupEnd() {
    const g = _groupStack.pop()
    if (!g) return
    const elapsed = ((Date.now() - g.ts) / 1000).toFixed(1)
    _log('DEBUG', '── end: ' + g.label + ' (' + elapsed + 's) ──')
  }

  // ---------- extra context ----------

  /**
   * Adds a key-value pair to extra context.
   * All subsequent log records will include this context
   * appended to the message as [key=value, ...].
   *
   * @param {string} key
   * @param {string|number} value
   */
  function setContext(key, value) {
    _extraContext[key] = value
  }

  /**
   * Clears all extra context fields.
   * Use when starting a new logical phase of execution.
   */
  function dropContext() {
    _extraContext = {}
  }

  // ---------- flush ----------

  /**
   * Flushes buffered logs to configured outputs.
   * MUST be called in finally block.
   */
  function flush() {
    try {
      if (!_ctx || !_ctx.logBuffer || !_ctx.logBuffer.length) return

      if (_config.file) {
        _writeToLogSheet(_ctx.logBuffer)
      }

      _ctx.logBuffer.length = 0
    } catch (e) {
      console.error('TNLog.flush failed', e)
    }
  }

  // ---------- log rotation ----------

  /**
   * Deletes log rows older than the specified number of days.
   * Reads the Unix timestamp from column G (hidden, added automatically).
   * Safe to call at any time — does nothing if 'log' sheet doesn't exist.
   *
   * Intended to be called from a dedicated scheduled trigger function,
   * NOT from within a regular script execution.
   *
   * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
   * @param {number} retentionDays - Number of days to keep
   */
  function rotateLogs(ss, retentionDays) {
    try {
      const sheet = ss.getSheetByName('log')
      if (!sheet) return

      const lastRow = sheet.getLastRow()
      if (lastRow <= 1) return  // only header

      const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000

      // Column G (index 7) stores Unix timestamp — read all at once
      const tsValues = sheet.getRange(2, 7, lastRow - 1, 1).getValues()

      // Collect rows to delete, process bottom-up to keep indices stable
      const toDelete = []
      for (let i = tsValues.length - 1; i >= 0; i--) {
        const ts = Number(tsValues[i][0])
        if (ts && ts < cutoff) {
          toDelete.push(i + 2) // +2: 1-based + header row
        }
      }

      toDelete.forEach(function (rowIndex) {
        sheet.deleteRow(rowIndex)
      })

      console.log('TNLog.rotateLogs: deleted ' + toDelete.length + ' rows older than ' + retentionDays + ' days')
    } catch (e) {
      console.error('TNLog.rotateLogs failed', e)
    }
  }

  /**
   * Creates a monthly time-based trigger for a log rotation function.
   *
   * The trigger calls the function named `triggerFunctionName` once per month.
   * Safe to call multiple times — checks for existing trigger before creating.
   *
   * Usage: call once manually from the Apps Script IDE to set up.
   *
   * @param {string} triggerFunctionName - Name of the function to trigger (in consumer project)
   *
   * @example
   * // In consumer project, create a wrapper:
   * function RotateLogs() {
   *   const ss = SpreadsheetApp.getActiveSpreadsheet()
   *   SL6_Main.TNLog().rotateLogs(ss, 90)
   * }
   *
   * // Then call once to register the trigger:
   * SL6_Main.TNLog().registerRotationTrigger('RotateLogs')
   */
  function registerRotationTrigger(triggerFunctionName) {
    try {
      const triggers = ScriptApp.getProjectTriggers()
      for (let i = 0; i < triggers.length; i++) {
        if (triggers[i].getHandlerFunction() === triggerFunctionName) {
          console.log('TNLog.registerRotationTrigger: trigger already exists for ' + triggerFunctionName)
          return
        }
      }

      ScriptApp.newTrigger(triggerFunctionName)
        .timeBased()
        .onMonthDay(1)
        .atHour(3)
        .create()

      console.log('TNLog.registerRotationTrigger: created monthly trigger for ' + triggerFunctionName)
    } catch (e) {
      console.error('TNLog.registerRotationTrigger failed', e)
    }
  }

  // ---------- core ----------

  function _log(level, message) {
    try {
      if (!LEVELS[level]) return
      if (LEVELS[level] < LEVELS[_config.level]) return

      // append extra context to message if present
      const contextKeys = Object.keys(_extraContext)
      const contextSuffix = contextKeys.length
        ? ' [' + contextKeys.map(function (k) { return k + '=' + _extraContext[k] }).join(', ') + ']'
        : ''

      const record = {
        ts:          new Date(),
        tsMs:        Date.now(),
        level:       level,
        message:     String(message) + contextSuffix,
        script:      _ctx && _ctx.scriptName  ? _ctx.scriptName  : 'unknown',
        executionId: _ctx && _ctx.executionId ? _ctx.executionId : 'n/a',
        user:        _ctx && _ctx.user        ? _ctx.user        : 'unknown'
      }

      _consoleOutput(record)

      if (_ctx && _ctx.logBuffer) {
        _ctx.logBuffer.push(record)
      }
    } catch (e) {
      console.error('TNLog internal error', e)
    }
  }

  // ---------- transports ----------

  function _consoleOutput(rec) {
    const prefix = _formatPrefix(rec.level)
    console.log(prefix + ' ' + rec.message)
  }

  function _writeToLogSheet(records) {
    try {
      const ss = _ctx.ss
      let sheet = ss.getSheetByName('log')

      if (!sheet) {
        sheet = ss.insertSheet('log')
        sheet.appendRow([
          'Timestamp',           // A — human-readable, spreadsheet timezone
          'Level',               // B
          'Script',              // C
          'ExecutionId',         // D
          'User',                // E
          'Message',             // F
          'TimestampMs'          // G — Unix ms, used for rotation; hide this column
        ])
        // hide column G — it's machine-readable, not for humans
        sheet.hideColumns(7)
      }

      const tz = ss.getSpreadsheetTimeZone()

      const rows = records.map(function (r) {
        return [
          TNHelpers.formatDate(r.ts, tz),
          r.level,
          r.script,
          r.executionId,
          r.user,
          r.message,
          r.tsMs
        ]
      })

      sheet
        .getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length)
        .setValues(rows)

    } catch (e) {
      console.error('TNLog file output failed', e)
    }
  }

  function _formatPrefix(level) {
    switch (level) {
      case 'DEBUG':   return '🔍'
      case 'INFO':    return 'ℹ️'
      case 'SUCCESS': return '✅'
      case 'ALERT':   return '🟡'
      case 'ERROR':   return '❌'
      default:        return ''
    }
  }

  // ---------- export ----------

  return {
    configure:               configure,
    debug:                   debug,
    info:                    info,
    success:                 success,
    alert:                   alert,
    error:                   error,
    group:                   group,
    groupEnd:                groupEnd,
    setContext:              setContext,
    dropContext:             dropContext,
    flush:                   flush,
    rotateLogs:              rotateLogs,
    registerRotationTrigger: registerRotationTrigger
  }
}