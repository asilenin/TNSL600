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

  const check = TNCheck.tryStart(ctx)
  if (!check.allowed) {
    TNLog.alert('Execution already in progress')
    TNLog.flush()
    return
  }

  try {

    TNLog.info('Working silently')

    TNCheck.setProgress(ctx, 1)
    TNCheck.setStatus(ctx, 'step 1')

    TNCheck.setProgress(ctx, 2)
    TNCheck.setStatus(ctx, 'step 2')

    TNCheck.setProgress(ctx, 3)
    TNCheck.setStatus(ctx, 'step 3')

    TNCheck.setProgress(ctx, 4)
    TNCheck.setStatus(ctx, 'step 4')

    TNCheck.setProgress(ctx, 5)
    TNCheck.setStatus(ctx, 'completed')

    TNLog.success('Script finished successfully')

  } catch (e) {

    TNCheck.setStatus(ctx, `failed: ${e}`)
    TNLog.error(e)

  } finally {

    TNCheck.finish(ctx)
    TNLog.flush()
  }
}

function Script_UserToast() {

  const ctx = TNInitiation({
    runMode: 'USER_TOAST',
  	maxDurationMs: 5 * 60 * 1000
  })

  const check = TNCheck.tryStart(ctx)
  if (!check.allowed) {
    TNLog.alert('Execution already in progress')
    TNLog.flush()
    return
  }

  try {

    TNLog.info('Started by user')


    TNCheck.setProgress(ctx, 1)
    TNCheck.setStatus(ctx, 'step 1')

    TNCheck.setProgress(ctx, 2)
    TNCheck.setStatus(ctx, 'step 2')

    TNCheck.setProgress(ctx, 3)
    TNCheck.setStatus(ctx, 'step 3')

    TNCheck.setProgress(ctx, 4)
    TNCheck.setStatus(ctx, 'step 4')

    TNCheck.setProgress(ctx, 5)
    TNCheck.setStatus(ctx, 'completed')

    TNLog.success('Script finished successfully')

  } catch (e) {

    TNCheck.setStatus(ctx, `failed: ${e}`)
    TNLog.error(e)

  } finally {

    TNCheck.finish(ctx)
    TNLog.flush()
  }
}

function Script_TriggerLogUI() {

  const ctx = TNInitiation({
    runMode: 'TRIGGER_LOG_UI',
  	maxDurationMs: 5 * 60 * 1000
  })

  const check = TNCheck.tryStart(ctx)
  if (!check.allowed) {
    TNLog.alert('Execution already in progress')
    TNLog.flush()
    return
  }

  try {

    TNLog.info('Trigger execution started')

    TNCheck.setProgress(ctx, 1)
    TNCheck.setStatus(ctx, 'step 1')

    TNCheck.setProgress(ctx, 2)
    TNCheck.setStatus(ctx, 'step 2')

    TNCheck.setProgress(ctx, 3)
    TNCheck.setStatus(ctx, 'step 3')

    TNCheck.setProgress(ctx, 4)
    TNCheck.setStatus(ctx, 'step 4')

    TNCheck.setProgress(ctx, 5)
    TNCheck.setStatus(ctx, 'completed')

    TNLog.success('Script finished successfully')

  } catch (e) {

    TNCheck.setStatus(ctx, `failed: ${e}`)
    TNLog.error(e)

  } finally {

    TNCheck.finish(ctx)
    TNLog.flush()
  }
}

function Script_TriggerUI() {

  const ctx = TNInitiation({
    runMode: 'TRIGGER_UI',
  	maxDurationMs: 5 * 60 * 1000
  })

  const check = TNCheck.tryStart(ctx)
  if (!check.allowed) {
    TNLog.alert('Execution already in progress')
    TNLog.flush()
    return
  }

  try {

    TNLog.info('Background UI logging')

    TNCheck.setProgress(ctx, 1)
    TNCheck.setStatus(ctx, 'step 1')

    TNCheck.setProgress(ctx, 2)
    TNCheck.setStatus(ctx, 'step 2')

    TNCheck.setProgress(ctx, 3)
    TNCheck.setStatus(ctx, 'step 3')

    TNCheck.setProgress(ctx, 4)
    TNCheck.setStatus(ctx, 'step 4')

    TNCheck.setProgress(ctx, 5)
    TNCheck.setStatus(ctx, 'completed')

    TNLog.success('Script finished successfully')

  } catch (e) {

    TNCheck.setStatus(ctx, `failed: ${e}`)
    TNLog.error(e)

  } finally {

    TNCheck.finish(ctx)
    TNLog.flush()
  }
}

function Script_TriggerSilent() {

  const ctx = TNInitiation({
    runMode: 'TRIGGER_SILENT',
  	maxDurationMs: 5 * 60 * 1000
  })

  const check = TNCheck.tryStart(ctx)
  if (!check.allowed) {
    TNLog.alert('Execution already in progress')
    TNLog.flush()
    return
  }

  try {

    // no UI, no file, only console
    TNLog.info('Silent background task')

    TNCheck.setProgress(ctx, 1)
    TNCheck.setStatus(ctx, 'step 1')

    TNCheck.setProgress(ctx, 2)
    TNCheck.setStatus(ctx, 'step 2')

    TNCheck.setProgress(ctx, 3)
    TNCheck.setStatus(ctx, 'step 3')

    TNCheck.setProgress(ctx, 4)
    TNCheck.setStatus(ctx, 'step 4')

    TNCheck.setProgress(ctx, 5)
    TNCheck.setStatus(ctx, 'completed')

    TNLog.success('Script finished successfully')

  } catch (e) {

    TNCheck.setStatus(ctx, `failed: ${e}`)
    TNLog.error(e)

  } finally {

    TNCheck.finish(ctx)
    TNLog.flush()
  }
}