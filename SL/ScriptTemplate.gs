/**
 * Canonical script template for SL/TN (SL6_Main) library.
 *
 * ==================================================================
 * ctx SERVICES (access via destructuring or ctx.*)
 * ==================================================================
 *
 * TNLog          log.debug/info/success/alert/error(msg)
 *                log.group(label) / log.groupEnd()
 *                log.setContext(key, value) / log.dropContext()
 *                log.flush()                  ← MANDATORY in finally
 *
 * TNCheck        check.tryStart(ctx)          → { allowed, cleared, state }
 *                check.setProgress(ctx, n)
 *                check.setStatus(ctx, 'text')
 *                check.finish(ctx)            ← MANDATORY in finally
 *                check.getState(ctx) / check.reset(ctx)
 *
 * TNRunTime      runtime.shouldStop(ctx)      → boolean; use inside loops
 *                runtime.assertTime(ctx, lbl) ← throws if budget exceeded
 *                runtime.timeLeft(ctx)        → ms remaining
 *
 * TNDataProcessor
 *                data.readRange(ss, sheet, range)
 *                data.writeRange(ss, sheet, range, values)
 *                data.readNamedRange(ss, name)
 *                data.writeNamedRange(ss, name, value)
 *                data.clearExceptHeader(sheet)
 *                data.copyRange({ sourceSS, sourceSheet, sourceRange,
 *                                 destSS, destSheet, destRange, clear? })
 *                data.updateNamedRange(srcSS, dstSS, srcName, dstName)
 *
 * TNDriveProcessor
 *                drive.configure({ mode: 'API' })
 *                drive.getOrCreateFolder(parent, name) → Folder | folderId
 *                drive.ensureEditorAccess(folderId, email)
 *                drive.extractIdFromUrl(url)  → id
 *                drive.buildFileUrl(fileId)   → url
 *                drive.buildFolderUrl(id)     → url
 *
 * TNMainList     requires enableMainList: true
 *                mainList.readNamedRange(name) → scalar | array
 *                mainList.readSheet(name)      → 2D array
 *
 * TNTabOpener    tabs.open(url)               — USER modes only
 *
 * TNTemplateSelector
 *                templates.getActiveTemplateUrl(name) → url
 *                templates.getActiveTemplate(name)    → { version, url }
 *
 * TNModal        modal.toast/alert/error(msg) — USER_TOAST mode only
 */

// ==================================================================
// MAIN SCRIPT
// ==================================================================

function Script_Template() {

  // Remove next line if script lives directly in GAS (not called from a library)
  const scriptName = SL6_Main.TNGetCallerName() || 'Script_Template'

  const ctx = SL6_Main.TNInitiation({

    scriptName: scriptName,

    // --- run mode (pick one) ---
    runMode: 'TRIGGER_LOG_UI',    // trigger → log to 'log' sheet + UI
    // runMode: 'TRIGGER_UI',     // trigger → UI log only, no file
    // runMode: 'TRIGGER_SILENT', // trigger → silent, console only
    // runMode: 'USER_SILENT',    // manual  → no UI, no toast
    // runMode: 'USER_TOAST',     // manual  → toast to user

    // --- time budget ---
    // TNRunTime uses this for shouldStop() / assertTime()
    // TNCheck auto-clears stalled runs after this duration
    // Omit → no auto-clear, shouldStop() always returns false
    maxDurationMs: 5 * 60 * 1000,  // 5 minutes

    // --- data backend ---
    // 'GAS' → SpreadsheetApp
    // 'API' → Sheets Advanced API (enable in Advanced Google Services)
    dataMode: 'GAS',

    // --- optional: Main List spreadsheet reader ---
    // true  → ctx.mainList available; false → ctx.mainList is null
    enableMainList: false,

    // --- log level: DEBUG | INFO (default) | SUCCESS | ALERT | ERROR ---
    logLevel: 'INFO',

    // --- debug: true → dump full ctx to log on init ---
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

    // --- point of no return ---
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

// ==================================================================
// LOG ROTATION
// Call RotateLogs() manually or via monthly trigger (see below).
// ==================================================================

/**
 * Deletes log rows older than 90 days from the 'log' sheet.
 * Adjust retentionDays as needed.
 * Run manually or via trigger registered by SetupRotationTrigger().
 */
function RotateLogs() {
  SL6_Main.TNLog().rotateLogs(SpreadsheetApp.getActiveSpreadsheet(), 90)
}

/**
 * Registers a monthly trigger that calls RotateLogs() on the 1st of each month.
 * Call this function ONCE manually from the Apps Script IDE.
 * Safe to call multiple times — will not create duplicate triggers.
 */
function SetupRotationTrigger() {
  SL6_Main.TNLog().registerRotationTrigger('RotateLogs')
}