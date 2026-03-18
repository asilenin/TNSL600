/**
 * TNTemplateSelector — template resolution factory.
 *
 * Part of SL6_Main library.
 *
 * Responsibilities:
 * - Resolve active template URL by name
 * - List all available templates from registry spreadsheet
 *
 * Registry spreadsheet structure:
 * - One sheet per template (e.g. "CE", "TIMING")
 * - Each sheet has a header row with columns: version | link | actual
 * - Exactly one row per sheet has actual = TRUE (the active version)
 *
 * Registry SS ID is read from Main List named range 'templatesList'.
 * Requires enableMainList: true in TNInitiation.
 *
 * Lazy initialization: registry SS is opened only on first method call.
 * Results are cached for the lifetime of the script execution.
 *
 * @param {Object} ctx - Script execution context from TNInitiation
 * @returns {Object} TNTemplateSelector public API
 */
function TNTemplateSelector(ctx) {

  // ---------- internal state ----------

  /** @type {GoogleAppsScript.Spreadsheet.Spreadsheet|null} */
  let _registrySS = null

  /**
   * Cache: { templateName: { version, url } }
   * Populated on first call to listTemplates() or getActiveTemplate().
   * @type {Object|null}
   */
  let _cache = null

  // ---------- internal helpers ----------

  /**
   * Ensures registry SS is open. Opens lazily on first call.
   * Reads registry SS ID from Main List named range 'templatesList'.
   */
  function _ensureInit() {
    if (_registrySS) return

    if (!ctx.mainList) {
      throw new Error(
        'TNTemplateSelector: requires enableMainList: true and mainListSsId in TNInitiation'
      )
    }

    const ssId = ctx.mainList.readNamedRange('templatesList')
    if (!ssId || typeof ssId !== 'string') {
      throw new Error(
        'TNTemplateSelector: named range "templatesList" is missing or empty in Main List'
      )
    }

    _registrySS = SpreadsheetApp.openById(ssId)
    ctx.log.debug('TNTemplateSelector: registry SS opened')
  }

  /**
   * Builds the full cache from registry SS.
   * Reads all sheets, finds header row with version/link/actual,
   * extracts the active row from each sheet.
   */
  function _buildCache() {
    if (_cache) return

    _ensureInit()

    _cache = {}

    const sheets = _registrySS.getSheets()

    sheets.forEach(function (sheet) {
      const name = sheet.getName()

      // find table with required headers
      const table = ctx.data.findTable(_registrySS, name, ['version', 'link', 'actual'])
      if (!table) {
        ctx.log.debug('TNTemplateSelector: sheet "' + name + '" skipped — headers not found')
        return
      }

      // find index of each header in the found row
      const vIdx = table.headers.indexOf('version')
      const lIdx = table.headers.indexOf('link')
      const aIdx = table.headers.indexOf('actual')

      // find active row
      const activeRows = table.valuesClean.filter(function (row) {
        return isActiveFlag(row[aIdx])
      })

      if (activeRows.length === 0) {
        ctx.log.debug('TNTemplateSelector: sheet "' + name + '" — no active row')
        return
      }

      if (activeRows.length > 1) {
        ctx.log.alert('TNTemplateSelector: sheet "' + name + '" — multiple active rows, using first')
      }

      const activeRow = activeRows[0]
      const version   = activeRow[vIdx]
      const url       = activeRow[lIdx]

      if (!url || typeof url !== 'string') {
        ctx.log.alert('TNTemplateSelector: sheet "' + name + '" — invalid URL, skipped')
        return
      }

      _cache[name] = { version: version, url: url }
      ctx.log.debug('TNTemplateSelector: cached "' + name + '" v' + version)
    })

    ctx.log.debug('TNTemplateSelector: cache built, ' + Object.keys(_cache).length + ' templates')
  }

  // ---------- public API ----------

  /**
   * Returns a list of all available templates with their active version metadata.
   * Results are cached after first call.
   *
   * @returns {Array<{ name: string, version: any, url: string }>}
   *
   * @example
   * const list = templates.listTemplates()
   * // → [{ name: 'CE', version: '1.2', url: 'https://...' }, ...]
   *
   * // find url by template name:
   * const url = list.find(t => t.name === templateName)?.url
   */
  function listTemplates() {
    _buildCache()

    return Object.keys(_cache).map(function (name) {
      return {
        name:    name,
        version: _cache[name].version,
        url:     _cache[name].url
      }
    })
  }

  /**
   * Returns active template metadata for the given template name.
   * Uses cache if already populated by listTemplates() or previous call.
   *
   * @param {string} templateName - Sheet name in the registry spreadsheet
   * @returns {{ version: any, url: string }}
   * @throws {Error} if template not found or has no active row
   *
   * @example
   * const tpl = templates.getActiveTemplate('CE')
   * log.info('URL: ' + tpl.url)
   * log.info('Version: ' + tpl.version)
   */
  function getActiveTemplate(templateName) {
    if (!templateName || typeof templateName !== 'string') {
      throw new Error('TNTemplateSelector.getActiveTemplate: templateName is required')
    }

    _buildCache()

    if (!_cache[templateName]) {
      throw new Error('TNTemplateSelector: template not found or has no active row: ' + templateName)
    }

    ctx.log.debug('TNTemplateSelector: resolved "' + templateName + '"')
    return _cache[templateName]
  }

  /**
   * Returns active template URL for the given template name.
   * Shorthand for getActiveTemplate(name).url
   *
   * @param {string} templateName
   * @returns {string}
   *
   * @example
   * const url = templates.getActiveTemplateUrl('CE')
   */
  function getActiveTemplateUrl(templateName) {
    return getActiveTemplate(templateName).url
  }

  // ---------- export ----------

  return {
    listTemplates:       listTemplates,
    getActiveTemplate:   getActiveTemplate,
    getActiveTemplateUrl: getActiveTemplateUrl
  }
}