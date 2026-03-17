/**
 * TNModal — UI interaction factory for SL/TN scripts.
 *
 * Provides safe, runMode-aware methods for user notifications.
 * All methods are no-op in non-interactive environments.
 *
 * IMPORTANT:
 * This module is exported as a factory function
 * to ensure compatibility with Google Apps Script libraries.
 */
function TNModal() {

  let _ctx = null

  /**
   * Configures TNModal with execution context.
   * Called automatically from TNInitiation().
   *
   * @param {Object} context - Script execution context (ctx)
   */
  function configure(context) {
    _ctx = context || null
  }

  /**
   * Shows non-blocking toast message to user.
   * Works only in interactive Spreadsheet context.
   *
   * @param {string} message
   */
  function toast(message) {
    _safeUiCall(function () {
      SpreadsheetApp.getActive().toast(String(message))
    })
  }

  /**
   * Shows informational message to user.
   * Currently mapped to toast.
   *
   * @param {string} message
   */
  function info(message) {
    toast(message)
  }

  /**
   * Shows blocking alert dialog.
   *
   * @param {string} message
   */
  function alert(message) {
    _safeUiCall(function () {
      SpreadsheetApp.getUi().alert(String(message))
    })
  }

  /**
   * Shows blocking error dialog.
   *
   * @param {string} message
   */
  function error(message) {
    _safeUiCall(function () {
      SpreadsheetApp.getUi().alert(
        'Error',
        String(message),
        SpreadsheetApp.getUi().ButtonSet.OK
      )
    })
  }

  // ---------- helpers ----------

  function _safeUiCall(fn) {
    try {
      if (!_ctx) return
      if (!_isUiAllowed()) return
      fn()
    } catch (e) {
      // UI must never break script execution
      console.error('TNModal UI call failed', e)
    }
  }

  /**
   * Determines whether UI interaction is allowed
   * for current execution context.
   *
   * UI is allowed only for USER_TOAST run mode.
   */
  function _isUiAllowed() {
    return _ctx && _ctx.runMode === 'USER_TOAST'
  }

  // ---------- export ----------

  return {
    configure: configure,
    toast: toast,
    info: info,
    alert: alert,
    error: error
  }
}