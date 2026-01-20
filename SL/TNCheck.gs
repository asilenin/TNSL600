/**
 * TNCheck — execution state and concurrency control factory.
 * TNCheck relies on ctx.maxDurationMs to determine whether a running execution is considered stalled.
 * Timeout logic is controlled by the caller, not by TNCheck itself.
 * Responsibilities:
 * - Prevent parallel script execution
 * - Detect and recover from stalled executions
 * - Track execution progress and status
 * - Expose execution state for UI / formulas
 *
 * Storage: DocumentProperties (per spreadsheet)
 */
const TNCheck = (() => {

  const MAX_DURATION_MS = 28 * 60 * 1000 // 28 minutes

  // ---------- public API ----------

  /**
   * Attempts to acquire execution lock.
   *
   * @param {Object} ctx - Script execution context (TNSV)
   * @returns {{ allowed: boolean, cleared: boolean, state: Object }}
   *
   * @example
   * const check = TNCheck.tryStart(ctx)
   * if (!check.allowed) return
   */
  function tryStart(ctx) {
    const state = _getState(ctx)
    const now = Date.now()

    let cleared = false

    if (state.run === true) {
      if (
        ctx.maxDurationMs &&
        (!state.startTime || now - state.startTime > ctx.maxDurationMs)
      ) {
        _resetState(ctx)
        cleared = true
      } else {
        return { allowed: false, cleared: false, state }
      }
    }

    _setState(ctx, {
      run: true,
      startTime: now,
      runner: ctx.user,
      progress: 0,
      status: 'started'
    })

    return { allowed: true, cleared, state: _getState(ctx) }
  }

  /**
   * Marks script execution as finished.
   *
   * @param {Object} ctx
   */
  function finish(ctx) {
    _setState(ctx, {
      run: false,
      endTime: Date.now()
    })
  }

  /**
   * Updates execution progress.
   *
   * @param {Object} ctx
   * @param {number} value
   */
  function setProgress(ctx, value) {
    _setState(ctx, { progress: value })
  }

  /**
   * Updates execution status text.
   *
   * @param {Object} ctx
   * @param {string} text
   */
  function setStatus(ctx, text) {
    _setState(ctx, { status: String(text) })
  }

  /**
   * Returns current execution state.
   * Intended for UI / spreadsheet formulas.
   *
   * @param {Object} ctx
   * @returns {Object}
   */
  function getState(ctx) {
    return _getState(ctx)
  }

  /**
   * Forcefully resets execution state.
   *
   * @param {Object} ctx
   */
  function reset(ctx) {
    _resetState(ctx)
  }

  // ---------- internal ----------

  function _key(ctx, name) {
    return `${ctx.ssId}|${ctx.scriptName}|${name}`
  }

  function _props() {
    return PropertiesService.getDocumentProperties()
  }

  function _getState(ctx) {
    const p = _props()
    return {
      run: p.getProperty(_key(ctx, 'run')) === 'true',
      runner: p.getProperty(_key(ctx, 'runner')),
      startTime: Number(p.getProperty(_key(ctx, 'startTime'))) || null,
      endTime: Number(p.getProperty(_key(ctx, 'endTime'))) || null,
      progress: Number(p.getProperty(_key(ctx, 'progress'))) || 0,
      status: p.getProperty(_key(ctx, 'status')) || ''
    }
  }

  function _setState(ctx, patch) {
    const p = _props()
    Object.entries(patch).forEach(([k, v]) => {
      p.setProperty(_key(ctx, k), String(v))
    })
  }

  function _resetState(ctx) {
    _setState(ctx, {
      run: false,
      runner: '',
      startTime: '',
      endTime: '',
      progress: 0,
      status: 'reset'
    })
  }

  return {
    tryStart,
    finish,
    setProgress,
    setStatus,
    getState,
    reset
  }

})()