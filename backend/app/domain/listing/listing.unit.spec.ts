import {
  LISTING_PHOTOS_MAX,
  LISTING_STATUS,
  PHOTO_ENVIRONMENT,
} from '@aporta/shared'
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

  test('when submitted, a DRAFT goes to PENDING and nothing else changes status', ({
    assert,
  }) => {
    const draft = listingDraft()

    assert.equal(draft.submit().snapshot().status, LISTING_STATUS.PENDING)

    // A published ad stays published: submitting is not a way to unpublish, nor to publish.
    const published = listingIn(LISTING_STATUS.PUBLISHED)
    assert.equal(published.submit().snapshot().status, LISTING_STATUS.PUBLISHED)
  })

  test('when asked who owns it, only the account that wrote it is the owner, and an ad with no account has none', ({
    assert,
  }) => {
    const owned = listingDraft({ ownerId: 'account-1' })

    assert.isTrue(owned.isOwnedBy('account-1'))
    assert.isFalse(owned.isOwnedBy('account-2'))
    assert.isFalse(listingDraft({ ownerId: null }).isOwnedBy('account-1'))
    // The trap of comparing two nulls: a missing account must never match a missing owner.
    assert.isFalse(listingDraft({ ownerId: null }).isOwnedBy(''))
  })

  test('when updated, it changes what was sent, keeps the rest and keeps the status', ({
    assert,
  }) => {
    const listing = listingIn(LISTING_STATUS.PUBLISHED)

    const result = listing.update({ title: 'Kitnet nova', priceMonthly: 700 })

    assert.isTrue(result.isRight())
    assert.containsSubset(listing.snapshot(), {
      title: 'Kitnet nova',
      priceMonthly: 700,
      address: LISTING_INPUT.address,
      status: LISTING_STATUS.PUBLISHED,
    })
  })

  test('when an update would leave the ad without a price, a title or a period, it refuses and changes nothing', ({
    assert,
  }) => {
    const listing = listingDraft({ priceMonthly: 900, priceDaily: null })

    assert.deepEqual(listing.update({ priceMonthly: null }).value, {
      code: 'LISTING_PRICE_REQUIRED',
    })
    assert.deepEqual(listing.update({ title: ' ' }).value, {
      code: 'LISTING_TITLE_EMPTY',
    })
    assert.deepEqual(listing.update({ periods: [] }).value, {
      code: 'LISTING_PERIODS_EMPTY',
    })
    assert.equal(listing.snapshot().priceMonthly, 900)
    assert.equal(listing.snapshot().title, LISTING_INPUT.title)
  })

  test('when the contact changes, the verification is cleared; when it stays, it is kept', ({
    assert,
  }) => {
    const verifiedAt = new Date('2026-10-30T12:00:00.000Z')
    const listing = listingDraft({
      owner: { name: 'Seu Raimundo', whatsapp: '5597999990002', verifiedAt },
    })

    listing.update({
      owner: { name: 'Seu Raimundo', whatsapp: '5597999990002' },
    })
    assert.equal(listing.snapshot().owner.verifiedAt, verifiedAt)

    listing.update({
      owner: { name: 'Seu Raimundo', whatsapp: '5597999990099' },
    })
    assert.isNull(listing.snapshot().owner.verifiedAt)
  })

  test('when photos are attached, they go to the end in the order given', ({
    assert,
  }) => {
    const listing = listingDraft()
    const first = {
      id: 'p1',
      environment: PHOTO_ENVIRONMENT.FACADE,
      storageId: 's1',
    }
    const second = {
      id: 'p2',
      environment: PHOTO_ENVIRONMENT.KITCHEN,
      storageId: 's2',
    }

    listing.attachPhotos([first])
    listing.attachPhotos([second])

    assert.deepEqual(listing.snapshot().photos, [first, second])
  })

  test('when a photo is removed, it is handed back and the ones after it move up', ({
    assert,
  }) => {
    const listing = listingDraft()
    const photos = ['p1', 'p2', 'p3'].map((id) => ({
      id,
      environment: PHOTO_ENVIRONMENT.LIVING,
      storageId: `s-${id}`,
    }))
    listing.attachPhotos(photos)

    const removed = listing.removePhoto('p2')

    assert.deepEqual(removed.value, photos[1])
    assert.deepEqual(
      listing.snapshot().photos.map((photo) => photo.id),
      ['p1', 'p3'],
    )
  })

  test('when the photo is not in the gallery, removing refuses with LISTING_PHOTO_NOT_FOUND and keeps it', ({
    assert,
  }) => {
    const listing = listingDraft()
    listing.attachPhotos([
      { id: 'p1', environment: PHOTO_ENVIRONMENT.LIVING, storageId: 's1' },
    ])

    assert.deepEqual(listing.removePhoto('outra').value, {
      code: 'LISTING_PHOTO_NOT_FOUND',
    })
    assert.lengthOf(listing.snapshot().photos, 1)
  })

  test('when the order has exactly the gallery photos, the gallery follows it', ({
    assert,
  }) => {
    const listing = listingDraft()
    listing.attachPhotos(
      ['p1', 'p2', 'p3'].map((id) => ({
        id,
        environment: PHOTO_ENVIRONMENT.LIVING,
        storageId: `s-${id}`,
      })),
    )

    const result = listing.reorderPhotos(['p3', 'p1', 'p2'])

    assert.isTrue(result.isRight())
    assert.deepEqual(
      listing.snapshot().photos.map((photo) => photo.id),
      ['p3', 'p1', 'p2'],
    )
  })

  test('when the order misses, adds or repeats a photo, it refuses with LISTING_PHOTOS_ORDER_INVALID and keeps the gallery', ({
    assert,
  }) => {
    const listing = listingDraft()
    listing.attachPhotos(
      ['p1', 'p2'].map((id) => ({
        id,
        environment: PHOTO_ENVIRONMENT.LIVING,
        storageId: `s-${id}`,
      })),
    )

    for (const ids of [
      ['p1'],
      ['p1', 'p2', 'p3'],
      ['p1', 'p1'],
      ['p1', 'x'],
      [],
    ]) {
      assert.deepEqual(listing.reorderPhotos(ids).value, {
        code: 'LISTING_PHOTOS_ORDER_INVALID',
      })
    }
    assert.deepEqual(
      listing.snapshot().photos.map((photo) => photo.id),
      ['p1', 'p2'],
    )
  })

  test('when the photos would pass the ceiling across calls, it refuses with LISTING_PHOTOS_LIMIT', ({
    assert,
  }) => {
    const listing = listingDraft()
    const photo = (index: number) => ({
      id: `p${index}`,
      environment: PHOTO_ENVIRONMENT.LIVING,
      storageId: `s${index}`,
    })
    const some = (count: number, from: number) =>
      Array.from({ length: count }, (_each, index) => photo(from + index))

    assert.isTrue(
      listing.attachPhotos(some(LISTING_PHOTOS_MAX - 1, 0)).isRight(),
    )
    assert.deepEqual(listing.attachPhotos(some(2, 100)).value, {
      code: 'LISTING_PHOTOS_LIMIT',
    })
    assert.lengthOf(listing.snapshot().photos, LISTING_PHOTOS_MAX - 1)
  })

  test('when the same file is attached twice, in one call or across calls, it refuses with LISTING_PHOTO_DUPLICATED', ({
    assert,
  }) => {
    const listing = listingDraft()
    const photo = (id: string, storageId: string | null) => ({
      id,
      environment: PHOTO_ENVIRONMENT.LIVING,
      storageId,
    })

    assert.deepEqual(
      listing.attachPhotos([photo('p1', 's1'), photo('p2', 's1')]).value,
      { code: 'LISTING_PHOTO_DUPLICATED' },
    )
    assert.isTrue(listing.attachPhotos([photo('p1', 's1')]).isRight())
    assert.deepEqual(listing.attachPhotos([photo('p2', 's1')]).value, {
      code: 'LISTING_PHOTO_DUPLICATED',
    })
    // Slots with no file are not "the same file": any number of them may coexist.
    assert.isTrue(
      listing.attachPhotos([photo('p3', null), photo('p4', null)]).isRight(),
    )
    assert.lengthOf(listing.snapshot().photos, 3)
  })

  test('when archived, it becomes ARCHIVED and goes to the trash in one step, and cannot be archived twice', ({
    assert,
  }) => {
    const at = new Date('2026-11-01T12:00:00.000Z')
    const listing = listingIn(LISTING_STATUS.PUBLISHED)

    assert.isTrue(listing.archive(at).isRight())
    assert.equal(listing.snapshot().status, LISTING_STATUS.ARCHIVED)
    assert.equal(listing.snapshot().deletedAt, at)
    assert.isFalse(listing.isPublished())
    assert.deepEqual(listing.archive(at).value, {
      code: 'LISTING_ALREADY_ARCHIVED',
    })
  })

  test('when asked if it can be erased, only the archived ad answers yes', ({
    assert,
  }) => {
    for (const status of [
      LISTING_STATUS.DRAFT,
      LISTING_STATUS.PENDING,
      LISTING_STATUS.PUBLISHED,
    ]) {
      assert.deepEqual(listingIn(status).ensureErasable().value, {
        code: 'LISTING_NOT_ARCHIVED',
      })
    }

    const listing = listingIn(LISTING_STATUS.PUBLISHED)
    listing.archive(new Date('2026-11-01T12:00:00.000Z'))

    assert.isTrue(listing.ensureErasable().isRight())
  })

  test('when approved from the queue, it is PUBLISHED with the instant and the author, and the storefront sees it', ({
    assert,
  }) => {
    const at = new Date('2026-11-01T12:00:00.000Z')
    const listing = listingIn(LISTING_STATUS.PENDING)

    assert.isTrue(listing.approve('staff-1', at).isRight())

    const snapshot = listing.snapshot()
    assert.equal(snapshot.status, LISTING_STATUS.PUBLISHED)
    assert.equal(snapshot.publishedAt, at)
    assert.deepEqual(snapshot.review, { note: null, at, by: 'staff-1' })
    assert.isTrue(listing.isPublished())
  })

  test('when refused from the queue, it goes back to DRAFT with the reason trimmed', ({
    assert,
  }) => {
    const at = new Date('2026-11-01T12:00:00.000Z')
    const listing = listingIn(LISTING_STATUS.PENDING)

    const result = listing.refuse(
      '  Faltam fotos do banheiro.  ',
      'staff-1',
      at,
    )

    assert.isTrue(result.isRight())
    assert.equal(listing.snapshot().status, LISTING_STATUS.DRAFT)
    assert.isNull(listing.snapshot().publishedAt)
    assert.deepEqual(listing.snapshot().review, {
      note: 'Faltam fotos do banheiro.',
      at,
      by: 'staff-1',
    })
  })

  test('when the reason is too short, blank or past 500 characters, the refusal is refused and nothing changes', ({
    assert,
  }) => {
    const at = new Date('2026-11-01T12:00:00.000Z')

    for (const note of ['', '  ab  ', 'x'.repeat(501)]) {
      const listing = listingIn(LISTING_STATUS.PENDING)

      assert.deepEqual(listing.refuse(note, 'staff-1', at).value, {
        code: 'LISTING_REVIEW_NOTE_INVALID',
      })
      assert.equal(listing.snapshot().status, LISTING_STATUS.PENDING)
      assert.isNull(listing.snapshot().review)
    }
  })

  test('when the ad is not in the queue, neither approving nor refusing works', ({
    assert,
  }) => {
    const at = new Date('2026-11-01T12:00:00.000Z')

    for (const status of [
      LISTING_STATUS.DRAFT,
      LISTING_STATUS.PUBLISHED,
      LISTING_STATUS.ARCHIVED,
    ]) {
      const listing = listingIn(status)

      assert.deepEqual(listing.approve('staff-1', at).value, {
        code: 'LISTING_NOT_PENDING',
      })
      assert.deepEqual(listing.refuse('Motivo claro', 'staff-1', at).value, {
        code: 'LISTING_NOT_PENDING',
      })
      assert.equal(listing.snapshot().status, status)
    }
  })

  test('when a refused ad is submitted again, it is PENDING and the old reason is gone', ({
    assert,
  }) => {
    const at = new Date('2026-11-01T12:00:00.000Z')
    const listing = listingIn(LISTING_STATUS.PENDING)
    listing.refuse('Faltam fotos.', 'staff-1', at)

    listing.submit()

    assert.equal(listing.snapshot().status, LISTING_STATUS.PENDING)
    assert.isNull(listing.snapshot().review)
  })
})
