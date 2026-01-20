/**
 * Initializes script execution context (TNSV) and configures logging environment.
 *
 * This function MUST be the first call in any script using the SL/TN library.
 * It creates a unified execution context shared by all factories and services.
 *
 * Responsibilities:
 * - Detects script name and execution metadata
 * - Collects user and spreadsheet information
 * - Determines run mode (user / trigger / silent / UI)
 * - Initializes log buffer
 * - Configures TNLog according to run mode
 *
 * @param {Object} options - Initialization options
 * @param {string} [options.scriptName] - Explicit script name (optional, auto-detected if omitted)
 * @param {string} [options.runMode='USER_SILENT'] - Execution mode (see README: Run Modes)
 * @param {string} [options.logLevel='INFO'] - Minimal log level to record
 *
 * @returns {Object} TNSV - Script execution context
 *
 * @example
 * const ctx = TNInitiation({ runMode: 'USER_TOAST' });
 */
function TNInitiation(options = {}) {

  const ctx = {}

  // --- base ---
  ctx.startTime = new Date()
  ctx.executionId = Utilities.getUuid()
  ctx.scriptName = options.scriptName || detectCallerFunctionName()

  // --- spreadsheet ---
  ctx.ss = SpreadsheetApp.getActiveSpreadsheet()
  ctx.ssId = ctx.ss.getId()

  // --- users ---
  ctx.user = safeGetActiveUser()
  ctx.effectiveUser = safeGetEffectiveUser()

  // --- run mode ---
  ctx.runMode = options.runMode || 'USER_SILENT'

  // --- log buffer ---
  ctx.logBuffer = []

  // --- log configuration ---
  TNLog.configure({
    context: ctx,
    console: true,
    file: ctx.runMode === 'TRIGGER_LOG_UI',
    ui: ctx.runMode === 'TRIGGER_LOG_UI' || ctx.runMode === 'TRIGGER_UI',
    toast: ctx.runMode === 'USER_TOAST',
    level: options.logLevel || 'INFO'
  })

  TNLog.info(`Start script: ${ctx.scriptName}`)

  return ctx
}

// ---------- helpers ----------
/**
 * Safely returns the email of the active user.
 *
 * In trigger or restricted environments this value may be unavailable.
 * The function never throws and always returns a string.
 *
 * @returns {string} Active user email or fallback value
 *
 * @internal
 */
function safeGetActiveUser() {
  try {
    return Session.getActiveUser().getEmail()
  } catch (e) {
    return 'unknown@local'
  }
}

/**
 * Safely returns the email of the effective user executing the script.
 *
 * Useful for auditing and debugging permissions-related issues.
 * The function never throws and always returns a string.
 *
 * @returns {string} Effective user email or fallback value
 *
 * @internal
 */
function safeGetEffectiveUser() {
  try {
    return Session.getEffectiveUser().getEmail()
  } catch (e) {
    return 'unknown@local'
  }
}

/**
 * Detects the name of the calling function using stack trace inspection.
 *
 * Used internally during initialization to automatically determine
 * the script name when it is not explicitly provided.
 *
 * NOTE: This function should be called ONLY during initialization,
 * as stack inspection is relatively expensive.
 *
 * @returns {string} Caller function name or 'unknownScript'
 *
 * @internal
 */
function detectCallerFunctionName() {
  try {
    throw new Error()
  } catch (e) {
    const stack = e.stack.split('\n')
    if (stack.length >= 3) {
      const match = stack[2].match(/at (\w+)/)
      if (match) return match[1]
    }
  }
  return 'unknownScript'
}