/**
 * Canonical script template for SL/TN (SL6_Main) library.
 *
 * ==================================================================
 * USING SL6_Main FROM A CONSUMER SCRIPT
 * ==================================================================
 *
 * 1) Initialization (MANDATORY)
 *
 *   const ctx = SL6_Main.TNInitiation({
 *     scriptName:    'MyScript',         // required when called from a library
 *     runMode:       'TRIGGER_LOG_UI',   // execution mode (see Run Modes below)
 *     maxDurationMs: 5 * 60 * 1000,     // execution time budget in ms
 *     dataMode:      'GAS',             // data backend: 'GAS' | 'API'
 *     debug:         false              // true → dump ctx to log on start
 *   })
 *
 * 2) Destructure services for readability (optional but recommended)
 *
 *   const { log, check, runtime, data, drive, templates, tabs } = ctx
 *
 * ==================================================================
 * RUN MODES
 * ==================================================================
 *
 *   USER_SILENT    — manual run, no UI, no toast, console only
 *   USER_TOAST     — manual run, toast to user, console only
 *   TRIGGER_LOG_UI — background trigger, log to file + UI, no toast
 *   TRIGGER_UI     — background trigger, UI log only
 *   TRIGGER_SILENT — background trigger, fully silent, console only
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
 *
 * --- Runtime time control (TNRunTime) ---
 *
 *   runtime.shouldStop(ctx)              // → boolean; use inside loops
 *   runtime.assertTime(ctx, 'label')     // throws if time budget exceeded
 *   runtime.timeLeft(ctx)               // → ms remaining
 *
 * --- Data access (TNDataProcessor) ---
 *
 *   // Regular ranges
 *   data.readRange(ss, 'Sheet1', 'A2:D')
 *   data.writeRange(ss, 'Sheet1', 'A2', values)
 *
 *   // Named ranges
 *   data.readNamedRange(ss, 'MyNamedRange')
 *   data.writeNamedRange(ss, 'MyNamedRange', value)
 *
 *   // Copy range between spreadsheets
 *   data.copyRange({
 *     sourceSS:    srcSS,
 *     sourceSheet: 'Source',
 *     sourceRange: 'A2:D',
 *     destSS:      dstSS,
 *     destSheet:   'Dest',
 *     destRange:   'A2',
 *     clear:       true
 *   })
 *
 *   // Named range → named range
 *   data.updateNamedRange(srcSS, dstSS, 'SRC_NAME', 'DST_NAME')
 *
 * --- Drive access (TNDriveProcessor) ---
 *
 *   // Mode is inherited from ctx.dataMode; override if needed:
 *   drive.configure({ mode: 'API' })
 *
 *   // GAS mode: work with Folder objects
 *   const root = DriveApp.getRootFolder()
 *   const folder = drive.getOrCreateFolder(root, ctx.scriptName)
 *   drive.ensureEditorAccess(folder.getId(), ctx.user)
 *   const url = drive.buildFolderUrl(folder.getId())
 *
 *   // API mode: work with folder IDs (strings)
 *   drive.configure({ mode: 'API' })
 *   const folderId = drive.getOrCreateFolder('PARENT_FOLDER_ID', 'Reports')
 *   drive.ensureEditorAccess(folderId, ctx.user)
 *
 *   // URL helpers
 *   const fileId = drive.extractIdFromUrl('https://docs.google.com/...')
 *   const fileUrl = drive.buildFileUrl(fileId)
 *
 * --- Browser tab opener (TNTabOpener) ---
 *
 *   tabs.open(url)   // works only in USER_SILENT / USER_TOAST modes
 *
 * --- Template resolution (TNTemplateSelector) ---
 *
 *   const url = templates.getActiveTemplateUrl('CE')
 *
 *   const tpl = templates.getActiveTemplate('CE')
 *   // tpl.version  — version identifier from registry
 *   // tpl.url      — spreadsheet URL
 *
 * ==================================================================
 * TEMPLATE GUARANTEES
 * ==================================================================
 *
 * - TNCheck lifecycle is always complete (tryStart → finish)
 * - TNRunTime guards prevent hard GAS timeout
 * - log.flush() is always called in finally
 * - No business logic in this file
 */
function Script_Template() {

  // scriptName: use TNGetCallerName() when called from a consumer project.
  // If the script lives directly in GAS (not a library), remove this line
  // and pass scriptName as a string literal to TNInitiation.
  const scriptName = SL6_Main.TNGetCallerName() || 'Script_Template'

  const ctx = SL6_Main.TNInitiation({
    scriptName:    scriptName,
    runMode:       'TRIGGER_LOG_UI',
    // runMode:    'USER_SILENT',
    // runMode:    'USER_TOAST',
    // runMode:    'TRIGGER_UI',
    // runMode:    'TRIGGER_SILENT',
    maxDurationMs: 5 * 60 * 1000,
    dataMode:      'GAS', // or 'API'
    debug:         false  // set true to dump ctx on startup
  })

  const { log, check, runtime, data, drive, templates, tabs } = ctx

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