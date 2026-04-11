import { calculateReturnPct, formatReturnPct } from '@/lib/stock'

describe('calculateReturnPct', () => {
  it('calculates a positive return correctly', () => {
    expect(calculateReturnPct(10000, 11000)).toBeCloseTo(10)
  })

  it('calculates a negative return correctly', () => {
    expect(calculateReturnPct(10000, 8000)).toBeCloseTo(-20)
  })

  it('returns 0 when current price equals purchase price', () => {
    expect(calculateReturnPct(5000, 5000)).toBe(0)
  })

  it('handles fractional prices', () => {
    expect(calculateReturnPct(1000, 1333.33)).toBeCloseTo(33.333, 2)
  })

  it('throws when purchase price is zero', () => {
    expect(() => calculateReturnPct(0, 5000)).toThrow('positive')
  })

  it('throws when purchase price is negative', () => {
    expect(() => calculateReturnPct(-100, 5000)).toThrow('positive')
  })

  it('allows current price of zero (full loss)', () => {
    expect(calculateReturnPct(10000, 0)).toBeCloseTo(-100)
  })
})

describe('formatReturnPct', () => {
  it('prefixes positive values with +', () => {
    expect(formatReturnPct(12.5)).toBe('+12.50%')
  })

  it('does not double-prefix negative values', () => {
    expect(formatReturnPct(-5.75)).toBe('-5.75%')
  })

  it('shows no + for exactly 0', () => {
    expect(formatReturnPct(0)).toBe('0.00%')
  })

  it('respects custom decimal places', () => {
    expect(formatReturnPct(33.333, 1)).toBe('+33.3%')
  })
})
