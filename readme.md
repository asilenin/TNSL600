# SL6_Main — GAS Script Factory

**Version:** see `TNConfig.VERSION` | **Status:** beta

Google Apps Script library for building automation scripts in Google Workspace.
Provides a unified execution context, structured logging, runtime safety, and data access — so business logic never needs to know *where* it runs or *who* triggered it.

---

## Core Idea

Every script initializes a single context object (`ctx`) via `TNInitiation()`.
All services — logging, UI, data access, execution control — live in `ctx` and respect the run mode.

Business logic does not know:
- where logs are written
- whether UI is available
- whether the script was triggered or run manually

---

## Quick Start

```javascript
function MyScript() {

  const scriptName = SL6_Main.TNGetCallerName() || 'MyScript'

  const ctx = SL6_Main.TNInitiation({
    scriptName:    scriptName,
    runMode:       'TRIGGER_LOG_UI',
    maxDurationMs: 5 * 60 * 1000,
    dataMode:      'GAS'
  })

  const { log, check, runtime } = ctx

  const lock = check.tryStart(ctx)
  if (!lock.allowed) { log.alert('Already running'); log.flush(); return }

  try {
    log.info('Started')
    // business logic here
    log.success('Done')
  } catch (e) {
    check.setStatus(ctx, 'failed')
    log.error(e)
  } finally {
    check.finish(ctx)
    log.flush()
  }
}
```

---

## Library Export Model

SL6_Main is used as a **GAS Library** (added via Apps Script IDE, accessed via `SL6_Main.*`).

Due to GAS limitations, `const`, `let`, and IIFE declarations are NOT exported.
All modules are declared as `function` (factory functions) or `var` (objects).

```javascript
// Factory functions — called once per script
const ctx = SL6_Main.TNInitiation({ ... })   // → ctx object with all services pre-wired

// var objects — accessed directly
SL6_Main.TNConfig.VERSION                    // → '6.1.0-beta'
SL6_Main.TNHelpers.formatDate(new Date())    // → '18.03.2026 14:32:05'
SL6_Main.TNTestEnvironment.run()             // → preflight auth check
```

All services are accessed through `ctx` after initialization — **not** by calling library factories directly.

---

## TNInitiation — Entry Point

Every script MUST start with `TNInitiation()`. Returns `ctx`.

```javascript
const ctx = SL6_Main.TNInitiation({

  scriptName:    'MyScript',      // required when called from a library

  // --- run mode ---
  runMode: 'TRIGGER_LOG_UI',      // trigger → log to 'log' sheet
  // runMode: 'TRIGGER_UI',       // trigger → UI log only
  // runMode: 'TRIGGER_SILENT',   // trigger → console only
  // runMode: 'USER_SILENT',      // manual  → console only
  // runMode: 'USER_TOAST',       // manual  → toast + dialogs available

  // --- time budget ---
  maxDurationMs: 5 * 60 * 1000,  // 5 min; omit → no auto-clear

  // --- data backend ---
  dataMode: 'GAS',                // 'GAS' | 'API'

  // --- main list ---
  enableMainList: false,          // true → ctx.mainList available
                                  // requires TNConfig.MAIN_LIST_SS_ID to be set

  // --- checkpoint behaviour ---
  checkpointUpdateStatus: false,  // true → checkpoint() also calls check.setStatus()

  // --- log level ---
  logLevel: 'INFO',               // 'DEBUG'|'INFO'|'SUCCESS'|'ALERT'|'ERROR'

  // --- debug ---
  debug: false                    // true → dump ctx to log on startup
})
```

### ctx object

