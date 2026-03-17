/**
 * TNCheck — execution state and concurrency control factory.
 *
 * Responsibilities:
 * - Prevent parallel script execution
 * - Detect and recover from stalled executions
 * - Track execution progress and status
 * - Expose execution state for UI / formulas
 *
 * Storage: DocumentProperties (per spreadsheet)
 *
 * IMPORTANT:
 * Exported as a factory function for GAS library compatibility.
 */
function TNCheck() {

  // ---------- public API ----------

  /**
   * Attempts to acquire execution lock.
   *
   * @param {Object} ctx - Script execution context
   * @returns {{ allowed: boolean, cleared: boolean, state: Object }}
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
        return { allowed: false, cleared: false, state: state }
      }
    }

    _setState(ctx, {
      run: true,
      startTime: now,
      runner: ctx.user,
      progress: 0,
      status: 'started'
    })

    return { allowed: true, cleared: cleared, state: _getState(ctx) }
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

  /**
   * Checks whether execution time exceeded ctx.maxDurationMs.
   * Intended to be called during script execution.
   *
   * @param {Object} ctx
   * @returns {boolean}
   */
  function shouldStop(ctx) {
    if (!ctx.maxDurationMs) return false

    const state = _getState(ctx)
    if (!state.startTime) return false

    return Date.now() - state.startTime > ctx.maxDurationMs
  }

  /**
   * Returns execution state formatted as a row for spreadsheet UI.
   * Intended to be used in custom functions or UI bindings.
   *
   * @param {string} scriptName
   * @returns {Array}
   *
   * @example
   * =TN_CHECK_STATE("MyScript")
   */
  function getStateRow(scriptName) {
    const ctx = TNInitiation({
      scriptName: scriptName,
      runMode: 'USER_SILENT'
    })

    const state = getState(ctx)

    return [
      state.run ? String(state.run).toUpperCase() : '',
      state.startTime ? new Date(state.startTime) : '',
      state.endTime ? new Date(state.endTime) : '',
      state.status || '',
      Math.round(state.progress || 0),
      state.runner || ''
    ]
  }

  // ---------- internal helpers ----------

  function _key(ctx, name) {
    return ctx.ssId + '|' + ctx.scriptName + '|' + name
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
    Object.keys(patch).forEach(function (k) {
      p.setProperty(_key(ctx, k), String(patch[k]))
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

  // ---------- export ----------

  return {
    tryStart: tryStart,
    finish: finish,
    setProgress: setProgress,
    setStatus: setStatus,
    getState: getState,
    reset: reset,
    shouldStop: shouldStop,
    getStateRow: getStateRow
  }
}