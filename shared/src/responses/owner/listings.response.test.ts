import { describe, expect, it } from 'vitest'

import { OwnerListingShowResponse } from './listings.response.js'

const LISTING = {
  id: '00000000-0000-4000-8000-000000000001',
  slug: 'kitnet-centro-porto',
  status: 'PENDING',
  review: null,
  type: 'KITNET',
  title: 'Kitnet mobiliada perto do porto',
  description: 'Kitnet com cama, geladeira e fogão.',
  neighborhood: { slug: 'centro', name: 'Centro' },
  address: 'Travessa a duas quadras do porto',
  price: { monthly: 900, daily: null },
  costs: { water: true, electricity: true, internet: true },
  periods: ['SEMESTER', 'MONTHLY'],
  minimumStayMonths: 4,
  availableFrom: '2027-01-15',
  bedrooms: 1,
  bathrooms: 1,
  furnished: true,
  rules: ['Uma pessoa ou casal'],
  photos: [
    {
      id: '00000000-0000-4000-8000-000000000002',
      environment: 'FACADE',
      storageId: '00000000-0000-4000-8000-000000000003',
      url: 'https://bucket.example/foto.png',
    },
  ],
  owner: {
    name: 'Seu Raimundo',
    verified: false,
    whatsapp: '5597999990002',
    updatedAt: '2026-10-30',
  },
  lat: -4.3779,
  lng: -70.0309,
  createdAt: '2026-10-01T12:00:00.000Z',
  updatedAt: '2026-10-30T12:00:00.000Z',
}

describe('OwnerListingShowResponse', () => {
  it('when the ad has the owner shape, it accepts it, status and storage key included', () => {
    expect(OwnerListingShowResponse.safeParse(LISTING).success).toBe(true)
  })

  it('when a photo has no file yet, it accepts the null key and the null url', () => {
    const result = OwnerListingShowResponse.safeParse({
      ...LISTING,
      photos: [{ ...LISTING.photos[0], storageId: null, url: null }],
    })

    expect(result.success).toBe(true)
  })

  it('when the body carries the account or the trash, it drops them instead of exposing them', () => {
    const parsed = OwnerListingShowResponse.parse({
      ...LISTING,
      ownerId: '00000000-0000-4000-8000-000000000009',
      deletedAt: null,
    })

    expect(parsed).not.toHaveProperty('ownerId')
    expect(parsed).not.toHaveProperty('deletedAt')
  })

  it('when the status is outside the lifecycle, it refuses it', () => {
    expect(
      OwnerListingShowResponse.safeParse({ ...LISTING, status: 'SOLD' })
        .success,
    ).toBe(false)
  })
})

describe('OwnerListingShowResponse review', () => {
  it('when the staff sent the ad back, it carries the reason and the instant', () => {
    const result = OwnerListingShowResponse.safeParse({
      ...LISTING,
      status: 'DRAFT',
      review: {
        note: 'Faltam fotos do banheiro e da cozinha.',
        reviewedAt: '2026-10-31T12:00:00.000Z',
      },
    })

    expect(result.success).toBe(true)
  })

  it('when the review field is missing, it refuses: null is the way to say never reviewed', () => {
    const withoutReview = Object.fromEntries(
      Object.entries(LISTING).filter(([key]) => key !== 'review'),
    )

    expect(OwnerListingShowResponse.safeParse(withoutReview).success).toBe(
      false,
    )
  })
})
