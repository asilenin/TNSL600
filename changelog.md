# Changelog

All notable changes to SL6_Main are documented here.

Versioning follows [Semantic Versioning](https://semver.org):
- `MAJOR` — breaking changes (removed or renamed public API)
- `MINOR` — new methods or modules, backwards compatible
- `PATCH` — bug fixes, internal refactoring, no API changes

All versions are **beta** until 1.0.0 is declared.

---

## [6.1.0-beta] — 2026-03-18

### Added

**TNConfig** — new module for shared library constants
- `VERSION` — library version, access via `SL6_Main.TNConfig.VERSION`
- `MAIN_LIST_SS_ID` — system constant set once during TNSetup
- `LOG_SHEET_NAME`, `TEMPLATES_RANGE_NAME`
- `DEFAULT_RUN_MODE`, `DEFAULT_DATA_MODE`, `DEFAULT_LOG_LEVEL`
- `DEFAULT_DATE_FORMAT`, `DEFAULT_SAFETY_MS`, `UNKNOWN_SCRIPT_NAME`

**TNHelpers** — wrapped in `var TNHelpers = {}`, now exported as `SL6_Main.TNHelpers`
- `generateId()` — wrapper over `Utilities.getUuid()`
- `formatDate(date, tz?, fmt?)` — date formatting with spreadsheet timezone default
- `chunkArray(array, size)` — split array into batches
- `sleep(ms)` — wrapper over `Utilities.sleep()`
- `isEmpty(value)` — checks null / undefined / empty string / array / object
- Full JSDoc with `@example` for all methods

**TNModal**
- `confirm(msg, defaultValue?)` → boolean
- `prompt(msg, defaultValue?)` → string | null
- `toast(msg, title?, durationSec?)` — optional title and duration added
- All methods now log suppressed calls via `ctx.log.debug` in non-UI modes

**TNCheck**
- `getElapsed(ctx)` → ms since `tryStart()`
- `setMeta(ctx, key, value)` / `getMeta(ctx, key)` / `clearMeta(ctx)` — batch state persistence in DocumentProperties

**TNRunTime**
- `elapsed(ctx)` → ms since `ctx.startTime`
- `formatTimeLeft(ctx)` → `'4m 32s'` | `'45s'` | `'—'`
- `checkpoint(ctx, label)` — debug log + optional `check.setStatus()` via `ctx.checkpointUpdateStatus`

**TNDataProcessor**
- `readSheet(ss, sheetName)` → full 2D array, both backends
- `appendRow(ss, sheetName, rowArray)` — both backends
- `findTable(ss, sheetName, searchHeaders[])` → `{ headers, indexes, valuesRaw, valuesClean }` | null
- `batchRead(ss, operations[])` → array of 2D arrays; API: single `batchGet`
- `batchWrite(operations[])` — API: single `batchUpdate` per spreadsheet

**TNDriveProcessor**
- `moveFile(fileId, newParentId)`
- `moveFolder(folderId, newParentId)`
- `copyFile(fileId, destFolderId, newName?)` → new file ID
- `getFileMetadata(fileId)` → full metadata object
- `getFolderMetadata(folderId)` → full metadata object

**TNMainList**
- `readMultiple(rangeNames[])` → `{ name: value, ... }`

**TNTemplateSelector**
- `listTemplates()` → `[{ name, version, url }, ...]`
- Lazy init — registry SS opened only on first method call
- Results cached for script lifetime
- Registry SS ID read from `ctx.mainList.readNamedRange(TNConfig.TEMPLATES_RANGE_NAME)`

**TNInitiation**
- New option `checkpointUpdateStatus` — controls `runtime.checkpoint()` behaviour
- Log configured before modal to ensure suppressed calls can be logged

**ScriptTemplate**
- `TN_CHECK_STATE(scriptName)` — spreadsheet formula helper
- `RotateLogs()` / `SetupRotationTrigger()` — log rotation helpers
- Full inline docs for all TNInitiation options with comments

### Changed

**TNDriveProcessor** — converted from `var` singleton to factory function `TNDriveProcessor(ctx)` — breaking pattern fix, now consistent with all other modules

**TNMainList** — SS opened once in `TNInitiation`, passed to constructor; no longer opened on each method call

**TNMainList** — `readSheet` now uses `ctx.data.readSheet()` (respects `dataMode`)

**TNTemplateSelector** — registry SS ID moved from hardcoded constant to `TNConfig.TEMPLATES_RANGE_NAME` named range in Main List

**TNCheck.getStateRow** — removed `TNInitiation` dependency; reads DocumentProperties directly via minimal context — no side effects when used as spreadsheet formula

**TNModal** — init order fixed in `TNInitiation`: log configured before modal

**TNConfig** — all hardcoded string/number literals replaced with `TNConfig.*` references across all modules

**clearExceptHeader** — signature changed from `(sheet)` to `(ss, sheetName)` — consistent with all other `TNDataProcessor` methods; API mode support added

### Fixed

**TNLog** — timezone hardcoded as `'Europe/Moscow'` replaced with `ss.getSpreadsheetTimeZone()`

**TNLog** — missing `_groupStack` declaration caused runtime error when using `group()`/`groupEnd()`

**TNLog** — `ctx.ss` typo in `_writeToLogSheet` (was `ctx.ss`, should access via `_ctx.ss`)

**TNLog** — `debug()`, `group()`, `groupEnd()` were not exported in `return` block

**TNTestEnvironment** — declared as `const` IIFE — not exported from GAS library; converted to `var` object

---

## [6.0.x-beta] — 2025 (pre-refactor)

### 6.0.5-beta (`bff1600`) — multiple fixes
- Various bug fixes and stabilisation across core modules

### 6.0.4-beta (`200ef97`) — TNMainList initial state
- TNMainList added as IIFE singleton (later refactored in 6.1.0)

### 6.0.3-beta (`5a75d3a`) — TNDriveProcessor initial
- TNDriveProcessor added as `var` singleton (later refactored in 6.1.0)

### 6.0.2-beta (`6f32497`, `bee51f9`, `7e0e950`, `0b60578`)
- `TNRunTime` added for execution time control
- `TNCheck` added for execution state and concurrency control
- Runtime execution limit checks added to TNCheck
- `=TN_CHECK_STATE()` spreadsheet formula exposed
- Execution timeout moved to TNInitiation options (`maxDurationMs`)

### 6.0.1-beta (`a020061`, `a19e6f7`, `8164051`)
- `TNModal` added — UI decoupled from TNLog
- Full JSDoc added for public API
- Library contract and public/internal API clarified in docs

### 6.0.0-beta (`639c203`, `9cd78d2`, `c6431d2`, `f8e9819`, `719cced`)
- Initial library structure: `TNInitiation`, `TNLog`, `ScriptTemplate`
- README added
- Files moved to `SL/` folder
- Script template foundations

---

## Version Policy

**How to check version in a consumer script:**
```js
ctx.log.info('SL6_Main version: ' + SL6_Main.TNConfig.VERSION)
```

**When to update:**
- Check `CHANGELOG.md` for breaking changes before updating
- `PATCH` updates: safe to apply at any time
- `MINOR` updates: new methods available, existing code unaffected
- `MAJOR` updates: review breaking changes section before applying

**How to update:**
Always update the entire library — never update individual `.gs` files in isolation.
In GAS IDE: Library settings → select new version number.