| Field | Type | Description |
|-------|------|-------------|
| `scriptName` | string | Detected or explicit name |
| `executionId` | string | UUID per execution |
| `startTime` | Date | Execution start |
| `runMode` | string | Execution mode |
| `dataMode` | string | Data backend |
| `ss` | Spreadsheet | Active spreadsheet |
| `ssId` | string | Active spreadsheet ID |
| `user` | string | Active user email |
| `effectiveUser` | string | Effective user email |
| `logBuffer` | Array | Internal log buffer |
| `checkpointUpdateStatus` | boolean | Checkpoint behaviour flag |
| `log` | TNLog | Logging service |
| `check` | TNCheck | Execution state service |
| `runtime` | TNRunTime | Time control service |
| `data` | TNDataProcessor | Spreadsheet data service |
| `drive` | TNDriveProcessor | Drive service |
| `modal` | TNModal | UI dialog service |
| `tabs` | TNTabOpener | Browser tab opener |
| `templates` | TNTemplateSelector | Template resolution service |
| `mainList` | TNMainList \| null | Main List reader (opt-in) |

---

## Run Modes

| Mode | Log file | Toast | Dialogs | Use case |
|------|----------|-------|---------|----------|
| `USER_SILENT` | — | — | — | Manual, no UI |
| `USER_TOAST` | — | ✓ | ✓ | Manual, interactive |
| `TRIGGER_LOG_UI` | ✓ | — | — | Background trigger |
| `TRIGGER_UI` | — | — | — | Trigger, UI log only |
| `TRIGGER_SILENT` | — | — | — | Trigger, fully silent |

---

## Modules

### TNLog — Logging

Buffered logger. All records written to console immediately; written to sheet on `flush()`.

```javascript
log.debug('message')
log.info('message')
log.success('message')
log.alert('message')
log.error(errorObject)

log.group('phase label')    // begin named group (DEBUG)
log.groupEnd()              // end group with elapsed time

log.setContext('key', val)  // append [key=val] to all subsequent records
log.dropContext()           // clear extra context

log.flush()                 // MANDATORY in finally block
```

**Log sheet** (`log`): columns `Timestamp | Level | Script | ExecutionId | User | Message | TimestampMs`.
Column G (TimestampMs) is hidden — used for rotation.

**Log rotation** — add to consumer project:
```javascript
function RotateLogs() {
  SL6_Main.TNLog().rotateLogs(SpreadsheetApp.getActiveSpreadsheet(), 90)
}
function SetupRotationTrigger() {
  SL6_Main.TNLog().registerRotationTrigger('RotateLogs')
}
```

---

### TNCheck — Execution State

Prevents parallel runs. Stores state in `DocumentProperties`.

```javascript
const lock = check.tryStart(ctx)        // → { allowed, cleared, state }
if (!lock.allowed) { log.flush(); return }

check.setProgress(ctx, n)              // numeric step indicator
check.setStatus(ctx, 'text')           // visible in =TN_CHECK_STATE()
check.getElapsed(ctx)                  // → ms since tryStart
check.getState(ctx)                    // → full state object
check.reset(ctx)                       // force-clear stuck execution

check.finish(ctx)                      // MANDATORY in finally block

// Batch state persistence across multiple executions:
check.setMeta(ctx, 'key', value)
check.getMeta(ctx, 'key')              // → string | null
check.clearMeta(ctx)                   // remove all meta for this script
```

**Spreadsheet formula** — add to consumer project:
```javascript
function TN_CHECK_STATE(scriptName) {
  return SL6_Main.TNCheck().getStateRow(scriptName)
}
// In cell: =TN_CHECK_STATE("MyScript")
// Output:  run | startTime | endTime | status | progress | runner
```

---

### TNRunTime — Time Control

In-memory time tracking. Safe to call inside tight loops.

```javascript
runtime.shouldStop(ctx)               // → boolean; soft check, use inside loops
runtime.assertTime(ctx, 'label')      // throws if time budget exhausted
runtime.elapsed(ctx)                  // → ms since ctx.startTime
runtime.timeLeft(ctx)                 // → ms remaining (Infinity if no budget)
runtime.formatTimeLeft(ctx)           // → '4m 32s' | '45s' | '—'
runtime.checkpoint(ctx, 'label')      // debug log with timing; optionally setStatus
```

> **Note:** `check.shouldStop(ctx)` reads DocumentProperties — avoid in loops.
> Use `runtime.shouldStop(ctx)` inside loops instead.

---

### TNDataProcessor — Spreadsheet Data

Unified data access. Backend set via `ctx.dataMode` (`'GAS'` | `'API'`).

