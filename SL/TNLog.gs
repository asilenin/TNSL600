/**
 * TNLog — centralized logging service for SL/TN script factory.
 *
 * Responsibilities:
 * - Buffered logging
 * - Console output (always enabled)
 * - Optional writing logs to spreadsheet
 *
 * UI interactions (toast, alert, modal) are NOT handled here.
 * For user interaction use TNModal.
 */
const TNLog = (() => {

  // ---------- internal state ----------
  let _ctx = null
  let _config = {
    console: true,
    file: false,
    level: 'INFO'
  }

  const LEVELS = {
    DEBUG: 10,
    INFO: 20,
    SUCCESS: 25,
    ALERT: 30,
    ERROR: 40
  }

  // ---------- public api ----------

  /**
   * Configures TNLog using execution context.
   * Called automatically from TNInitiation().
   *
   * @param {Object} options
   * @param {Object} options.context - Script execution context (TNSV)
   * @param {boolean} options.file - Enable writing logs to spreadsheet
   * @param {string} options.level - Minimal log level
   *
   * @internal
   */
  function configure(options = {}) {
    try {
      _ctx = options.context || null
      _config = Object.assign(_config, options)
    } catch (e) {
      console.error('TNLog.configure failed', e)
    }
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

  /**
   * Flushes buffered logs to configured outputs.
   * Must be called in finally block.
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

  // ---------- core ----------

  function _log(level, message) {
    try {
      if (!LEVELS[level]) return
      if (LEVELS[level] < LEVELS[_config.level]) return

      const record = {
        ts: new Date(),
        level,
        message: String(message),
        script: _ctx?.scriptName || 'unknown',
        executionId: _ctx?.executionId || 'n/a',
        user: _ctx?.user || 'unknown'
      }

      // console is always enabled
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
    console.log(`${prefix} ${rec.message}`)
  }

  function _writeToLogSheet(records) {
    try {
      const ss = _ctx.ss
      let sheet = ss.getSheetByName('log')

      if (!sheet) {
        sheet = ss.insertSheet('log')
        sheet.appendRow([
          'Timestamp',
          'Level',
          'Script',
          'ExecutionId',
          'User',
          'Message'
        ])
      }

      const rows = records.map(r => [
        Utilities.formatDate(
          r.ts,
          'Europe/Moscow',
          'dd.MM.yyyy HH:mm:ss'
        ),
        r.level,
        r.script,
        r.executionId,
        r.user,
        r.message
      ])

      sheet
        .getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length)
        .setValues(rows)

    } catch (e) {
      console.error('TNLog file output failed', e)
    }
  }

  function _formatPrefix(level) {
    switch (level) {
      case 'SUCCESS': return '✅'
      case 'ERROR': return '❌'
      case 'ALERT': return '🟡'
      case 'INFO': return 'ℹ️'
      default: return ''
    }
  }

  return {
    configure,
    info,
    success,
    alert,
    error,
    flush
  }

})()