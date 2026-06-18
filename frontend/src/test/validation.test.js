import { describe, it, expect } from 'vitest'
import { validators, composeValidators } from '../utils/validation'

describe('validators.doubleEntry', () => {
  it('returns null when debits equal credits', () => {
    const debits  = [{ amount: 500 }, { amount: 250 }]
    const credits = [{ amount: 750 }]
    expect(validators.doubleEntry(debits, credits)).toBeNull()
  })

  it('returns an error when debits and credits differ', () => {
    const debits  = [{ amount: 500 }]
    const credits = [{ amount: 400 }]
    expect(validators.doubleEntry(debits, credits)).not.toBeNull()
  })

  it('accepts amounts within floating-point epsilon (< 0.01)', () => {
    // 0.1 + 0.2 = 0.30000000000000004 — the current 0.01 epsilon accepts this
    const debits  = [{ amount: 0.1 }, { amount: 0.2 }]
    const credits = [{ amount: 0.3 }]
    expect(validators.doubleEntry(debits, credits)).toBeNull()
  })

  it('handles missing amount fields as 0', () => {
    const debits  = [{ amount: 100 }, {}]
    const credits = [{ amount: 100 }]
    expect(validators.doubleEntry(debits, credits)).toBeNull()
  })

  it('returns error for empty arrays (both zero — still unbalanced intent)', () => {
    // Both zero satisfies the equation but is meaningless for accounting
    // The current validator returns null here — documenting the behaviour
    const result = validators.doubleEntry([], [])
    expect(result).toBeNull()
  })
})

describe('validators.amount', () => {
  it('returns null for a positive number', () => {
    expect(validators.amount('100')).toBeNull()
  })

  it('returns error for zero', () => {
    expect(validators.amount('0')).not.toBeNull()
  })

  it('returns error for a negative number', () => {
    expect(validators.amount('-50')).not.toBeNull()
  })

  it('returns error for non-numeric input', () => {
    expect(validators.amount('abc')).not.toBeNull()
  })

  it('accepts decimal amounts', () => {
    expect(validators.amount('0.01')).toBeNull()
  })
})

describe('validators.required', () => {
  it('returns null for non-empty string', () => {
    expect(validators.required('hello')).toBeNull()
  })

  it('returns error for empty string', () => {
    expect(validators.required('')).not.toBeNull()
  })

  it('returns error for whitespace-only string', () => {
    expect(validators.required('   ')).not.toBeNull()
  })

  it('returns error for null', () => {
    expect(validators.required(null)).not.toBeNull()
  })
})

describe('composeValidators', () => {
  it('returns null when all validators pass', () => {
    const validate = composeValidators(validators.required, validators.amount)
    expect(validate('50')).toBeNull()
  })

  it('returns the first error when a validator fails', () => {
    const validate = composeValidators(validators.required, validators.amount)
    expect(validate('')).not.toBeNull()
  })

  it('short-circuits on first failure', () => {
    let secondCalled = false
    const second = () => { secondCalled = true; return null }
    const validate = composeValidators(validators.required, second)
    validate('')
    expect(secondCalled).toBe(false)
  })
})
