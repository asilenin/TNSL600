/**
 * TNTemplateSelector — template resolution factory.
 *
 * Part of SL6_Main library.
 * Uses ctx-bound services for:
 * - data access (TNDataProcessor)
 * - logging (TNLog)
 *
 * Template registry spreadsheet structure:
 * - One sheet per template (e.g. "CE", "TIMING")
 * - Column A: version
 * - Column B: template spreadsheet URL
 * - Column C: checkbox (TRUE for active template, exactly one row)
 */
function TNTemplateSelector(ctx) {

  /**
   * Spreadsheet ID where template registry is stored.
   * MUST be configured explicitly.
   */
  const TEMPLATE_REGISTRY_SS_ID = '1Wwsk6nN96_o9wki1_CzCUD7b2eXF9h1mRa0Kkg-rEqE'

  /**
   * Returns active template URL for given template name.
   *
   * @param {string} templateName
   * @returns {string}
   */
  function getActiveTemplateUrl(templateName) {
    const tpl = _getActiveTemplateInternal(templateName)
    return tpl.url
  }

  /**
   * Returns active template metadata.
   *
   * @param {string} templateName
   * @returns {{version:any, url:string}}
   */
  function getActiveTemplate(templateName) {
    return _getActiveTemplateInternal(templateName)
  }

  // ---------- internal ----------

  function _getActiveTemplateInternal(templateName) {
    if (!templateName || typeof templateName !== 'string') {
      ctx.log.error('Template name is required')
      throw new Error('Template name is required')
    }

    ctx.log.info('Resolving template: ' + templateName)

    const registrySS = SpreadsheetApp.openById(TEMPLATE_REGISTRY_SS_ID)

    // Read A:C via TNDataProcessor (backend-aware)
    const data = ctx.data.readRange(
      registrySS,
      templateName,
      'A2:C'
    )

    if (!data || !data.length) {
      ctx.log.error('Template sheet empty or not found: ' + templateName)
      throw new Error('Template sheet empty or not found: ' + templateName)
    }
    
    const activeRows = data.filter(row => isActiveFlag(row[2]))

    if (activeRows.length === 0) {
      ctx.log.error('No active template found for: ' + templateName)
      throw new Error('No active template found for: ' + templateName)
    }

    if (activeRows.length > 1) {
      ctx.log.error('Multiple active templates found for: ' + templateName)
      throw new Error('Multiple active templates found for: ' + templateName)
    }

    const version = activeRows[0][0]
    const url = activeRows[0][1]

    if (!url || typeof url !== 'string') {
      ctx.log.error(
        'Active template has invalid URL for: ' + templateName
      )
      throw new Error(
        'Active template has invalid URL for: ' + templateName
      )
    }

    ctx.log.info(
      'Resolved template ' +
        templateName +
        ' (version: ' +
        version +
        ')'
    )

    return {
      version: version,
      url: url
    }
  }

  // ---------- export ----------

  return {
    getActiveTemplateUrl: getActiveTemplateUrl,
    getActiveTemplate: getActiveTemplate
  }
}