/**
 * Canonical script template for SL/TN (SL6_Main) library.
 *
 * ==================================================================
 * AVAILABLE ctx SERVICES
 * ==================================================================
 *
 * --- Logging (TNLog) ---
 *
 *   log.info('message')
 *   log.success('message')
 *   log.alert('message')
 *   log.error(errorObject)
 *   log.flush()              // MANDATORY in finally block
 *
 * --- Execution state / concurrency (TNCheck) ---
 *
 *   const lock = check.tryStart(ctx)   // → { allowed, cleared, state }
 *   check.setProgress(ctx, n)          // numeric step indicator
 *   check.setStatus(ctx, 'text')       // text status for UI / formulas
 *   check.finish(ctx)                  // MANDATORY in finally block
 *   check.getState(ctx)                // → current state object
 *   check.reset(ctx)                   // force-clear stuck execution
 *
 * --- Runtime time control (TNRunTime) ---
 *
 *   runtime.shouldStop(ctx)            // → boolean; soft check inside loops
 *   runtime.assertTime(ctx, 'label')   // throws if budget exceeded; use before heavy ops
 *   runtime.timeLeft(ctx)              // → ms remaining
 *
 * --- Data access (TNDataProcessor) ---
 *
 *   data.readRange(ss, 'Sheet1', 'A2:D')
 *   data.writeRange(ss, 'Sheet1', 'A2', values)
 *   data.readNamedRange(ss, 'RangeName')
 *   data.writeNamedRange(ss, 'RangeName', value)
 *   data.clearExceptHeader(sheet)
 *   data.copyRange({ sourceSS, sourceSheet, sourceRange,
 *                    destSS, destSheet, destRange, clear? })
 *   data.updateNamedRange(srcSS, dstSS, 'SRC_NAME', 'DST_NAME')
 *
 * --- Drive access (TNDriveProcessor) ---
 *
 *   drive.configure({ mode: 'API' })                    // override mode if needed
 *   drive.getOrCreateFolder(parentFolder, 'FolderName') // GAS: Folder obj → Folder obj
 *   drive.getOrCreateFolder('parentId', 'FolderName')   // API: string → string id
 *   drive.ensureEditorAccess(folderId, userEmail)
 *   drive.extractIdFromUrl(url)                         // → id string
 *   drive.buildFileUrl(fileId)                          // → spreadsheet URL
 *   drive.buildFolderUrl(folderId)                      // → folder URL
 *
 * --- Main List (TNMainList) — requires enableMainList: true ---
 *
 *   mainList.readNamedRange('RangeName')   // → scalar or array
 *   mainList.readSheet('SheetName')        // → 2D array (with header)
 *
 * --- Browser tab opener (TNTabOpener) ---
 *
 *   tabs.open(url)   // only in USER_SILENT / USER_TOAST modes
 *
 * --- Template resolution (TNTemplateSelector) ---
 *
 *   templates.getActiveTemplateUrl('CE')          // → url string
 *   templates.getActiveTemplate('CE')             // → { version, url }
 *
 * --- UI dialogs (TNModal) — only in USER_TOAST mode ---
 *
 *   modal.toast('message')    // non-blocking notification
 *   modal.alert('message')    // blocking dialog
 *   modal.error('message')    // blocking error dialog
 */
function Script_Template() {

  // scriptName: TNGetCallerName() detects the function name automatically
  // when the script is called from a consumer project (not inside a library).
  // If the script lives directly in GAS IDE — remove this line and pass
  // scriptName as a string literal in TNInitiation below.
  const scriptName = SL6_Main.TNGetCallerName() || 'Script_Template'

  const ctx = SL6_Main.TNInitiation({

    scriptName: scriptName,

    // --- run mode (pick one) ---
    runMode: 'TRIGGER_LOG_UI',   // background trigger → log written to 'log' sheet + UI
    // runMode: 'TRIGGER_UI',    // background trigger → UI log only, no file
    // runMode: 'TRIGGER_SILENT',// background trigger → fully silent, console only
    // runMode: 'USER_SILENT',   // manual run → no UI, no toast, console only
    // runMode: 'USER_TOAST',    // manual run → toast shown to user, console only

    // --- time budget ---
    // If set: TNRunTime.shouldStop() and assertTime() use this value.
    // TNCheck auto-clears stalled executions after this duration.
    // If omitted: no auto-clear, shouldStop() always returns false.
    maxDurationMs: 5 * 60 * 1000, // 5 minutes

    // --- data backend ---
    // 'GAS' → SpreadsheetApp (getRange / getValues / setValues)
    // 'API' → Sheets Advanced API (Sheets.Spreadsheets.Values)
    //         requires Advanced Google Services: Google Sheets API
    dataMode: 'GAS',

    // --- optional services ---
    // true  → ctx.mainList is available (TNMainList instance)
    // false → ctx.mainList is null (default, saves one SS open call)
    enableMainList: false,

    // --- log level ---
    // Messages below this level are suppressed.
    // 'DEBUG' | 'INFO' (default) | 'SUCCESS' | 'ALERT' | 'ERROR'
    logLevel: 'INFO',

    // --- debug mode ---
    // true → dumps full ctx summary to log immediately after init
    debug: false

  })

  const { log, check, runtime, data, drive, templates, tabs, modal, mainList } = ctx

  // --- concurrency guard ---
  const lock = check.tryStart(ctx)
  if (!lock.allowed) {
    log.alert('Execution already in progress')
    log.flush()
    return
  }

  try {

    log.info('Execution started')

    // --- step 1 ---
    check.setProgress(ctx, 1)
    check.setStatus(ctx, 'step 1')
    if (runtime.shouldStop(ctx)) return

    // --- step 2 ---
    check.setProgress(ctx, 2)
    check.setStatus(ctx, 'step 2')
    if (runtime.shouldStop(ctx)) return

    // --- step 3 ---
    check.setProgress(ctx, 3)
    check.setStatus(ctx, 'step 3')
    if (runtime.shouldStop(ctx)) return

    // --- point of no return: assert enough time before heavy write ---
    runtime.assertTime(ctx, 'before final write')

    // --- step 4 ---
    check.setProgress(ctx, 4)
    check.setStatus(ctx, 'step 4')

    // --- done ---
    check.setProgress(ctx, 5)
    check.setStatus(ctx, 'completed')
    log.success('Script finished successfully')

  } catch (e) {

    check.setStatus(ctx, 'failed: ' + (e.message || e))
    log.error(e)

  } finally {

    check.finish(ctx)
    log.flush()

  }
}