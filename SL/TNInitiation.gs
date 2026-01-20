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
    const stack = e.stack.split('\n')
    if (stack.length >= 3) {
      const match = stack[2].match(/at (\w+)/)
      if (match) return match[1]
    }
  }
  return 'unknownScript'
}