/**
 * TNRunTime — runtime execution time control.
 *
 * Responsibilities:
 * - Track elapsed execution time
 * - Determine remaining time budget
 * - Provide safe, readable stop / assert points
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
   * Returns remaining execution time in milliseconds.
   *
   * If ctx.maxDurationMs is not defined, returns Infinity.
   *
   * @param {Object} ctx - Script execution context
   * @returns {number}
   */
  function timeLeft(ctx) {
    if (!ctx || !ctx.maxDurationMs) return Infinity
    if (!ctx.startTime) return Infinity

    const elapsed = Date.now() - ctx.startTime.getTime()
    return Math.max(ctx.maxDurationMs - elapsed, 0)
  }

  /**
   * Determines whether execution should stop soon.
   *
   * Intended to be called inside loops or between heavy operations.
   *
   * @param {Object} ctx - Script execution context
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
   *
   * If not enough time is left:
   * - updates execution status (best effort)
   * - logs warning
   * - throws Error to exit execution safely
   *
   * Intended for "point of no return" operations.
   *
   * @param {Object} ctx - Script execution context
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

    // best-effort status update
    try {
      if (ctx && ctx.check) {
        ctx.check.setStatus(ctx, message)
      }
    } catch (_) {}

    // best-effort logging
    try {
      if (ctx && ctx.log) {
        ctx.log.alert(message)
      }
    } catch (_) {}

    throw new Error(message)
  }

  return {
    timeLeft: timeLeft,
    shouldStop: shouldStop,
    assertTime: assertTime
  }
}