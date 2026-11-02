import { describe, expect, it } from 'vitest'

import { missingParts, planParts } from './chunking'

const PART = 10 * 1024 * 1024

describe('planParts', () => {
  it('when numbering, it starts from 1, because S3 refuses part zero', () => {
    const plan = planParts(PART * 2, PART)

    expect(plan.map((part) => part.partNumber)).toEqual([1, 2])
  })

  it('when there is a remainder, it counts it as one more part', () => {
    expect(planParts(PART * 2 + 1, PART)).toHaveLength(3)
  })

  it('when slicing, it cuts the last part at the end of the file, and not at the multiple', () => {
    const plan = planParts(PART + 500, PART)

    expect(plan.at(-1)).toEqual({
      partNumber: 2,
      start: PART,
      end: PART + 500,
    })
  })

  it('when slicing, it covers the whole file, with no gap or overlap', () => {
    const size = PART * 3 + 7
    const plan = planParts(size, PART)

    expect(plan[0]?.start).toBe(0)
    expect(plan.at(-1)?.end).toBe(size)

    plan.slice(1).forEach((part, index) => {
      expect(part.start).toBe(plan[index]?.end)
    })
  })

  it('when the file is smaller than one part, it gives a single part', () => {
    expect(planParts(1024, PART)).toEqual([
      { partNumber: 1, start: 0, end: 1024 },
    ])
  })

  it('when the file is empty, it still gives one part: zero bytes is a valid file', () => {
    expect(planParts(0, PART)).toEqual([{ partNumber: 1, start: 0, end: 0 }])
  })
})

describe('missingParts', () => {
  it('when computing what is missing, it returns only what is left, in order', () => {
    const plan = planParts(PART * 4, PART)

    expect(missingParts(plan, [1, 3]).map((part) => part.partNumber)).toEqual([
      2, 4,
    ])
  })

  it('when resuming, it restarts from the first missing one, never from the beginning', () => {
    const plan = planParts(PART * 1500, PART)
    const uploaded = Array.from({ length: 1499 }, (_, index) => index + 1)

    const missing = missingParts(plan, uploaded)

    expect(missing).toHaveLength(1)
    expect(missing[0]?.partNumber).toBe(1500)
  })

  it('when everything has uploaded, nothing is missing', () => {
    const plan = planParts(PART * 2, PART)

    expect(missingParts(plan, [1, 2])).toEqual([])
  })
})