```javascript
data.readRange(ss, sheet, range)
data.writeRange(ss, sheet, range, values)
data.readSheet(ss, sheet)                    // → full 2D array
data.appendRow(ss, sheet, rowArray)
data.readNamedRange(ss, name)                // → scalar | 2D array
data.writeNamedRange(ss, name, value)
data.clearExceptHeader(ss, sheet)
data.copyRange({ sourceSS, sourceSheet, sourceRange,
                 destSS, destSheet, destRange, clear? })
data.updateNamedRange(srcSS, dstSS, srcName, dstName)

// Table discovery
data.findTable(ss, sheet, ['Col1', 'Col2'])
// → { headers, indexes, valuesRaw, valuesClean } | null
// headers     — all non-empty headers in the found row
// indexes     — sheet column indexes (0-based)
// valuesRaw   — data rows, full width of sheet
// valuesClean — data rows, only header columns, in header order

// Batch operations
data.batchRead(ss, [{ sheet, range }, ...])
// → array of 2D arrays; API mode: single batchGet request

data.batchWrite([{ ss, sheet, range, values }, ...])
// API mode: single batchUpdate per spreadsheet; GAS: sequential
```

**API mode** requires enabling Google Sheets Advanced API in Apps Script services.

---

### TNDriveProcessor — Google Drive

```javascript
drive.configure({ mode: 'API' })               // override mode for this instance
drive.getOrCreateFolder(parent, name)          // → Folder (GAS) | folderId (API)
drive.copyFile(fileId, destFolderId, newName?) // → new file ID
drive.moveFile(fileId, newParentId)
drive.moveFolder(folderId, newParentId)        // moves folder + all contents
drive.ensureEditorAccess(folderId, email)
drive.extractIdFromUrl(url)                    // → id string
drive.buildFileUrl(fileId)                     // → spreadsheet URL
drive.buildFolderUrl(folderId)                 // → folder URL
drive.getFileMetadata(fileId)
// → { id, name, mimeType, type, url, createdTime, modifiedTime,
//     size, owner, description, starred, trashed, parents (API only) }
drive.getFolderMetadata(folderId)
// → same shape, no size field
```

> `moveFile` and `moveFolder` are separate methods — auto-detecting type
> would require an extra API call per operation.

**API mode** requires enabling Drive API in Apps Script Advanced Services.

---

### TNModal — UI Dialogs

All methods degrade gracefully — suppressed calls logged via `log.debug`.

| Method | USER_TOAST | USER_SILENT | TRIGGER_* |
|--------|-----------|-------------|-----------|
| `toast(msg, title?, sec?)` | ✓ shown | suppressed | suppressed |
| `alert(msg)` | ✓ shown | suppressed | suppressed |
| `error(msg)` | ✓ shown | suppressed | suppressed |
| `confirm(msg, default?)` | ✓ → boolean | → default | → default |
| `prompt(msg, default?)` | ✓ → string\|null | → default | → default |

---

### TNMainList — Main List Reader

Reads from the shared Main List spreadsheet. Requires `enableMainList: true`.
SS opened once at init — no repeated `openById()` calls.

```javascript
mainList.readNamedRange('RangeName')          // → scalar | array
mainList.readSheet('SheetName')               // → 2D array (with header)
mainList.readMultiple(['Name1', 'Name2'])      // → { Name1: val, Name2: val }
```

Requires `TNConfig.MAIN_LIST_SS_ID` to be set.

---

### TNTemplateSelector — Template Resolution

Reads template registry from a spreadsheet linked in Main List.
Lazy init — registry SS opened only on first method call. Results cached.

Registry structure: one sheet per template, header row with `version | link | actual`.
Exactly one row per sheet has `actual = TRUE`.

Requires `enableMainList: true` and `TNConfig.MAIN_LIST_SS_ID`.

```javascript
// Pattern 1: URL by known name
const url = templates.getActiveTemplateUrl('CE')

// Pattern 2: full metadata
const tpl = templates.getActiveTemplate('CE')
// tpl.version, tpl.url

// Pattern 3: find by variable name
const list = templates.listTemplates()
const found = list.find(t => t.name === templateName)
if (found) log.info(found.url)

// Pattern 4: list all
templates.listTemplates().forEach(t => log.info(t.name + ' v' + t.version))
```

