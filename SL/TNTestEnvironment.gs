/**
 * TNTestEnvironment — preflight environment and authorization checker.
 *
 * This module is intended to be called MANUALLY by a user
 * before running any business scripts that rely on SL6_Main.
 *
 * Responsibilities:
 * - Check whether all required OAuth scopes are granted
 * - If not granted — open Google authorization page in a new browser tab
 * - Notify user (via toast) that environment is ready
 * - Always display the login of the user who launched the check
 *
 * IMPORTANT:
 * - TNTestEnvironment is NOT part of TNInitiation lifecycle
 * - It must be called explicitly from a consumer project
 * - Safe to call multiple times
 *
 * Usage from consumer project:
 *
 *   function TestEnvironment() {
 *     SL6_Main.TNTestEnvironment.run()
 *   }
 */
const TNTestEnvironment = (() => {

  /**
   * Entry point for environment test.
   * Should be called directly by user.
   */
  function run() {
    const user = _safeGetActiveUser()

    const authInfo = ScriptApp.getAuthorizationInfo(
      ScriptApp.AuthMode.FULL
    )

    if (
      authInfo.getAuthorizationStatus() ===
      ScriptApp.AuthorizationStatus.REQUIRED
    ) {
      _requestAuthorization(authInfo.getAuthorizationUrl(), user)
      return
    }

    _notifyReady(user)
  }

  // ----------------------------------------------------
  // internal helpers
  // ----------------------------------------------------

  function _requestAuthorization(authUrl, user) {
    try {
      const html = HtmlService.createHtmlOutput(
        `<script>
           window.open('${authUrl}');
           google.script.host.close();
         </script>`
      )
      SpreadsheetApp
        .getUi()
        .showModalDialog(html, 'Authorization required')
    } catch (e) {
      console.error('TNTestEnvironment auth UI failed', e)
    }
  }

  function _notifyReady(user) {
    try {
      SpreadsheetApp.getActive().toast(
        user + '\n✅ Environment is ready',
        'SL6_Main',
        5
      )
    } catch (e) {
      console.error('TNTestEnvironment toast failed', e)
    }
  }

  function _safeGetActiveUser() {
    try {
      return Session.getActiveUser().getEmail()
    } catch (e) {
      return 'unknown@local'
    }
  }

  return {
    run
  }

})()