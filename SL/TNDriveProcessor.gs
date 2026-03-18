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
 * - moveFile/moveFolder and getFileMetadata/getFolderMetadata are intentionally
 *   separate methods — type detection via an extra API call would double request cost
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

  // ---------- move ----------

  /**
   * Moves a file to a new parent folder.
   * Does NOT move folders — use moveFolder() for that.
   *
   * GAS mode: uses File.moveTo(folder)
   * API mode: uses Files.update with addParents/removeParents
   *
   * @param {string} fileId
   * @param {string} newParentId
   */
  function moveFile(fileId, newParentId) {
    if (!fileId || !newParentId) {
      throw new Error('TNDriveProcessor.moveFile: fileId and newParentId are required')
    }

    if (_mode === 'API') {
      const file = Drive.Files.get(fileId, {
        fields: 'parents',
        supportsAllDrives: true
      })
      const oldParents = (file.parents || []).join(',')

      Drive.Files.update(
        {},
        fileId,
        null,
        {
          addParents:    newParentId,
          removeParents: oldParents,
          supportsAllDrives: true
        }
      )
      return
    }

    const file   = DriveApp.getFileById(fileId)
    const folder = DriveApp.getFolderById(newParentId)
    file.moveTo(folder)
  }

  /**
   * Moves a folder (and all its contents) to a new parent folder.
   * Does NOT move files — use moveFile() for that.
   *
   * GAS mode: uses Folder.moveTo(folder)
   * API mode: uses Files.update with addParents/removeParents
   *           (Drive moves folder contents automatically)
   *
   * @param {string} folderId
   * @param {string} newParentId
   */
  function moveFolder(folderId, newParentId) {
    if (!folderId || !newParentId) {
      throw new Error('TNDriveProcessor.moveFolder: folderId and newParentId are required')
    }

    if (_mode === 'API') {
      const folder = Drive.Files.get(folderId, {
        fields: 'parents',
        supportsAllDrives: true
      })
      const oldParents = (folder.parents || []).join(',')

      Drive.Files.update(
        {},
        folderId,
        null,
        {
          addParents:    newParentId,
          removeParents: oldParents,
          supportsAllDrives: true
        }
      )
      return
    }

    const folder    = DriveApp.getFolderById(folderId)
    const newParent = DriveApp.getFolderById(newParentId)
    folder.moveTo(newParent)
  }

  // ---------- copy ----------

  /**
   * Copies a file to a destination folder, optionally with a new name.
   * Returns the ID of the new file.
   *
   * GAS mode: uses File.makeCopy()
   * API mode: uses Files.copy()
   *
   * @param {string} fileId
   * @param {string} destFolderId
   * @param {string} [newName] - If omitted, keeps original name
   * @returns {string} new file ID
   */
  function copyFile(fileId, destFolderId, newName) {
    if (!fileId || !destFolderId) {
      throw new Error('TNDriveProcessor.copyFile: fileId and destFolderId are required')
    }

    if (_mode === 'API') {
      const resource = { parents: [destFolderId] }
      if (newName) resource.name = newName

      const copied = Drive.Files.copy(
        resource,
        fileId,
        { supportsAllDrives: true }
      )
      return copied.id
    }

    const file   = DriveApp.getFileById(fileId)
    const folder = DriveApp.getFolderById(destFolderId)
    const copy   = newName
      ? file.makeCopy(newName, folder)
      : file.makeCopy(folder)

    return copy.getId()
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

  // ---------- metadata ----------

  /**
   * Returns metadata for a file.
   *
   * GAS fields:  id, name, mimeType, type, url, createdTime, modifiedTime,
   *              size, owner, description, starred, trashed
   * API fields:  id, name, mimeType, type, url, createdTime, modifiedTime,
   *              size, owner, description, starred, trashed, parents
   *
   * Note: 'parents' is only available in API mode.
   *       'size' is 0 for Google Workspace files (Docs, Sheets, etc.).
   *
   * @param {string} fileId
   * @returns {Object}
   */
  function getFileMetadata(fileId) {
    if (!fileId) {
      throw new Error('TNDriveProcessor.getFileMetadata: fileId is required')
    }

    if (_mode === 'API') {
      const f = Drive.Files.get(fileId, {
        fields: 'id,name,mimeType,webViewLink,createdTime,modifiedTime,' +
                'size,owners,description,starred,trashed,parents',
        supportsAllDrives: true
      })
      return {
        id:           f.id,
        name:         f.name,
        mimeType:     f.mimeType,
        type:         'file',
        url:          f.webViewLink,
        createdTime:  f.createdTime  ? new Date(f.createdTime)  : null,
        modifiedTime: f.modifiedTime ? new Date(f.modifiedTime) : null,
        size:         Number(f.size) || 0,
        owner:        f.owners && f.owners[0] ? f.owners[0].emailAddress : null,
        description:  f.description || '',
        starred:      f.starred  || false,
        trashed:      f.trashed  || false,
        parents:      f.parents  || []   // API only
      }
    }

    const f = DriveApp.getFileById(fileId)
    return {
      id:           f.getId(),
      name:         f.getName(),
      mimeType:     f.getMimeType(),
      type:         'file',
      url:          f.getUrl(),
      createdTime:  f.getDateCreated(),
      modifiedTime: f.getLastUpdated(),
      size:         f.getSize(),
      owner:        f.getOwner() ? f.getOwner().getEmail() : null,
      description:  f.getDescription(),
      starred:      f.isStarred(),
      trashed:      f.isTrashed(),
      parents:      null  // not available in GAS mode
    }
  }

  /**
   * Returns metadata for a folder.
   *
   * GAS fields:  id, name, mimeType, type, url, createdTime, modifiedTime,
   *              owner, description, starred, trashed
   * API fields:  id, name, mimeType, type, url, createdTime, modifiedTime,
   *              owner, description, starred, trashed, parents
   *
   * Note: 'parents' is only available in API mode.
   *       'size' is not available for folders in either mode.
   *
   * @param {string} folderId
   * @returns {Object}
   */
  function getFolderMetadata(folderId) {
    if (!folderId) {
      throw new Error('TNDriveProcessor.getFolderMetadata: folderId is required')
    }

    if (_mode === 'API') {
      const f = Drive.Files.get(folderId, {
        fields: 'id,name,mimeType,webViewLink,createdTime,modifiedTime,' +
                'owners,description,starred,trashed,parents',
        supportsAllDrives: true
      })
      return {
        id:           f.id,
        name:         f.name,
        mimeType:     f.mimeType,
        type:         'folder',
        url:          f.webViewLink,
        createdTime:  f.createdTime  ? new Date(f.createdTime)  : null,
        modifiedTime: f.modifiedTime ? new Date(f.modifiedTime) : null,
        owner:        f.owners && f.owners[0] ? f.owners[0].emailAddress : null,
        description:  f.description || '',
        starred:      f.starred || false,
        trashed:      f.trashed || false,
        parents:      f.parents || []   // API only
      }
    }

    const f = DriveApp.getFolderById(folderId)
    return {
      id:           f.getId(),
      name:         f.getName(),
      mimeType:     f.getMimeType ? f.getMimeType() : 'application/vnd.google-apps.folder',
      type:         'folder',
      url:          f.getUrl(),
      createdTime:  f.getDateCreated(),
      modifiedTime: f.getLastUpdated(),
      owner:        f.getOwner() ? f.getOwner().getEmail() : null,
      description:  f.getDescription(),
      starred:      f.isStarred(),
      trashed:      f.isTrashed(),
      parents:      null  // not available in GAS mode
    }
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
    moveFile,
    moveFolder,
    copyFile,
    ensureEditorAccess,
    getFileMetadata,
    getFolderMetadata
  }
}