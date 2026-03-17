/**
 * TNDriveProcessor — Google Drive access factory for SL6_Main.
 *
 * Supports two backends:
 * - GAS → DriveApp
 * - API → Advanced Drive API (Drive.*)
 *
 * Notes:
 * - In API mode you MUST enable Advanced Google Services: Drive API
 * - For Shared Drives, API calls include supportsAllDrives/includeItemsFromAllDrives
 * - Backend mode is inherited from ctx.dataMode unless overridden via configure()
 *
 * @param {Object} ctx - Script execution context from TNInitiation
 * @returns {Object} TNDriveProcessor public API
 */
function TNDriveProcessor(ctx) {

  // ---------- internal state ----------

  let _mode = ctx && ctx.dataMode ? ctx.dataMode : 'GAS'

  // ---------- configuration ----------

  /**
   * Overrides backend mode for this instance.
   *
   * @param {{mode: ('GAS'|'API')}} options
   */
  function configure(options) {
    options = options || {}
    if (options.mode === 'GAS' || options.mode === 'API') {
      _mode = options.mode
    }
  }

  // ---------- helpers: ID / URL ----------

  /**
   * Extracts Google Drive file or folder ID from URL.
   *
   * @param {string} url
   * @returns {string}
   */
  function extractIdFromUrl(url) {
    const match = String(url).match(/[-\w]{25,}/)
    if (!match) {
      throw new Error('TNDriveProcessor.extractIdFromUrl: invalid URL')
    }
    return match[0]
  }

  /**
   * Builds a Google Sheets file URL from ID.
   *
   * @param {string} fileId
   * @returns {string}
   */
  function buildFileUrl(fileId) {
    if (!fileId) {
      throw new Error('TNDriveProcessor.buildFileUrl: invalid fileId')
    }
    return 'https://docs.google.com/spreadsheets/d/' + fileId
  }

  /**
   * Builds a Google Drive folder URL from ID.
   *
   * @param {string} folderId
   * @returns {string}
   */
  function buildFolderUrl(folderId) {
    if (!folderId) {
      throw new Error('TNDriveProcessor.buildFolderUrl: invalid folderId')
    }
    return 'https://drive.google.com/drive/folders/' + folderId
  }

  // ---------- folders ----------

  /**
   * Returns folder with given name inside parent. Creates if missing.
   *
   * GAS mode:
   *   parent  = GoogleAppsScript.Drive.Folder object
   *   returns   GoogleAppsScript.Drive.Folder object
   *
   * API mode:
   *   parent  = parentFolderId (string)
   *   returns   folderId (string)
   *
   * @param {(GoogleAppsScript.Drive.Folder|string)} parent
   * @param {string} folderName
   * @returns {(GoogleAppsScript.Drive.Folder|string)}
   */
  function getOrCreateFolder(parent, folderName) {
    if (!parent || !folderName) {
      throw new Error('TNDriveProcessor.getOrCreateFolder: invalid arguments')
    }

    if (_mode === 'API') {
      return _getOrCreateFolderAPI(String(parent), String(folderName))
    }

    return _getOrCreateFolderGAS(parent, String(folderName))
  }

  // ---------- permissions ----------

  /**
   * Ensures user has editor (writer) access to folder.
   * No-op if permission already granted.
   *
   * @param {string} folderId
   * @param {string} userEmail
   */
  function ensureEditorAccess(folderId, userEmail) {
    if (!folderId || !userEmail) return

    if (_mode === 'API') {
      _ensureEditorAccessAPI(String(folderId), String(userEmail))
      return
    }

    _ensureEditorAccessGAS(String(folderId), String(userEmail))
  }

  // ---------- internal: folders ----------

  function _getOrCreateFolderGAS(parentFolder, folderName) {
    const it = parentFolder.getFoldersByName(folderName)
    if (it.hasNext()) return it.next()
    return parentFolder.createFolder(folderName)
  }

  function _getOrCreateFolderAPI(parent, folderName) {
    const parentFolderId = _getParentFolderId(parent)
    const safeName = folderName.replace(/'/g, "\\'")

    const q =
      "'" + parentFolderId + "' in parents and " +
      "mimeType='application/vnd.google-apps.folder' and " +
      "name='" + safeName + "' and trashed=false"

    const res = Drive.Files.list({
      q: q,
      fields: 'files(id,name)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    })

    if (res && res.files && res.files.length > 0) {
      return res.files[0].id
    }

    const created = Drive.Files.create(
      {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentFolderId]
      },
      null,
      { supportsAllDrives: true }
    )

    return created.id
  }

  function _getParentFolderId(parent) {
    if (typeof parent === 'string') return parent
    if (parent && typeof parent.getId === 'function') return parent.getId()
    throw new Error('TNDriveProcessor: invalid parent folder reference')
  }

  // ---------- internal: permissions ----------

  function _ensureEditorAccessGAS(folderId, userEmail) {
    const folder = DriveApp.getFolderById(folderId)
    const editors = folder.getEditors()

    for (let i = 0; i < editors.length; i++) {
      if (editors[i].getEmail() === userEmail) return
    }

    folder.addEditor(userEmail)
  }

  function _ensureEditorAccessAPI(folderId, userEmail) {
    const list = Drive.Permissions.list(folderId, {
      fields: 'permissions(emailAddress,role)',
      supportsAllDrives: true
    })

    if (list && list.permissions && list.permissions.length) {
      for (let i = 0; i < list.permissions.length; i++) {
        const p = list.permissions[i]
        if (p && p.emailAddress === userEmail) return
      }
    }

    Drive.Permissions.create(
      {
        type: 'user',
        role: 'writer',
        emailAddress: userEmail
      },
      folderId,
      { supportsAllDrives: true }
    )
  }

  // ---------- export ----------

  return {
    configure,
    extractIdFromUrl,
    buildFileUrl,
    buildFolderUrl,
    getOrCreateFolder,
    ensureEditorAccess
  }
}