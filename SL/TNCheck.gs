/**
 * TNCheck — execution state and concurrency control factory.
 *
 * Responsibilities:
 * - Prevent parallel script execution
 * - Detect and recover from stalled executions
 * - Track execution progress and status
 * - Store arbitrary meta per execution (batch state, counters, etc.)
 * - Expose execution state for UI / spreadsheet formulas
 *
 * Storage: DocumentProperties (per spreadsheet)
 * Key format: {ssId}|{scriptName}|{field}
 *
 * IMPORTANT:
 * Exported as a factory function for GAS library compatibility.
 */
function TNCheck() {

  // ---------- public API ----------

  /**
   * Attempts to acquire execution lock.
   *
   * @param {Object} ctx
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
      run:       true,
      startTime: now,
      runner:    ctx.user,
      progress:  0,
      status:    'started'
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
      run:     false,
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
   * Returns elapsed time in ms since tryStart().
   * Returns 0 if startTime is not set.
   *
   * @param {Object} ctx
   * @returns {number}
   */
  function getElapsed(ctx) {
    const state = _getState(ctx)
    if (!state.startTime) return 0
    return Date.now() - state.startTime
  }

  /**
   * Forcefully resets execution state.
   * Does NOT clear meta — use clearMeta() separately if needed.
   *
   * @param {Object} ctx
   */
  function reset(ctx) {
    _resetState(ctx)
  }

  /**
   * Checks whether execution time exceeded ctx.maxDurationMs.
   * Reads from DocumentProperties — avoid calling inside tight loops.
   * For loops use runtime.shouldStop(ctx) instead (in-memory, faster).
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

  // ---------- meta ----------

  /**
   * Stores an arbitrary value in DocumentProperties under this script's namespace.
   * Useful for persisting batch state across multiple executions.
   *
   * All meta keys are tracked internally so clearMeta() can remove them all.
   *
   * @param {Object} ctx
   * @param {string} key
   * @param {string|number} value
   */
  function setMeta(ctx, key, value) {
    const p = _props()

    // register the key in the meta index
    const indexKey = _key(ctx, 'meta:__index__')
    const existing = p.getProperty(indexKey)
    const index = existing ? JSON.parse(existing) : []

    if (index.indexOf(key) === -1) {
      index.push(key)
      p.setProperty(indexKey, JSON.stringify(index))
    }

    p.setProperty(_key(ctx, 'meta:' + key), String(value))
  }

  /**
   * Reads a meta value previously stored by setMeta().
   * Returns null if key does not exist.
   *
   * @param {Object} ctx
   * @param {string} key
   * @returns {string|null}
   */
  function getMeta(ctx, key) {
    return _props().getProperty(_key(ctx, 'meta:' + key))
  }

  /**
   * Deletes all meta keys stored for this script.
   * Also clears the meta index.
   *
   * Call at the end of a batch series when accumulated meta is no longer needed.
   *
   * @param {Object} ctx
   */
  function clearMeta(ctx) {
    const p = _props()
    const indexKey = _key(ctx, 'meta:__index__')
    const existing = p.getProperty(indexKey)

    if (!existing) return

    const index = JSON.parse(existing)
    index.forEach(function (key) {
      p.deleteProperty(_key(ctx, 'meta:' + key))
    })

    p.deleteProperty(indexKey)
  }

  // ---------- spreadsheet UI ----------

  /**
   * Returns execution state as a flat array for spreadsheet formula use.
   * Reads DocumentProperties directly — no TNInitiation, no side effects.
   *
   * Columns: run | startTime | endTime | status | progress | runner
   *
   * Usage in spreadsheet:
   *   =TN_CHECK_STATE("MyScript")
   *
   * @param {string} scriptName
   * @returns {Array}
   */
  function getStateRow(scriptName) {
    const ssId    = SpreadsheetApp.getActiveSpreadsheet().getId()
    const miniCtx = { ssId: ssId, scriptName: scriptName }
    const state   = _getState(miniCtx)

    return [
      state.run ? 'TRUE' : '',
      state.startTime ? new Date(state.startTime) : '',
      state.endTime   ? new Date(state.endTime)   : '',
      state.status   || '',
      Math.round(state.progress || 0),
      state.runner   || ''
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
      run:       p.getProperty(_key(ctx, 'run')) === 'true',
      runner:    p.getProperty(_key(ctx, 'runner')),
      startTime: Number(p.getProperty(_key(ctx, 'startTime'))) || null,
      endTime:   Number(p.getProperty(_key(ctx, 'endTime')))   || null,
      progress:  Number(p.getProperty(_key(ctx, 'progress')))  || 0,
      status:    p.getProperty(_key(ctx, 'status')) || ''
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
      run:       false,
      runner:    '',
      startTime: '',
      endTime:   '',
      progress:  0,
      status:    'reset'
    })
  }

  // ---------- export ----------

  return {
    tryStart:    tryStart,
    finish:      finish,
    setProgress: setProgress,
    setStatus:   setStatus,
    getState:    getState,
    getElapsed:  getElapsed,
    reset:       reset,
    shouldStop:  shouldStop,
    setMeta:     setMeta,
    getMeta:     getMeta,
    clearMeta:   clearMeta,
    getStateRow: getStateRow
  }
}