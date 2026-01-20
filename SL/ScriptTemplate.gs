/**
 * Script templates for SL/TN library.
 *
 * This file contains reference implementations of script entry points
 * for different execution scenarios:
 * - user-triggered
 * - background triggers
 * - silent / UI / toast modes
 *
 * Templates MUST NOT contain business logic.
 * They define structure and execution contract only.
 */

function Script_UserSilent() {

  const ctx = TNInitiation({
    runMode: 'USER_SILENT',
  	maxDurationMs: 5 * 60 * 1000
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
    runMode: 'USER_TOAST',
  	maxDurationMs: 5 * 60 * 1000
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
    runMode: 'TRIGGER_LOG_UI',
  	maxDurationMs: 5 * 60 * 1000
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
    runMode: 'TRIGGER_UI',
  	maxDurationMs: 5 * 60 * 1000
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
    runMode: 'TRIGGER_SILENT',
  	maxDurationMs: 5 * 60 * 1000
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