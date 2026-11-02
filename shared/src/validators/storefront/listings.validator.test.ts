import { describe, expect, it } from 'vitest'

import {
  StorefrontListingPaginateValidator,
  StorefrontListingPinsValidator,
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

describe('the map window (minLng, minLat, maxLng, maxLat)', () => {
  const WINDOW = { minLng: -70.1, minLat: -4.4, maxLng: -69.9, maxLat: -4.3 }

  it('when the four bounds come together, the catalog and the pins accept them', () => {
    expect(StorefrontListingPaginateValidator.safeParse(WINDOW).success).toBe(
      true,
    )
    expect(StorefrontListingPinsValidator.safeParse(WINDOW).success).toBe(true)
  })

  it('when only some bounds come, it refuses it pointing at minLng', () => {
    const result = StorefrontListingPaginateValidator.safeParse({
      minLat: -4.4,
      maxLat: -4.3,
    })
    const pins = StorefrontListingPinsValidator.safeParse({ maxLng: -69.9 })

    expect(ValidationFixture.fields(result)).toEqual(['minLng'])
    expect(ValidationFixture.fields(pins)).toEqual(['minLng'])
  })

  it('when a bound is outside the globe, it refuses it pointing at the field', () => {
    const result = StorefrontListingPinsValidator.safeParse({
      ...WINDOW,
      minLat: -91,
      maxLng: 181,
    })

    expect(ValidationFixture.fields(result)).toEqual(['maxLng', 'minLat'])
  })

  it('when the bounds are blank, they count as missing', () => {
    const result = StorefrontListingPaginateValidator.safeParse({
      minLng: '',
      minLat: '',
      maxLng: '',
      maxLat: '',
    })

    expect(result.success).toBe(true)
  })

  it('when pins are asked with page, perPage or sort, those keys are not part of the contract', () => {
    const parsed = StorefrontListingPinsValidator.parse({
      page: 2,
      sort: 'price',
    })

    expect(parsed).not.toHaveProperty('page')
    expect(parsed).not.toHaveProperty('sort')
  })
})
