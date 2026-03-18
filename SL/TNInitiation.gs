/**
 * Initializes script execution context (ctx) and configures all services.
 *
 * This function MUST be the first call in any script using the SL/TN library.
 *
 * @param {Object} options - Initialization options
 * @param {string}  [options.scriptName]                  - Explicit script name (required when called from another library)
 * @param {string}  [options.runMode='USER_SILENT']        - Execution mode
 * @param {string}  [options.logLevel='INFO']              - Minimal log level: 'DEBUG' | 'INFO' | 'SUCCESS' | 'ALERT' | 'ERROR'
 * @param {number}  [options.maxDurationMs]                - Expected max execution time in ms (used by TNCheck and TNRunTime)
 * @param {string}  [options.dataMode='GAS']               - Data backend: 'GAS' | 'API'
 * @param {boolean} [options.enableMainList=false]         - Attach ctx.mainList (TNMainList) to context; requires TNConfig.MAIN_LIST_SS_ID
 * @param {boolean} [options.checkpointUpdateStatus=false] - runtime.checkpoint() also calls check.setStatus()
 * @param {boolean} [options.debug=false]                  - Dump ctx contents to log on startup
 *
 * @returns {Object} ctx - Script execution context
 */
function TNInitiation(options) {
  options = options || {}

  const ctx = {}

  // --- execution timing ---
  ctx.startTime = new Date()
  ctx.executionId = TNHelpers.generateId()
  ctx.maxDurationMs =
    typeof options.maxDurationMs === 'number'
      ? options.maxDurationMs
      : null

  // --- script identity ---
  let detectedName = options.scriptName || detectCallerFunctionName()
  if (
    typeof detectedName !== 'string' ||
    detectedName === '' ||
    detectedName === 'Object'
  ) {
    detectedName = options.scriptName || TNConfig.UNKNOWN_SCRIPT_NAME
  }
  ctx.scriptName = detectedName

  // --- spreadsheet ---
  ctx.ss   = SpreadsheetApp.getActiveSpreadsheet()
  ctx.ssId = ctx.ss.getId()

  // --- users ---
  ctx.user          = safeGetActiveUser()
  ctx.effectiveUser = safeGetEffectiveUser()

  // --- run mode ---
  ctx.runMode = options.runMode || TNConfig.DEFAULT_RUN_MODE

  // --- data backend ---
  ctx.dataMode = options.dataMode || TNConfig.DEFAULT_DATA_MODE

  // --- runtime behaviour ---
  ctx.checkpointUpdateStatus = options.checkpointUpdateStatus === true

  // --- debug flag ---
  ctx.debug = options.debug === true

  // --- logging buffer ---
  ctx.logBuffer = []

  // --- log: configure first so all subsequent services can write to it ---
  ctx.log = TNLog()
  ctx.log.configure({
    context: ctx,
    console: true,
    file:    ctx.runMode === 'TRIGGER_LOG_UI',
    level:   options.logLevel || TNConfig.DEFAULT_LOG_LEVEL
  })

  // --- modal: configure after log so suppressed calls can be logged ---
  ctx.modal = TNModal()
  ctx.modal.configure(ctx)

  // --- remaining services (factories) ---
  ctx.check     = TNCheck()
  ctx.runtime   = TNRunTime()
  ctx.data      = TNDataProcessor(ctx)
  ctx.drive     = TNDriveProcessor(ctx)
  ctx.templates = TNTemplateSelector(ctx)
  ctx.tabs      = TNTabOpener(ctx)

  // --- optional services ---
  // Main List SS is opened once here and passed to TNMainList constructor.
  // This avoids repeated openById() calls across individual read methods.
  if (options.enableMainList === true) {
    if (!TNConfig.MAIN_LIST_SS_ID || TNConfig.MAIN_LIST_SS_ID === 'PUT_MAIN_LIST_SPREADSHEET_ID_HERE') {
      throw new Error('TNInitiation: TNConfig.MAIN_LIST_SS_ID is not set. Run TNSetup first.')
    }
    const mainListSS = SpreadsheetApp.openById(TNConfig.MAIN_LIST_SS_ID)
    ctx.mainList = TNMainList(ctx, mainListSS)
  } else {
    ctx.mainList = null
  }

  ctx.log.info('Start script: ' + ctx.scriptName)

  // --- debug dump ---
  if (ctx.debug === true) {
    ctx.log.info('CTX DEBUG DUMP:')
    ctx.log.info(JSON.stringify({
      scriptName:             ctx.scriptName,
      executionId:            ctx.executionId,
      runMode:                ctx.runMode,
      dataMode:               ctx.dataMode,
      maxDurationMs:          ctx.maxDurationMs,
      enableMainList:         options.enableMainList === true,
      mainListSsId:           TNConfig.MAIN_LIST_SS_ID || null,
      checkpointUpdateStatus: ctx.checkpointUpdateStatus,
      user:                   ctx.user,
      effectiveUser:          ctx.effectiveUser,
      ssId:                   ctx.ssId,
      startTime:              ctx.startTime
    }))
  }

  return ctx
}

// ---------- internal helpers ----------
// These functions are internal to the library.
// Do NOT call them from consumer scripts.

/**
 * Returns the active user email. Falls back to 'unknown@local' in trigger context.
 * @private
 * @returns {string}
 */
function safeGetActiveUser() {
  try {
    return Session.getActiveUser().getEmail()
  } catch (e) {
    return 'unknown@local'
  }
}

/**
 * Returns the effective user email. Falls back to 'unknown@local' if unavailable.
 * @private
 * @returns {string}
 */
function safeGetEffectiveUser() {
  try {
    return Session.getEffectiveUser().getEmail()
  } catch (e) {
    return 'unknown@local'
  }
}

/**
 * Detects the name of the function that called TNInitiation via stack trace.
 * Returns TNConfig.UNKNOWN_SCRIPT_NAME if detection fails.
 * @private
 * @returns {string}
 */
function detectCallerFunctionName() {
  try {
    throw new Error()
  } catch (e) {
    const stack = String(e.stack || '').split('\n')
    if (stack.length >= 3) {
      const match = stack[2].match(/at (\w+)/)
      if (match) return match[1]
    }
  }
  return TNConfig.UNKNOWN_SCRIPT_NAME
}