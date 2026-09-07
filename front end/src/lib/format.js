const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

const preciseCurrencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const threeDecimalCurrencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
})

export function formatCurrency(value) {
  return currencyFormatter.format(value ?? 0)
}

export function formatCurrencyPrecise(value) {
  return preciseCurrencyFormatter.format(value ?? 0)
}

export function formatCurrency3(value) {
  return threeDecimalCurrencyFormatter.format(value ?? 0)
}

export function formatNumber(value) {
  return new Intl.NumberFormat('en-IN').format(value ?? 0)
}

export function today() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function formatDDMMYYYY(isoDate) {
  const [year, month, day] = isoDate.split('-')
  return `${day}-${month}-${year}`
}

// e.g. qty=25, qtyPerBox=20 -> "1 box 5 pieces"; qty=20 -> "1 box"; qty=5 -> "5 pieces"
export function formatBoxBreakdown(quantity, qtyPerBox) {
  if (!qtyPerBox || qtyPerBox <= 1) return null
  const boxes = Math.floor(quantity / qtyPerBox)
  const pieces = quantity % qtyPerBox
  const boxPart = boxes > 0 ? `${boxes} box${boxes !== 1 ? 'es' : ''}` : ''
  const piecePart = pieces > 0 ? `${pieces} piece${pieces !== 1 ? 's' : ''}` : ''
  return [boxPart, piecePart].filter(Boolean).join(' ') || null
}
