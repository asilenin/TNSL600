function normalizeBoolean(value) {
  if (value === true) return true
  if (value === false) return false
  if (typeof value === 'string') {
    return value.toUpperCase() === 'TRUE'
  }
  return false
}

function isActiveFlag(value) {
  return value === true || value === 'TRUE'
}