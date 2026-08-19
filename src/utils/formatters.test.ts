import { describe, expect, it } from 'vitest'
import { formatMoney } from './formatters'

describe('formatMoney', () => {
  it('formatea presupuestos en pesos argentinos sin decimales', () => {
    expect(formatMoney(84000000)).toContain('84')
    expect(formatMoney(84000000)).not.toContain(',00')
  })
})
