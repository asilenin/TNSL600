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
 *                check.getElapsed(ctx)        → ms since tryStart
 *                check.getState(ctx) / check.reset(ctx)
 *                check.setMeta(ctx, key, val) / check.getMeta(ctx, key)
 *                check.clearMeta(ctx)
 *
 * TNRunTime      runtime.shouldStop(ctx)      → boolean; use inside loops
 *                runtime.assertTime(ctx, lbl) ← throws if budget exceeded
 *                runtime.elapsed(ctx)         → ms since ctx.startTime
 *                runtime.timeLeft(ctx)        → ms remaining
 *                runtime.formatTimeLeft(ctx)  → '4m 32s' | '45s' | '—'
 *                runtime.checkpoint(ctx, lbl) ← debug log + optional setStatus
 *
 * TNDataProcessor
 *                data.readRange(ss, sheet, range)
 *                data.writeRange(ss, sheet, range, values)
 *                data.readSheet(ss, sheet)            → 2D array (all rows incl. header)
 *                data.appendRow(ss, sheet, rowArray)
 *                data.readNamedRange(ss, name)
 *                data.writeNamedRange(ss, name, value)
 *                data.clearExceptHeader(ss, sheet)
 *                data.copyRange({ sourceSS, sourceSheet, sourceRange,
 *                                 destSS, destSheet, destRange, clear? })
 *                data.updateNamedRange(srcSS, dstSS, srcName, dstName)
 *                data.findTable(ss, sheet, ['Col1','Col2'])
 *                  → { headers, indexes, valuesRaw, valuesClean } | null
 *                  headers     — all non-empty headers in the found row
 *                  indexes     — sheet column indexes (0-based) for each header
 *                  valuesRaw   — data rows, full width of sheet
 *                  valuesClean — data rows, only header columns, in header order
 *                data.batchRead(ss, [{ sheet, range }, ...])
 *                  → array of 2D arrays, same order as input
 *                  API mode: single batchGet request
 *                  GAS mode: sequential reads
 *                data.batchWrite([{ ss, sheet, range, values }, ...])
 *                  API mode: single batchUpdate request per spreadsheet
 *                  GAS mode: sequential writes
 *
 * TNDriveProcessor
 *                drive.configure({ mode: 'API' })
 *                drive.getOrCreateFolder(parent, name) → Folder | folderId
 *                drive.copyFile(fileId, destFolderId, newName?) → newFileId
 *                drive.moveFile(fileId, newParentId)
 *                drive.moveFolder(folderId, newParentId)
 *                drive.ensureEditorAccess(folderId, email)
 *                drive.extractIdFromUrl(url)     → id
 *                drive.buildFileUrl(fileId)      → url
 *                drive.buildFolderUrl(folderId)  → url
 *                drive.getFileMetadata(fileId)
 *                  → { id, name, mimeType, type, url, createdTime, modifiedTime,
 *                      size, owner, description, starred, trashed,
 *                      parents (API only) }
 *                drive.getFolderMetadata(folderId)
 *                  → { id, name, mimeType, type, url, createdTime, modifiedTime,
 *                      owner, description, starred, trashed,
 *                      parents (API only) }
 *
 * TNMainList     requires enableMainList: true + mainListSsId
 *                SS is opened once at init — no repeated openById calls
 *                mainList.readNamedRange(name)     → scalar | array
 *                mainList.readSheet(name)          → 2D array
 *                mainList.readMultiple([n1, n2])   → { name: value, ... }
 *
 * TNTabOpener    tabs.open(url)               — USER modes only
 *
 * TNTemplateSelector
 *                Requires enableMainList: true — reads registry SS ID
 *                from Main List named range 'templatesList'.
 *                Lazy init: registry SS opened only on first call.
 *                Results cached for script lifetime.
 *
 *                templates.listTemplates()
 *                  → [{ name, version, url }, ...]
 *
 *                templates.getActiveTemplate(name)
 *                  → { version, url }
 *
 *                templates.getActiveTemplateUrl(name)
 *                  → url string (shorthand)
 *
 *                --- Usage patterns ---
 *
 *                // Pattern 1: get URL directly by known name
 *                const url = templates.getActiveTemplateUrl('CE')
 *
 *                // Pattern 2: get full metadata by known name
 *                const tpl = templates.getActiveTemplate('CE')
 *                log.info('v' + tpl.version + ': ' + tpl.url)
 *
 *                // Pattern 3: list all, then find by variable name
 *                const templateName = 'CE'
 *                const list = templates.listTemplates()
 *                const found = list.find(t => t.name === templateName)
 *                if (found) log.info(found.url)
 *
 *                // Pattern 4: list all for UI or logging
 *                templates.listTemplates().forEach(t => {
 *                  log.info(t.name + ' v' + t.version)
 *                })
 *
 * TNModal        All methods degrade safely when UI is unavailable:
 *                  USER_TOAST  → full UI shown
 *                  USER_SILENT → suppressed, logged via log.debug
 *                  TRIGGER_*   → suppressed, logged via log.debug
 *
 *                modal.toast(msg, title?, durationSec?) — non-blocking
 *                modal.alert(msg)                       — blocking dialog
 *                modal.error(msg)                       — blocking error dialog
 *                modal.confirm(msg, defaultValue?)      → boolean
 *                modal.prompt(msg, defaultValue?)       → string | null
 *
 * TNHelpers      Shared utilities. Access via SL6_Main.TNHelpers in consumer scripts.
 *                Inside library modules — via global TNHelpers object.
 *
 *                TNHelpers.normalizeBoolean(value)    → boolean
 *                TNHelpers.generateId()               → UUID string
 *                TNHelpers.isActiveFlag(value)        → boolean
 *                TNHelpers.formatDate(date, tz?, fmt?) → string
 *                  default fmt: 'dd.MM.yyyy HH:mm:ss'
 *                  default tz:  spreadsheet timezone
 *                TNHelpers.chunkArray(array, size)   → Array<Array>
 *                  splits array into chunks of given size
 *                TNHelpers.sleep(ms)
 *                  pauses execution, useful between API calls
 *                TNHelpers.isEmpty(value)             → boolean
 *                  true for: null, undefined, '', [], {}
 *                  false for: 0, false, non-empty values
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
    // runMode: 'USER_TOAST',     // manual  → toast + confirm + prompt available

    // --- time budget ---
    // TNRunTime uses this for shouldStop() / assertTime() / formatTimeLeft()
    // TNCheck auto-clears stalled runs after this duration
    // Omit → no auto-clear, shouldStop() always returns false
    maxDurationMs: 5 * 60 * 1000,  // 5 minutes

    // --- data backend ---
    // 'GAS' → SpreadsheetApp
    // 'API' → Sheets Advanced API (enable in Advanced Google Services)
    dataMode: 'GAS',

    // --- optional: Main List spreadsheet reader ---
    // true  → ctx.mainList available; false → ctx.mainList is null
    // mainListSsId is REQUIRED when enableMainList is true
    // SS is opened once at init and reused across all mainList calls
    // Also required for TNTemplateSelector (reads registry ID from 'templatesList')
    enableMainList: false,
    // mainListSsId: 'YOUR_MAIN_LIST_SPREADSHEET_ID',

    // --- checkpoint behaviour ---
    // false → runtime.checkpoint() writes debug log only
    // true  → runtime.checkpoint() also calls check.setStatus() → visible in =TN_CHECK_STATE()
    checkpointUpdateStatus: false,

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
// SPREADSHEET FORMULA HELPERS
// Use these functions directly in spreadsheet cells.
// ==================================================================

/**
 * Returns execution state of a named script as a row of values.
 * Paste into a spreadsheet cell as an array formula:
 *
 *   =TN_CHECK_STATE("Script_Template")
 *
 * Output columns: run | startTime | endTime | status | progress | runner
 *
 * @param {string} scriptName
 * @returns {Array}
 */
function TN_CHECK_STATE(scriptName) {
  return SL6_Main.TNCheck().getStateRow(scriptName)
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