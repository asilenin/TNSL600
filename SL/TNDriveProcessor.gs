/**
 * TNDriveProcessor — Google Drive access helper for SL6_Main.
 *
 * Supports two backends:
 * - GAS  → DriveApp
 * - API  → Advanced Drive API (Drive.*)
 *
 * Notes:
 * - In API mode you MUST enable Advanced Google Services: Drive API
 * - For Shared Drives support, API calls include supportsAllDrives/includeItemsFromAllDrives
 */
var TNDriveProcessor = {

  _mode: 'GAS',

  // --------------------------------------------------
  // configuration
  // --------------------------------------------------

  /**
   * Configure backend mode.
   *
   * @param {{mode: ('GAS'|'API')}} options
   */
  configure: function (options) {
    options = options || {};
    if (options.mode === 'GAS' || options.mode === 'API') {
      this._mode = options.mode;
    }
  },

  // --------------------------------------------------
  // helpers: ID / URL
  // --------------------------------------------------

  /**
   * Extracts Google Drive file or folder ID from URL.
   *
   * @param {string} url
   * @returns {string} fileId or folderId
   */
  extractIdFromUrl: function (url) {
    var match = String(url).match(/[-\w]{25,}/);
    if (!match) {
      throw new Error('TNDriveProcessor.extractIdFromUrl: invalid URL');
    }
    return match[0];
  },

  /**
   * Builds a Google Drive file URL from ID.
   *
   * @param {string} fileId
   * @returns {string}
   */
  buildFileUrl: function (fileId) {
    if (!fileId) {
      throw new Error('TNDriveProcessor.buildFileUrl: invalid fileId');
    }
    return 'https://docs.google.com/spreadsheets/d/' + fileId;
  },

  /**
   * Builds a Google Drive folder URL from ID.
   *
   * @param {string} folderId
   * @returns {string}
   */
  buildFolderUrl: function (folderId) {
    if (!folderId) {
      throw new Error('TNDriveProcessor.buildFolderUrl: invalid folderId');
    }
    return 'https://drive.google.com/drive/folders/' + folderId;
  },

  // --------------------------------------------------
  // folders
  // --------------------------------------------------

  /**
   * Returns folder with given name inside parent. Creates if missing.
   *
   * GAS mode:
   *   parent = GoogleAppsScript.Drive.Folder
   *   returns GoogleAppsScript.Drive.Folder
   *
   * API mode:
   *   parent = parentFolderId (string)
   *   returns folderId (string)
   *
   * @param {(GoogleAppsScript.Drive.Folder|string)} parent
   * @param {string} folderName
   * @returns {(GoogleAppsScript.Drive.Folder|string)}
   */
  getOrCreateFolder: function (parent, folderName) {
    if (!parent || !folderName) {
      throw new Error('TNDriveProcessor.getOrCreateFolder: invalid arguments');
    }

    if (this._mode === 'API') {
      return this._getOrCreateFolderAPI(String(parent), String(folderName));
    }

    return this._getOrCreateFolderGAS(parent, String(folderName));
  },

  _getOrCreateFolderGAS: function (parentFolder, folderName) {
    var it = parentFolder.getFoldersByName(folderName);
    if (it.hasNext()) {
      return it.next();
    }
    return parentFolder.createFolder(folderName);
  },

  _getOrCreateFolderAPI: function (parent, folderName) {
    var parentFolderId = this._getParentFolderId(parent);
    var safeName = folderName.replace(/'/g, "\\'");

    var q =
      "'" + parentFolderId + "' in parents and " +
      "mimeType='application/vnd.google-apps.folder' and " +
      "name='" + safeName + "' and trashed=false";

    var res = Drive.Files.list({
      q: q,
      fields: 'files(id,name)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    });

    if (res && res.files && res.files.length > 0) {
      return res.files[0].id;
    }

    var created = Drive.Files.create(
      {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentFolderId]
      },
      null,
      { supportsAllDrives: true }
    );

    return created.id;
  },

  _getParentFolderId: function (parent) {
    if (typeof parent === 'string') return parent;
    if (parent && typeof parent.getId === 'function') {
      return parent.getId();
    }
    throw new Error('TNDriveProcessor: invalid parent folder reference');
  },

  // --------------------------------------------------
  // permissions
  // --------------------------------------------------

  /**
   * Ensures user has editor (writer) access to folder.
   * If already has permission — no-op.
   *
   * @param {string} folderId
   * @param {string} userEmail
   */
  ensureEditorAccess: function (folderId, userEmail) {
    if (!folderId || !userEmail) return;

    if (this._mode === 'API') {
      this._ensureEditorAccessAPI(String(folderId), String(userEmail));
      return;
    }

    this._ensureEditorAccessGAS(String(folderId), String(userEmail));
  },

  _ensureEditorAccessGAS: function (folderId, userEmail) {
    var folder = DriveApp.getFolderById(folderId);
    var editors = folder.getEditors();

    for (var i = 0; i < editors.length; i++) {
      if (editors[i].getEmail() === userEmail) {
        return;
      }
    }

    folder.addEditor(userEmail);
  },

  _ensureEditorAccessAPI: function (folderId, userEmail) {
    var list = Drive.Permissions.list(folderId, {
      fields: 'permissions(emailAddress,role)',
      supportsAllDrives: true
    });

    if (list && list.permissions && list.permissions.length) {
      for (var i = 0; i < list.permissions.length; i++) {
        var p = list.permissions[i];
        if (p && p.emailAddress === userEmail) {
          return;
        }
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
    );
  }

};