export const formatCurrency = (amount, currency = 'INR') => {
  const num = Number(amount) || 0
  const symbolMap = {
    INR: '₹',
    USD: '$',
    EUR: '€',
    GBP: '£',
    AED: 'AED '
  }
  const symbol = symbolMap[currency] || (currency + ' ')
  return `${symbol}${num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`
}

export const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

export const formatPercentage = (val) => {
  const num = Number(val) || 0
  return `${num.toFixed(1)}%`
}
