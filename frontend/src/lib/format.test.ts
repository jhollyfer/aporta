import { DateTime } from 'luxon'
import { describe, expect, it } from 'vitest'

import { daysSince, formatCurrency } from '#/lib/format'

describe('daysSince', () => {
  const now = DateTime.fromISO('2026-11-01T12:00:00')

  it('conta dias inteiros', () => {
    expect(daysSince('2026-10-29', now)).toBe(3)
  })

  it('é zero no mesmo dia', () => {
    expect(daysSince('2026-11-01', now)).toBe(0)
  })

  it('nunca devolve negativo para data futura', () => {
    expect(daysSince('2026-11-10', now)).toBe(0)
  })
})

describe('formatCurrency', () => {
  it('formata em reais sem centavos', () => {
    expect(formatCurrency(1400, 'pt-BR').replace(/\s/g, ' ')).toBe('R$ 1.400')
  })
})