---

### TNHelpers — Shared Utilities

Available in consumer scripts via `SL6_Main.TNHelpers`.

```javascript
TNHelpers.normalizeBoolean(value)             // → boolean (handles 'TRUE'/'FALSE' strings)
TNHelpers.isActiveFlag(value)                 // → boolean (true for true or 'TRUE')
TNHelpers.generateId()                        // → UUID v4 string
TNHelpers.formatDate(date, tz?, fmt?)         // → formatted string; default: spreadsheet tz
TNHelpers.chunkArray(array, size)             // → Array<Array> — split into batches
TNHelpers.sleep(ms)                           // pause execution (useful between API calls)
TNHelpers.isEmpty(value)                      // → true for null/''/[]/{}; false for 0/false
```

---

### TNConfig — Library Constants

Shared constants. Set `MAIN_LIST_SS_ID` once after running TNSetup.

```javascript
SL6_Main.TNConfig.VERSION              // → '6.1.0-beta'
SL6_Main.TNConfig.MAIN_LIST_SS_ID     // → set during setup
SL6_Main.TNConfig.LOG_SHEET_NAME      // → 'log'
SL6_Main.TNConfig.TEMPLATES_RANGE_NAME // → 'templatesList'
SL6_Main.TNConfig.DEFAULT_RUN_MODE    // → 'USER_SILENT'
SL6_Main.TNConfig.DEFAULT_DATA_MODE   // → 'GAS'
SL6_Main.TNConfig.DEFAULT_LOG_LEVEL   // → 'INFO'
SL6_Main.TNConfig.DEFAULT_DATE_FORMAT // → 'dd.MM.yyyy HH:mm:ss'
SL6_Main.TNConfig.DEFAULT_SAFETY_MS   // → 30000
```

---

### TNTestEnvironment — Preflight Check

Run manually once before first use to verify OAuth scopes.

```javascript
// In consumer project:
function TestEnvironment() {
  SL6_Main.TNTestEnvironment.run()
}
```

If scopes are not granted, opens the authorization page automatically.

---

## Development Rules

- No logging before `TNInitiation()`
- No direct calls to `SpreadsheetApp.getUi()`, `console.log`, `Logger.log`
- All modules declared as `function` (factory) or `var` (object) — never `const`/`let`/IIFE
- All factories receive `ctx`
- Every error must be safely logged
- `log.flush()` and `check.finish(ctx)` MUST be called in `finally`

---

## File Reference

| File | Type | Description |
|------|------|-------------|
| `TNConfig.gs` | `var` | Library constants and version |
| `TNInitiation.gs` | `function` | Entry point, builds ctx |
| `TNLog.gs` | `function` factory | Buffered logger |
| `TNCheck.gs` | `function` factory | Execution state and concurrency |
| `TNRunTime.gs` | `function` factory | Time budget and safe stop points |
| `TNDataProcessor.gs` | `function` factory | Spreadsheet data access |
| `TNDriveProcessor.gs` | `function` factory | Google Drive access |
| `TNModal.gs` | `function` factory | UI dialogs |
| `TNMainList.gs` | `function` factory | Main List spreadsheet reader |
| `TNTemplateSelector.gs` | `function` factory | Template registry reader |
| `TNTabOpener.gs` | `function` factory | Browser tab opener |
| `TNHelpers.gs` | `var` | Shared utility functions |
| `TNGetCallerName.gs` | `function` | Stack-based caller detection |
| `TNTestEnvironment.gs` | `var` | OAuth preflight checker |
| `ScriptTemplate.gs` | template | Canonical consumer script template |

---

## Versioning

Version is stored in `TNConfig.VERSION`. Check from any consumer script:

```javascript
ctx.log.info('SL6_Main: ' + SL6_Main.TNConfig.VERSION)
```

See [CHANGELOG.md](./CHANGELOG.md) for full history.

**Always update the entire library — never individual files.**
In GAS IDE: Library settings → select new version number.