export function buildParams(params = {}) {
  const cleaned = {}
  Object.entries(params).forEach(([key, value]) => {
    if (value !== '' && value !== null && value !== undefined) cleaned[key] = value
  })
  return cleaned
}

export function extractErrorMessage(error) {
  return error?.response?.data?.detail || 'Something went wrong. Please try again.'
}