/**
 * TNTabOpener — safe browser tab opener for Spreadsheet UI context.
 *
 * Responsibilities:
 * - Open external URLs in a new browser tab
 * - Work ONLY in user-interactive Spreadsheet executions
 * - Never break script execution in trigger / background modes
 *
 * Usage:
 *   ctx.tabs.open(url)
 *
 * This module MUST be used via ctx (initialized by TNInitiation).
 */
function TNTabOpener(ctx) {

  /**
   * Opens a URL in a new browser tab.
   *
   * Works only when:
   * - script is executed by a user
   * - Spreadsheet UI is available
   *
   * In trigger / background modes — silently ignored.
   *
   * @param {string} url
   */
  function open(url) {
    try {
      if (!ctx) return
      if (!ctx.runMode) return

      // allow only explicit user UI modes
      if (
        ctx.runMode !== 'USER_TOAST' &&
        ctx.runMode !== 'USER_SILENT'
      ) {
        ctx.log?.info('TNTabOpener: UI not allowed in runMode ' + ctx.runMode)
        return
      }

      if (!url) {
        ctx.log?.alert('TNTabOpener: empty URL')
        return
      }

      const html =
        '<script>' +
        "window.open('" + String(url) + "', '_blank');" +
        'google.script.host.close();' +
        '</script>'

      const output = HtmlService
        .createHtmlOutput(html)
        .setWidth(100)
        .setHeight(10)

      SpreadsheetApp
        .getUi()
        .showModalDialog(output, 'Opening link')

      ctx.log?.info('Opened tab: ' + url)

    } catch (e) {
      // UI errors must NEVER break execution
      ctx.log?.error('TNTabOpener failed: ' + e)
    }
  }

  return {
    open
  }
}