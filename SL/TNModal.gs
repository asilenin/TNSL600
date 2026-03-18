/**
 * TNModal — UI interaction factory for SL/TN scripts.
 *
 * Provides safe, runMode-aware methods for user notifications and input.
 * All methods degrade gracefully when UI is unavailable:
 * - In USER_TOAST: full UI (toast, alert, confirm, prompt)
 * - In USER_SILENT: all calls are suppressed and logged via ctx.log.debug
 * - In TRIGGER_*:  same as USER_SILENT — no UI, no exceptions
 *
 * This ensures scripts written for interactive use do not crash
 * when accidentally or intentionally run via trigger.
 *
 * IMPORTANT:
 * This module is exported as a factory function
 * to ensure compatibility with Google Apps Script libraries.
 */
function TNModal() {

  let _ctx = null

  /**
   * Configures TNModal with execution context.
   * Called automatically from TNInitiation() after log is configured.
   *
   * @param {Object} context - Script execution context (ctx)
   */
  function configure(context) {
    _ctx = context || null
  }

  // ---------- notification ----------

  /**
   * Shows non-blocking toast message to user.
   * USER_TOAST: shows native Spreadsheet toast.
   * Other modes: suppressed, logged at DEBUG level.
   *
   * @param {string} message
   * @param {string} [title='']
   * @param {number} [durationSec=5]
   */
  function toast(message, title, durationSec) {
    if (!_isUiAllowed()) {
      _logSuppressed('toast', message)
      return
    }
    _safeUiCall(function () {
      SpreadsheetApp.getActive().toast(
        String(message),
        title ? String(title) : '',
        typeof durationSec === 'number' ? durationSec : 5
      )
    })
  }

  /**
   * Shows blocking alert dialog.
   * USER_TOAST: shows native alert dialog.
   * Other modes: suppressed, logged at DEBUG level.
   *
   * @param {string} message
   */
  function alert(message) {
    if (!_isUiAllowed()) {
      _logSuppressed('alert', message)
      return
    }
    _safeUiCall(function () {
      SpreadsheetApp.getUi().alert(String(message))
    })
  }

  /**
   * Shows blocking error dialog.
   * USER_TOAST: shows native error dialog.
   * Other modes: suppressed, logged at DEBUG level.
   *
   * @param {string} message
   */
  function error(message) {
    if (!_isUiAllowed()) {
      _logSuppressed('error dialog', message)
      return
    }
    _safeUiCall(function () {
      SpreadsheetApp.getUi().alert(
        'Error',
        String(message),
        SpreadsheetApp.getUi().ButtonSet.OK
      )
    })
  }

  // ---------- user input ----------

  /**
   * Shows a Yes/No confirmation dialog.
   * USER_TOAST: shows native confirm dialog, returns true (OK) or false (Cancel).
   * Other modes: suppressed, logged at DEBUG level, returns defaultValue.
   *
   * @param {string} message
   * @param {boolean} [defaultValue=false] - Returned when UI is unavailable
   * @returns {boolean}
   */
  function confirm(message, defaultValue) {
    const fallback = defaultValue === true ? true : false

    if (!_isUiAllowed()) {
      _logSuppressed('confirm (returning default: ' + fallback + ')', message)
      return fallback
    }

    let result = fallback
    _safeUiCall(function () {
      const ui       = SpreadsheetApp.getUi()
      const response = ui.alert(
        String(message),
        ui.ButtonSet.OK_CANCEL
      )
      result = response === ui.Button.OK
    })
    return result
  }

  /**
   * Shows a text input prompt dialog.
   * USER_TOAST: shows native prompt dialog, returns entered text or null if cancelled.
   * Other modes: suppressed, logged at DEBUG level, returns defaultValue.
   *
   * @param {string} message
   * @param {string|null} [defaultValue=''] - Returned when UI is unavailable
   * @returns {string|null}
   */
  function prompt(message, defaultValue) {
    const fallback = defaultValue !== undefined ? defaultValue : ''

    if (!_isUiAllowed()) {
      _logSuppressed('prompt (returning default: "' + fallback + '")', message)
      return fallback
    }

    let result = fallback
    _safeUiCall(function () {
      const ui       = SpreadsheetApp.getUi()
      const response = ui.prompt(String(message), ui.ButtonSet.OK_CANCEL)
      result = response.getSelectedButton() === ui.Button.OK
        ? response.getResponseText()
        : null
    })
    return result
  }

  // ---------- internal helpers ----------

  /**
   * Whether UI interaction is allowed in the current run mode.
   * Only USER_TOAST permits actual UI display.
   */
  function _isUiAllowed() {
    return _ctx && _ctx.runMode === 'USER_TOAST'
  }

  /**
   * Logs a suppressed UI call at DEBUG level.
   * Falls back to console.log if ctx.log is not yet available.
   *
   * @param {string} method
   * @param {string} message
   */
  function _logSuppressed(method, message) {
    const text = 'TNModal.' + method + ' suppressed [' +
      (_ctx ? _ctx.runMode : 'no ctx') + ']: ' + message
    try {
      if (_ctx && _ctx.log) {
        _ctx.log.debug(text)
      } else {
        console.log(text)
      }
    } catch (_) {
      console.log(text)
    }
  }

  /**
   * Executes a UI call safely — never breaks script execution.
   *
   * @param {Function} fn
   */
  function _safeUiCall(fn) {
    try {
      fn()
    } catch (e) {
      console.error('TNModal UI call failed', e)
    }
  }

  // ---------- export ----------

  return {
    configure,
    toast,
    alert,
    error,
    confirm,
    prompt
  }
}