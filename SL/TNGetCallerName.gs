/**
 * Returns the name of the calling function from the consumer project.
 *
 * Works reliably when called directly from a consumer script
 * (before entering deeper library calls).
 *
 * @returns {string|null}
 */
function TNGetCallerName() {
  try {
    throw new Error()
  } catch (e) {
    const stack = String(e.stack || '').split('\n')

    // Expected format:
    // [0] Error
    // [1] at TNGetCallerName (...)
    // [2] at ConsumerFunction (...)
    if (stack.length >= 3) {
      const line = stack[2].trim()
      const match = line.match(/at (\w+)/)
      if (match) {
        return match[1]
      }
    }
  }
  return null
}