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
 *     runMode: 'TRIGGER_LOG_UI',     // execution mode
 *     maxDurationMs: 5 * 60 * 1000,  // execution time limit (ms)
 *     dataMode: 'GAS'                // data backend: 'GAS' | 'API'
 *   })
 *
 *   dataMode:
 *     - 'GAS' → SpreadsheetApp (.getRange, .getValues, etc.)
 *     - 'API' → Sheets Advanced API (Sheets.Spreadsheets.Values)
 *
 *   Optional aliases for readability:
 *
 *     const { log, check, runtime, data, templates } = ctx
 *
 * ==================================================================
 * AVAILABLE ctx SERVICES
 * ==================================================================
 *
 * Logging (TNLog):
 *
 *   log.info('message')
 *   log.success('message')
 *   log.alert('message')
 *   log.error(error)
 *   log.flush()                // MUST be called in finally
 *
 * Runtime control (TNRunTime):
 *
 *   runtime.shouldStop(ctx)
 *   runtime.assertTime(ctx, 'label')
 *
 * Execution state / concurrency (TNCheck):
 *
 *   check.tryStart(ctx)
 *   check.setProgress(ctx, n)
 *   check.setStatus(ctx, 'text')
 *   check.finish(ctx)
 *
 * Data access (TNDataProcessor):
 *
 *   // Regular ranges
 *   data.readRange(ss, 'Sheet1', 'A2:D')
 *   data.writeRange(ss, 'Sheet1', 'A2', values)
 *
 *   // Named ranges
 *   data.readNamedRange(ss, 'MyNamedRange')
 *   data.writeNamedRange(ss, 'MyNamedRange', value)
 *
 *   // Copy ranges between spreadsheets
 *   data.copyRange({
 *     sourceSS: srcSS,
 *     sourceSheet: 'Source',
 *     sourceRange: 'A2:D',
 *     destSS: dstSS,
 *     destSheet: 'Dest',
 *     destRange: 'A2',
 *     clear: true
 *   })
 *
 *   // Named range → named range
 *   data.updateNamedRange(srcSS, dstSS, 'SRC_NAME', 'DST_NAME')
 *
 * Template resolution (TNTemplateSelector):
 *
 *   // Get active template URL by name (e.g. 'CE', 'TIMING')
 *   const url = templates.getActiveTemplateUrl('CE')
 *
 *   // Or full metadata
 *   const tpl = templates.getActiveTemplate('CE')
 *   // tpl.version
 *   // tpl.url
 * 
 *  * Drive access (TNDriveProcessor):
 *
 *   // Configure backend (optional, usually inherited from dataMode)
 *   ctx.drive.configure({ mode: 'GAS' }) // or 'API'
 *
 *   // Get root folder
 *   const root = DriveApp.getRootFolder()
 *
 *   // Create / get subfolder
 *   const projectFolder =
 *     ctx.drive.getOrCreateFolder(root, ctx.scriptName)
 *
 *   // Ensure editor rights
 *   ctx.drive.ensureEditorAccess(
 *     projectFolder.getId(),
 *     ctx.user
 *   )
 *
 *   // API mode example
 *   ctx.drive.configure({ mode: 'API' })
 *   const folderId =
 *     ctx.drive.getOrCreateFolder('PARENT_FOLDER_ID', 'Reports')
 *
 *   //  Main List usage
 *   const department = ctx.mainList.readNamedRange('DepartmentCode');
 *   const matrix = ctx.mainList.readSheet('Employees');
 *
 * ==================================================================
 * TEMPLATE GUARANTEES
 * ==================================================================
 *
 * - mandatory TNCheck lifecycle
 * - runtime safety via TNRunTime
 * - structured progress and status reporting
 *
 * Templates are intentionally minimal
 * and MUST NOT contain business logic.
 */
function Script_Template() {

  //comment const scriptName if script in GAS
  const scriptName =
    SL6_Main.TNGetCallerName() || 'Script_Template'

  const ctx = SL6_Main.TNInitiation({
    scriptName: scriptName,
    runMode: 'TRIGGER_LOG_UI',
    // runMode: 'USER_SILENT',
    // runMode: 'USER_TOAST',
    // runMode: 'TRIGGER_UI',
    // runMode: 'TRIGGER_SILENT',
    //enableMainList: true,
    maxDurationMs: 5 * 60 * 1000,
    dataMode: 'GAS', // or 'API'
    debug: false // or true
  })

  // optional aliases for readability
  const { log, check, runtime, data, templates, tabs, drive } = ctx

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

    // --- critical section ---
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