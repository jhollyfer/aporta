import { describe, expect, it } from 'vitest'

import { StorefrontNeighborhoodPaginateValidator } from './neighborhoods.validator.js'
import { StorefrontPlacePaginateValidator } from './places.validator.js'
import { ValidationFixture } from '../../validation-fixtures.js'

describe('StorefrontPlacePaginateValidator', () => {
  it('when the category is one of the guide tabs, it accepts it; otherwise it refuses it', () => {
    const accepted = StorefrontPlacePaginateValidator.safeParse({
      category: 'EVENT',
    })
    const rejected = StorefrontPlacePaginateValidator.safeParse({
      category: 'PARTY',
    })

    expect(accepted.success).toBe(true)
    expect(ValidationFixture.fields(rejected)).toEqual(['category'])
  })

  it('when sorting by a column outside the closed list, it refuses it', () => {
    const result = StorefrontPlacePaginateValidator.safeParse({
      sort: 'whatsapp',
    })

    expect(ValidationFixture.fields(result)).toEqual(['sort'])
  })
})

describe('StorefrontNeighborhoodPaginateValidator', () => {
  it('when sorting by name, it accepts it; by another column, it refuses it', () => {
    expect(
      StorefrontNeighborhoodPaginateValidator.safeParse({ sort: 'name' })
        .success,
    ).toBe(true)
    expect(
      ValidationFixture.fields(
        StorefrontNeighborhoodPaginateValidator.safeParse({ sort: 'lat' }),
      ),
    ).toEqual(['sort'])
  })
})
