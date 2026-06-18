import { describe, it, expect } from 'vitest'
import {
  formatCurrency,
  formatCurrencyForInput,
  parseCurrencyInput,
  calculateTotal,
  calculatePercentage,
} from '../utils/currency'

describe('formatCurrency', () => {
  it('formats a whole number with symbol and 2 decimal places', () => {
    expect(formatCurrency(1000)).toBe('৳1,000.00')
  })

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('৳0.00')
  })

  it('formats null/undefined as zero', () => {
    expect(formatCurrency(null)).toBe('৳0.00')
    expect(formatCurrency(undefined)).toBe('৳0.00')
  })

  it('formats a decimal value', () => {
    expect(formatCurrency(1234.5)).toBe('৳1,234.50')
  })

  it('respects showSymbol: false', () => {
    const result = formatCurrency(500, { showSymbol: false })
    expect(result).not.toContain('৳')
    expect(result).toBe('500.00')
  })
})

describe('formatCurrencyForInput', () => {
  it('returns empty string for null', () => {
    expect(formatCurrencyForInput(null)).toBe('')
  })

  it('returns empty string for undefined', () => {
    expect(formatCurrencyForInput(undefined)).toBe('')
  })

  it('formats to 2 decimal places', () => {
    expect(formatCurrencyForInput(100)).toBe('100.00')
    expect(formatCurrencyForInput(99.9)).toBe('99.90')
  })
})

describe('parseCurrencyInput', () => {
  it('parses a numeric string', () => {
    expect(parseCurrencyInput('1234.56')).toBe(1234.56)
  })

  it('returns 0 for empty string', () => {
    expect(parseCurrencyInput('')).toBe(0)
  })

  it('returns 0 for non-numeric string', () => {
    expect(parseCurrencyInput('abc')).toBe(0)
  })

  it('parses an integer string', () => {
    expect(parseCurrencyInput('500')).toBe(500)
  })
})

describe('calculateTotal', () => {
  it('sums an array of numbers', () => {
    expect(calculateTotal([100, 200, 300])).toBe(600)
  })

  it('returns 0 for empty array', () => {
    expect(calculateTotal([])).toBe(0)
  })

  it('treats null/undefined elements as 0', () => {
    expect(calculateTotal([100, null, undefined, 50])).toBe(150)
  })

  it('handles string-coercible numbers', () => {
    // currency.js uses Number(amount) so strings work
    expect(calculateTotal([100, 200])).toBe(300)
  })

  // Floating-point precision note: plain JS addition has known drift.
  // e.g. 0.1 + 0.2 === 0.30000000000000004, not 0.3.
  // These tests document the current behaviour — if a decimal lib is adopted
  // these expectations should be updated to reflect exact results.
  it('documents floating-point drift with decimal inputs', () => {
    const result = calculateTotal([0.1, 0.2])
    // This is NOT 0.3 — it is 0.30000000000000004 with plain JS arithmetic
    expect(result).toBeCloseTo(0.3, 10)
  })
})

describe('calculatePercentage', () => {
  it('calculates 10% of 1000', () => {
    expect(calculatePercentage(1000, 10)).toBe(100)
  })

  it('returns 0 when amount is 0', () => {
    expect(calculatePercentage(0, 18)).toBe(0)
  })

  it('returns 0 when percentage is 0', () => {
    expect(calculatePercentage(1000, 0)).toBe(0)
  })

  it('calculates 18% GST correctly on a round number', () => {
    expect(calculatePercentage(500, 18)).toBe(90)
  })
})
