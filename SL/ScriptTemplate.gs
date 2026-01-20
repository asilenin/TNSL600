function Script_UserSilent() {

  const ctx = TNInitiation({
    runMode: 'USER_SILENT'
  })

  try {

    TNLog.info('Working silently')

  } catch (e) {

    TNLog.error(e)

  } finally {

    TNLog.flush()
  }
}

function Script_UserToast() {

  const ctx = TNInitiation({
    runMode: 'USER_TOAST'
  })

  try {

    TNLog.info('Started by user')
    TNLog.success('Operation completed')

  } catch (e) {

    TNLog.error(e)

  } finally {

    TNLog.flush()
  }
}

function Script_TriggerLogUI() {

  const ctx = TNInitiation({
    runMode: 'TRIGGER_LOG_UI'
  })

  try {

    TNLog.info('Trigger execution started')

  } catch (e) {

    TNLog.error(e)

  } finally {

    TNLog.flush()
  }
}

function Script_TriggerUI() {

  const ctx = TNInitiation({
    runMode: 'TRIGGER_UI'
  })

  try {

    TNLog.info('Background UI logging')

  } catch (e) {

    TNLog.error(e)

  } finally {

    TNLog.flush()
  }
}

function Script_TriggerSilent() {

  const ctx = TNInitiation({
    runMode: 'TRIGGER_SILENT'
  })

  try {

    // no UI, no file, only console
    TNLog.info('Silent background task')

  } catch (e) {

    TNLog.error(e)

  } finally {

    TNLog.flush()
  }
}