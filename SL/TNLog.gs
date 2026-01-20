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

  function configure(options = {}) {
    try {
      _ctx = options.context || null
      _config = Object.assign(_config, options)
    } catch (e) {
      console.error('TNLog.configure failed', e)
    }
  }

  function info(message) {
    return _log('INFO', message)
  }

  function success(message) {
    return _log('SUCCESS', message)
  }

  function alert(message) {
    return _log('ALERT', message)
  }

  function error(err) {
    const msg = err instanceof Error ? err.stack || err.message : err
    return _log('ERROR', msg)
  }

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