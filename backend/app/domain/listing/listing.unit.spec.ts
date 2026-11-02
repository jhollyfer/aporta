import { LISTING_STATUS } from '@aporta/shared'
import { test } from '@japa/runner'

import Listing from '#domain/listing/listing.entity'
import { LISTING_INPUT, listingDraft, listingIn } from '#tests/listing-fixtures'

function create(input: Partial<Parameters<typeof Listing.create>[0]>) {
  return Listing.create({ id: 'a', slug: 'a', ...LISTING_INPUT, ...input })
}

test.group('domain > listing', () => {
  test('when created, it is born DRAFT, live and without photos', ({
    assert,
  }) => {
    const snapshot = listingDraft().snapshot()

    assert.equal(snapshot.status, LISTING_STATUS.DRAFT)
    assert.isNull(snapshot.deletedAt)
    assert.deepEqual(snapshot.photos, [])
  })

  test('when only the daily price is quoted (a hotel), it is accepted', ({
    assert,
  }) => {
    const result = create({ priceMonthly: null, priceDaily: 120 })

    assert.isTrue(result.isRight())
  })

  test('when there is neither a monthly nor a daily price, it refuses with LISTING_PRICE_REQUIRED', ({
    assert,
  }) => {
    const result = create({ priceMonthly: null, priceDaily: null })

    assert.deepEqual(result.value, { code: 'LISTING_PRICE_REQUIRED' })
  })

  test('when a price is zero, negative or has cents, it refuses with LISTING_PRICE_INVALID', ({
    assert,
  }) => {
    for (const input of [
      { priceMonthly: 0 },
      { priceMonthly: -10 },
      { priceMonthly: 99.5 },
      { priceMonthly: 900, priceDaily: 0 },
    ]) {
      assert.deepEqual(create(input).value, { code: 'LISTING_PRICE_INVALID' })
    }
  })

  test('when the title is blank or there is no period, it refuses', ({
    assert,
  }) => {
    assert.deepEqual(create({ title: '  ' }).value, {
      code: 'LISTING_TITLE_EMPTY',
    })
    assert.deepEqual(create({ periods: [] }).value, {
      code: 'LISTING_PERIODS_EMPTY',
    })
  })

  test('when read on a monthly scale, it is the monthly price or the daily one times thirty', ({
    assert,
  }) => {
    const monthly = listingDraft({ priceMonthly: 900, priceDaily: 100 })
    const hotel = listingDraft({ priceMonthly: null, priceDaily: 120 })

    assert.equal(monthly.monthlyEquivalent(), 900)
    assert.equal(hotel.monthlyEquivalent(), 3600)
    assert.equal(Listing.DAYS_PER_MONTH, 30)
  })

  test('when asked if it is published, only PUBLISHED outside the trash says yes', ({
    assert,
  }) => {
    const trashed = new Date('2026-01-15T12:00:00.000Z')

    assert.isTrue(listingIn(LISTING_STATUS.PUBLISHED).isPublished())
    assert.isFalse(listingIn(LISTING_STATUS.DRAFT).isPublished())
    assert.isFalse(listingIn(LISTING_STATUS.PENDING).isPublished())
    assert.isFalse(listingIn(LISTING_STATUS.ARCHIVED).isPublished())
    assert.isFalse(
      listingIn(LISTING_STATUS.PUBLISHED, {}, trashed).isPublished(),
    )
  })
})
