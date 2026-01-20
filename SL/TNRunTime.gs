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
 * - interact with UI
 * - manage locks or concurrency
 */
const TNRunTime = (() => {

  const DEFAULT_SAFETY_MS = 30 * 1000 // 30 seconds safety margin

  /**
   * Returns remaining execution time in milliseconds.
   *
   * If ctx.maxDurationMs is not defined, returns Infinity.
   *
   * @param {Object} ctx - Script execution context
   * @returns {number} milliseconds left
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
   * @param {number} [safetyMs=30000] - Safety margin before hard timeout
   * @returns {boolean}
   *
   * @example
   * if (TNRunTime.shouldStop(ctx)) break;
   */
  function shouldStop(ctx, safetyMs = DEFAULT_SAFETY_MS) {
    return timeLeft(ctx) <= safetyMs
  }

  /**
   * Asserts that enough execution time remains.
   *
   * If not enough time is left:
   * - updates TNCheck status (if available)
   * - logs controlled error
   * - throws an Error to trigger catch/finally
   *
   * Intended for "point of no return" operations.
   *
   * @param {Object} ctx - Script execution context
   * @param {string} [label] - Optional location label for debugging
   *
   * @throws {Error}
   *
   * @example
   * TNRunTime.assertTime(ctx, 'before batch write');
   */
  function assertTime(ctx, label = '') {
    if (!ctx || !ctx.maxDurationMs) return

    const left = timeLeft(ctx)
    if (left > DEFAULT_SAFETY_MS) return

    const message =
      `Execution time limit approaching` +
      (label ? ` at ${label}` : '') +
      ` (${Math.round(left / 1000)}s left)`

    // best-effort status update
    try {
      if (typeof TNCheck !== 'undefined') {
        TNCheck.setStatus(ctx, message)
      }
    } catch (_) {}

    // log and throw controlled error
    try {
      if (typeof TNLog !== 'undefined') {
        TNLog.alert(message)
      }
    } catch (_) {}

    throw new Error(message)
  }

  return {
    timeLeft,
    shouldStop,
    assertTime
  }

})()