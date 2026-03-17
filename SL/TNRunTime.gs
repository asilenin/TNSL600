/**
 * TNRunTime — runtime execution time control.
 *
 * Responsibilities:
 * - Track elapsed execution time
 * - Determine remaining time budget
 * - Provide safe, readable stop / assert points
 * - Checkpoint logging with optional status update
 *
 * TNRunTime does NOT:
 * - store any state
 * - interact with UI directly
 * - manage locks or concurrency
 *
 * IMPORTANT:
 * Exported as a factory function for GAS library compatibility.
 */
function TNRunTime() {

  const DEFAULT_SAFETY_MS = 30 * 1000 // 30 seconds safety margin

  /**
   * Returns elapsed execution time in milliseconds.
   * Based on ctx.startTime (in-memory) — fast, no Properties reads.
   *
   * Returns 0 if ctx.startTime is not set.
   *
   * @param {Object} ctx
   * @returns {number}
   */
  function elapsed(ctx) {
    if (!ctx || !ctx.startTime) return 0
    return Date.now() - ctx.startTime.getTime()
  }

  /**
   * Returns remaining execution time in milliseconds.
   * Returns Infinity if ctx.maxDurationMs is not defined.
   *
   * @param {Object} ctx
   * @returns {number}
   */
  function timeLeft(ctx) {
    if (!ctx || !ctx.maxDurationMs) return Infinity
    if (!ctx.startTime) return Infinity

    return Math.max(ctx.maxDurationMs - elapsed(ctx), 0)
  }

  /**
   * Returns remaining time as a human-readable string.
   * Format: '4m 32s' | '45s' | '—' (if maxDurationMs not set)
   *
   * @param {Object} ctx
   * @returns {string}
   */
  function formatTimeLeft(ctx) {
    const left = timeLeft(ctx)
    if (left === Infinity) return '—'

    const totalSec = Math.round(left / 1000)
    const m = Math.floor(totalSec / 60)
    const s = totalSec % 60

    return m > 0
      ? m + 'm ' + s + 's'
      : s + 's'
  }

  /**
   * Determines whether execution should stop soon.
   * Based on ctx.startTime (in-memory) — safe to call inside loops.
   *
   * @param {Object} ctx
   * @param {number} [safetyMs=30000]
   * @returns {boolean}
   */
  function shouldStop(ctx, safetyMs) {
    const margin = typeof safetyMs === 'number'
      ? safetyMs
      : DEFAULT_SAFETY_MS

    return timeLeft(ctx) <= margin
  }

  /**
   * Asserts that enough execution time remains.
   * Throws Error if time budget is nearly exhausted.
   * Use before "point of no return" operations.
   *
   * On failure:
   * - logs alert (best effort)
   * - updates check status (best effort)
   * - throws Error → caught by try/catch → finally runs normally
   *
   * @param {Object} ctx
   * @param {string} [label]
   * @throws {Error}
   */
  function assertTime(ctx, label) {
    if (!ctx || !ctx.maxDurationMs) return

    const left = timeLeft(ctx)
    if (left > DEFAULT_SAFETY_MS) return

    const message =
      'Execution time limit approaching' +
      (label ? ' at ' + label : '') +
      ' (' + Math.round(left / 1000) + 's left)'

    try { if (ctx.check) ctx.check.setStatus(ctx, message) } catch (_) {}
    try { if (ctx.log)   ctx.log.alert(message)            } catch (_) {}

    throw new Error(message)
  }

  /**
   * Logs a timing checkpoint at DEBUG level.
   * Always logs elapsed + time left.
   *
   * If ctx.checkpointUpdateStatus === true (set via TNInitiation),
   * also updates check.setStatus() — visible in =TN_CHECK_STATE() formula.
   *
   * @param {Object} ctx
   * @param {string} label
   *
   * @example
   * runtime.checkpoint(ctx, 'after fetch')
   * // → log.debug: '⏱ after fetch | elapsed: 1.2s | left: 3m 48s'
   * // → check.setStatus (if checkpointUpdateStatus: true)
   */
  function checkpoint(ctx, label) {
    if (!ctx) return

    const elapsedSec = (elapsed(ctx) / 1000).toFixed(1)
    const leftStr    = formatTimeLeft(ctx)
    const message    = '⏱ ' + label + ' | elapsed: ' + elapsedSec + 's | left: ' + leftStr

    try { if (ctx.log) ctx.log.debug(message) } catch (_) {}

    if (ctx.checkpointUpdateStatus === true) {
      try {
        if (ctx.check) ctx.check.setStatus(ctx, label + ' | ' + leftStr)
      } catch (_) {}
    }
  }

  return {
    elapsed:        elapsed,
    timeLeft:       timeLeft,
    formatTimeLeft: formatTimeLeft,
    shouldStop:     shouldStop,
    assertTime:     assertTime,
    checkpoint:     checkpoint
  }
}