export function buildParams(params = {}) {
  const cleaned = {}
  Object.entries(params).forEach(([key, value]) => {
    if (value !== '' && value !== null && value !== undefined) cleaned[key] = value
  })
  return cleaned
}

export function extractErrorMessage(error) {
  const detail = error?.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail.length > 0) {
    return detail
      .map((d) => {
        const field = Array.isArray(d.loc) ? d.loc.join('.') : d.loc
        return `${field}: ${d.msg}`
      })
      .join('; ')
  }
  return 'Something went wrong. Please try again.'
}