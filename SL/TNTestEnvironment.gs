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
 * - Declared as var (not const/let) for GAS library export compatibility
 *
 * Usage from consumer project:
 *
 *   function TestEnvironment() {
 *     SL6_Main.TNTestEnvironment.run()
 *   }
 */
var TNTestEnvironment = {

  /**
   * Entry point for environment test.
   * Should be called directly by user.
   */
  run: function () {
    var user = this._safeGetActiveUser()

    var authInfo = ScriptApp.getAuthorizationInfo(
      ScriptApp.AuthMode.FULL
    )

    if (
      authInfo.getAuthorizationStatus() ===
      ScriptApp.AuthorizationStatus.REQUIRED
    ) {
      this._requestAuthorization(authInfo.getAuthorizationUrl(), user)
      return
    }

    this._notifyReady(user)
  },

  // ---------- internal helpers ----------

  _requestAuthorization: function (authUrl, user) {
    try {
      var html = HtmlService.createHtmlOutput(
        '<script>' +
        "window.open('" + authUrl + "');" +
        'google.script.host.close();' +
        '</script>'
      )
      SpreadsheetApp
        .getUi()
        .showModalDialog(html, 'Authorization required')
    } catch (e) {
      console.error('TNTestEnvironment auth UI failed', e)
    }
  },

  _notifyReady: function (user) {
    try {
      SpreadsheetApp.getActive().toast(
        user + '\n✅ Environment is ready',
        'SL6_Main',
        5
      )
    } catch (e) {
      console.error('TNTestEnvironment toast failed', e)
    }
  },

  _safeGetActiveUser: function () {
    try {
      return Session.getActiveUser().getEmail()
    } catch (e) {
      return 'unknown@local'
    }
  }

}