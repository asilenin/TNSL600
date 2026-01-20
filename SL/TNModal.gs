/**
 * TNModal — UI interaction factory for SL/TN scripts.
 *
 * Provides safe, runMode-aware methods for user notifications.
 * All methods are no-op in non-interactive environments.
 */
const TNModal = (() => {

  let _ctx = null

  function configure(context) {
    _ctx = context
  }

  /**
   * Shows non-blocking toast message to user.
   * Works only in interactive Spreadsheet context.
   *
   * @param {string} message
   */
  function toast(message) {
    _safeUiCall(() => {
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
    _safeUiCall(() => {
      SpreadsheetApp.getUi().alert(String(message))
    })
  }

  /**
   * Shows blocking error dialog.
   *
   * @param {string} message
   */
  function error(message) {
    _safeUiCall(() => {
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
      if (!_ctx.runMode) return
      if (!_isUiAllowed()) return

      fn()
    } catch (e) {
      // UI must never break script execution
      console.error('TNModal UI call failed', e)
    }
  }

  function _isUiAllowed() {
    return (
      _ctx.runMode === 'USER_TOAST' ||
      _ctx.runMode === 'USER_SILENT'
    ) === false
      ? false
      : _ctx.runMode === 'USER_TOAST'
  }

  return {
    configure,
    toast,
    info,
    alert,
    error
  }

})()