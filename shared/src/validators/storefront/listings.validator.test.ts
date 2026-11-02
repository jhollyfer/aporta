import { describe, expect, it } from 'vitest'

import {
  StorefrontListingPaginateValidator,
  StorefrontListingShowValidator,
} from './listings.validator.js'
import { ValidationFixture } from '../../validation-fixtures.js'

describe('StorefrontListingPaginateValidator', () => {
  it('when filtering by type, period, neighborhood and price range, it accepts it', () => {
    const result = StorefrontListingPaginateValidator.safeParse({
      type: 'KITNET',
      period: 'SEMESTER',
      neighborhood: 'centro',
      minPrice: 600,
      maxPrice: 900,
      sort: 'price',
      direction: 'asc',
    })

    expect(result.success).toBe(true)
  })

  it('when the type, the period or the sort column is outside the closed list, it refuses it', () => {
    const result = StorefrontListingPaginateValidator.safeParse({
      type: 'CASTLE',
      period: 'FORTNIGHT',
      sort: 'ownerWhatsapp',
    })

    expect(ValidationFixture.fields(result)).toEqual(['period', 'sort', 'type'])
  })

  it('when the price is negative, fractional or above the ceiling, it refuses it', () => {
    const result = StorefrontListingPaginateValidator.safeParse({
      minPrice: -1,
      maxPrice: 100_001,
    })
    const fractional = StorefrontListingPaginateValidator.safeParse({
      minPrice: 10.5,
    })

    expect(ValidationFixture.fields(result)).toEqual(['maxPrice', 'minPrice'])
    expect(ValidationFixture.fields(fractional)).toEqual(['minPrice'])
  })

  it('when the neighborhood is longer than the ceiling, it refuses it', () => {
    const result = StorefrontListingPaginateValidator.safeParse({
      neighborhood: 'x'.repeat(61),
    })

    expect(ValidationFixture.fields(result)).toEqual(['neighborhood'])
  })
})

describe('StorefrontListingShowValidator', () => {
  it('when the slug is present, it accepts it; empty or too long, it refuses it', () => {
    expect(
      StorefrontListingShowValidator.safeParse({ slug: 'kitnet-centro-porto' })
        .success,
    ).toBe(true)
    expect(
      ValidationFixture.fields(
        StorefrontListingShowValidator.safeParse({ slug: '' }),
      ),
    ).toEqual(['slug'])
    expect(
      ValidationFixture.fields(
        StorefrontListingShowValidator.safeParse({ slug: 'a'.repeat(101) }),
      ),
    ).toEqual(['slug'])
  })
})
