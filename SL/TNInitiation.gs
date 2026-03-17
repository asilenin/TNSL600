/**
 * Initializes script execution context (ctx) and configures environment.
 *
 * This function MUST be the first call in any script using the SL/TN library.
 *
 * @param {Object} options - Initialization options
 * @param {string} [options.scriptName] - Explicit script name (RECOMMENDED when called from another library)
 * @param {string} [options.runMode='USER_SILENT'] - Execution mode
 * @param {string} [options.logLevel='INFO'] - Minimal log level
 * @param {number} [options.maxDurationMs] - Expected max execution time
 * @param {string} [options.dataMode='GAS'] - Data backend mode ('GAS' | 'API')
 * @param {boolean} [options.debug=false] - Enable debug logging of ctx contents
 *
 * @returns {Object} ctx - Script execution context
 */
function TNInitiation(options) {
  options = options || {}

  const ctx = {}

  // --- execution timing ---
  ctx.startTime = new Date()
  ctx.executionId = Utilities.getUuid()
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
    detectedName = options.scriptName || 'unknownScript'
  }
  ctx.scriptName = detectedName

  // --- spreadsheet ---
  ctx.ss = SpreadsheetApp.getActiveSpreadsheet()
  ctx.ssId = ctx.ss.getId()

  // --- users ---
  ctx.user = safeGetActiveUser()
  ctx.effectiveUser = safeGetEffectiveUser()

  // --- run mode ---
  ctx.runMode = options.runMode || 'USER_SILENT'

  // --- data backend ---
  ctx.dataMode = options.dataMode || 'GAS'

  // --- debug flag ---
  ctx.debug = options.debug === true

  // --- logging buffer ---
  ctx.logBuffer = []

  // --- services (FACTORIES) ---
  ctx.log = TNLog()
  ctx.modal = TNModal()
  ctx.check = TNCheck()
  ctx.runtime = TNRunTime()
  ctx.data = TNDataProcessor(ctx)
  ctx.templates = TNTemplateSelector(ctx)
  ctx.tabs = TNTabOpener(ctx)

  // --- configure logging ---
  ctx.log.configure({
    context: ctx,
    console: true,
    file: ctx.runMode === 'TRIGGER_LOG_UI',
    level: options.logLevel || 'INFO'
  })

  // --- configure UI ---
  ctx.modal.configure(ctx)

  ctx.log.info('Start script: ' + ctx.scriptName)

  // --- debug dump ---
  if (ctx.debug === true) {
    ctx.log.info('CTX DEBUG DUMP:')
    ctx.log.info(JSON.stringify({
      scriptName: ctx.scriptName,
      executionId: ctx.executionId,
      runMode: ctx.runMode,
      dataMode: ctx.dataMode,
      maxDurationMs: ctx.maxDurationMs,
      user: ctx.user,
      effectiveUser: ctx.effectiveUser,
      ssId: ctx.ssId,
      startTime: ctx.startTime
    }))
  }

  return ctx
}

//
// ---------- helpers ----------
//

function safeGetActiveUser() {
  try {
    return Session.getActiveUser().getEmail()
  } catch (e) {
    return 'unknown@local'
  }
}

function safeGetEffectiveUser() {
  try {
    return Session.getEffectiveUser().getEmail()
  } catch (e) {
    return 'unknown@local'
  }
}

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
  return 'unknownScript'
}