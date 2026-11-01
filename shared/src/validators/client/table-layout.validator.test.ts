import { describe, expect, it } from 'vitest'

import { ClientTableLayoutValidator } from './table-layout.validator.js'

function parse(raw: unknown) {
  return ClientTableLayoutValidator.safeParse(raw)
}

describe('ClientTableLayoutValidator', () => {
  it('when given what is not an object, it rejects it', () => {
    expect(parse('lixo').success).toBe(false)
    expect(parse(null).success).toBe(false)
    expect(parse([]).success).toBe(false)
  })

  it('when given an empty layout, it accepts it and does not invent a key', () => {
    const result = parse({})

    expect(result.success).toBe(true)
    expect(result.data).toEqual({})
    expect(JSON.stringify(result.data)).toBe('{}')
  })

  it('when pinning, it does not leave an invisible anchor', () => {
    const result = parse({
      columnVisibility: { title: false, _actions: false, _select: false },
    })

    expect(result.data?.columnVisibility).toEqual({ title: false })
  })

  it('when visibility is not a boolean, it discards it, entry by entry', () => {
    const result = parse({ columnVisibility: { title: false, slug: 'sim' } })

    expect(result.data?.columnVisibility).toEqual({ title: false })
  })

  it('when the width is outside the plausible range, it discards it, column by column', () => {
    const result = parse({
      columnSizing: { title: 200, slug: 5, resume: 9000, date: 'x' },
    })

    expect(result.data?.columnSizing).toEqual({ title: 200 })
  })

  it('when the order is not a list of text, it discards it without losing the rest', () => {
    const result = parse({ columnOrder: ['a', 1], columnSizing: { a: 100 } })

    expect(result.data?.columnOrder).toBeUndefined()
    expect(result.data?.columnSizing).toEqual({ a: 100 })
  })

  it('when pinning, it only accepts both lists of text', () => {
    expect(
      parse({ columnPinning: { start: ['_select'], end: [] } }).data
        ?.columnPinning,
    ).toEqual({ start: ['_select'], end: [] })
    expect(
      parse({ columnPinning: { start: [1] } }).data?.columnPinning,
    ).toBeUndefined()
  })
})
