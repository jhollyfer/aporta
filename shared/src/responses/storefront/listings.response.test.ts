import { describe, expect, it } from 'vitest'

import { StorefrontListingShowResponse } from './listings.response.js'

const LISTING = {
  id: '00000000-0000-4000-8000-000000000001',
  slug: 'kitnet-centro-porto',
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
      url: null,
    },
  ],
  owner: {
    name: 'Seu Raimundo',
    verified: true,
    whatsapp: '5597999990002',
    updatedAt: '2026-10-30',
  },
  lat: -4.3779,
  lng: -70.0309,
  createdAt: '2026-10-01T12:00:00.000Z',
  updatedAt: '2026-10-30T12:00:00.000Z',
}

describe('StorefrontListingShowResponse', () => {
  it('when the listing has the public shape, it accepts it', () => {
    expect(StorefrontListingShowResponse.safeParse(LISTING).success).toBe(true)
  })

  it('when the body carries a panel field, it drops it instead of exposing it', () => {
    const parsed = StorefrontListingShowResponse.parse({
      ...LISTING,
      status: 'PUBLISHED',
      deletedAt: null,
    })

    expect(parsed).not.toHaveProperty('status')
    expect(parsed).not.toHaveProperty('deletedAt')
  })

  it('when the availability is not a calendar day, it refuses it', () => {
    const result = StorefrontListingShowResponse.safeParse({
      ...LISTING,
      availableFrom: '15/01/2027',
    })

    expect(result.success).toBe(false)
  })
})
