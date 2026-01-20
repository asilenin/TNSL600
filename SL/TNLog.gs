/**
 * TNLog — centralized logging service for SL/TN script factory.
 *
 * Features:
 * - Buffered logging (logs are written only on flush)
 * - Console output is always enabled
 * - Optional output to spreadsheet log, UI sheet, or toast
 * - Safe by design: logging failures never interrupt script execution
 *
 * TNLog MUST be configured via TNInitiation().
 * Direct usage without initialization is not supported.
 */
const TNLog = (() => {

  // ---------- internal state ----------
  let _ctx = null
  let _config = {
    console: true,
    file: false,
    ui: false,
    toast: false,
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
 * Configures TNLog using execution context and environment settings.
 *
 * This method is called automatically by TNInitiation()
 * and should NOT be called manually in business logic.
 *
 * @param {Object} options - Logger configuration
 * @param {Object} options.context - Script execution context (TNSV)
 * @param {boolean} options.console - Enable console logging (always true by convention)
 * @param {boolean} options.file - Enable writing logs to spreadsheet
 * @param {boolean} options.ui - Enable writing logs to UI sheet
 * @param {boolean} options.toast - Enable toast notifications
 * @param {string} options.level - Minimal log level to record
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

/**
 * Writes an informational log message.
 *
 * Intended for normal execution flow messages.
 *
 * @param {string} message - Log message
 *
 * @example
 * TNLog.info('Processing started');
 */
  function info(message) {
    return _log('INFO', message)
  }

/**
 * Writes a success log message.
 *
 * Intended to mark successful completion of an operation.
 *
 * @param {string} message - Log message
 *
 * @example
 * TNLog.success('Data successfully updated');
 */
  function success(message) {
    return _log('SUCCESS', message)
  }

/**
 * Writes an alert log message.
 *
 * Intended for important but non-fatal situations
 * that require attention.
 *
 * @param {string} message - Log message
 *
 * @example
 * TNLog.alert('Queue is empty, waiting');
 */
  function alert(message) {
    return _log('ALERT', message)
  }

/**
 * Writes an error log message.
 *
 * Accepts either an Error object or a string.
 * Stack trace is logged when available.
 *
 * @param {Error|string} error - Error object or error description
 *
 * @example
 * TNLog.error(e);
 */
  function error(err) {
    const msg = err instanceof Error ? err.stack || err.message : err
    return _log('ERROR', msg)
  }

/**
 * Flushes buffered log records to all configured outputs.
 *
 * This method MUST be called in the `finally` block
 * of every script using TNLog.
 *
 * It writes:
 * - accumulated logs to spreadsheet (if enabled)
 * - accumulated logs to UI sheet (if enabled)
 *
 * After flushing, the log buffer is cleared.
 *
 * @example
 * finally {
 *   TNLog.flush();
 * }
 */
  function flush() {
    try {
      if (!_ctx || !_ctx.logBuffer || !_ctx.logBuffer.length) return

      if (_config.file) {
        _writeToLogSheet(_ctx.logBuffer)
      }

      if (_config.ui) {
        _writeToUi(_ctx.logBuffer)
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

      // console is always on
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
        Utilities.formatDate(r.ts, 'Europe/Moscow', 'dd.MM.yyyy HH:mm:ss'),
        r.level,
        r.script,
        r.executionId,
        r.user,
        r.message
      ])

      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length)
        .setValues(rows)

    } catch (e) {
      console.error('TNLog file output failed', e)
    }
  }

  function _writeToUi(records) {
    try {
      const ss = _ctx.ss
      let sheet = ss.getSheetByName('log_ui')
      if (!sheet) {
        sheet = ss.insertSheet('log_ui')
      }

      const text = records
        .map(r => `${_formatPrefix(r.level)} ${r.message}`)
        .join('\n')

      sheet.getRange('A1').setValue(text)

    } catch (e) {
      console.error('TNLog UI output failed', e)
    }
  }

  // ---------- helpers ----------

  function _formatPrefix(level) {
    switch (level) {
      case 'SUCCESS': return '✅'
      case 'ERROR': return '❌'
      case 'ALERT': return '🟡'
      case 'INFO': return 'ℹ️'
      default: return ''
    }
  }

  // ---------- exposed ----------
  return {
    configure,
    info,
    success,
    alert,
    error,
    flush
  }

})()