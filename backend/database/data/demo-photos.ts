import { LISTING_TYPE, PHOTO_ENVIRONMENT } from '@aporta/shared'
import type { ListingType, PhotoEnvironment } from '@aporta/shared'

/**
 * The pictures of the demo catalog, and only of it: the sample ads are fictional, and so are
 * their pictures. A real ad shows only what its owner uploaded (`docs/DECISIONS.md` #28); these
 * never reach a listing outside the demo, because the seeder that reads them only runs with
 * `SEED_DEMO_PASSWORD` set.
 *
 * Picked by hand from Openverse (`api.openverse.org`), all CC0 1.0, so no credit is owed; the
 * author and the page stay here anyway, for whoever wants to trace a picture back. None shows a
 * face, a person or a portrait on a wall: a stranger's face on an ad is a person who never agreed
 * to be there.
 *
 * `sources` are tried in order: the original file first (about 1024 px) and the Openverse
 * thumbnail (600 px) when the original host does not answer.
 */
export type DemoPhoto = {
  /** The Openverse id: the same picture under every source. */
  readonly id: string
  readonly creator: string | null
  readonly page: string
  readonly sources: ReadonlyArray<string>
}

/** A group of interchangeable pictures: the seeder rotates through it, ad by ad. */
export const DEMO_PHOTO_POOL = {
  HOUSE_FACADE: 'HOUSE_FACADE',
  BUILDING_FACADE: 'BUILDING_FACADE',
  BEDROOM: 'BEDROOM',
  HOTEL_ROOM: 'HOTEL_ROOM',
  BATHROOM: 'BATHROOM',
  KITCHEN: 'KITCHEN',
  LIVING: 'LIVING',
} as const

export type DemoPhotoPool =
  (typeof DEMO_PHOTO_POOL)[keyof typeof DEMO_PHOTO_POOL]

/**
 * Which pool fills each environment of each type: an apartment and a kitnet live in a building,
 * a room and a hotel in a house, and the bedroom of a hotel is a hotel room.
 */
export const DEMO_PHOTO_POOL_BY_TYPE = {
  [LISTING_TYPE.HOUSE]: {
    [PHOTO_ENVIRONMENT.FACADE]: DEMO_PHOTO_POOL.HOUSE_FACADE,
    [PHOTO_ENVIRONMENT.BEDROOM]: DEMO_PHOTO_POOL.BEDROOM,
    [PHOTO_ENVIRONMENT.BATHROOM]: DEMO_PHOTO_POOL.BATHROOM,
    [PHOTO_ENVIRONMENT.KITCHEN]: DEMO_PHOTO_POOL.KITCHEN,
    [PHOTO_ENVIRONMENT.LIVING]: DEMO_PHOTO_POOL.LIVING,
  },
  [LISTING_TYPE.APARTMENT]: {
    [PHOTO_ENVIRONMENT.FACADE]: DEMO_PHOTO_POOL.BUILDING_FACADE,
    [PHOTO_ENVIRONMENT.BEDROOM]: DEMO_PHOTO_POOL.BEDROOM,
    [PHOTO_ENVIRONMENT.BATHROOM]: DEMO_PHOTO_POOL.BATHROOM,
    [PHOTO_ENVIRONMENT.KITCHEN]: DEMO_PHOTO_POOL.KITCHEN,
    [PHOTO_ENVIRONMENT.LIVING]: DEMO_PHOTO_POOL.LIVING,
  },
  [LISTING_TYPE.KITNET]: {
    [PHOTO_ENVIRONMENT.FACADE]: DEMO_PHOTO_POOL.BUILDING_FACADE,
    [PHOTO_ENVIRONMENT.BEDROOM]: DEMO_PHOTO_POOL.BEDROOM,
    [PHOTO_ENVIRONMENT.BATHROOM]: DEMO_PHOTO_POOL.BATHROOM,
    [PHOTO_ENVIRONMENT.KITCHEN]: DEMO_PHOTO_POOL.KITCHEN,
    [PHOTO_ENVIRONMENT.LIVING]: DEMO_PHOTO_POOL.LIVING,
  },
  [LISTING_TYPE.ROOM]: {
    [PHOTO_ENVIRONMENT.FACADE]: DEMO_PHOTO_POOL.HOUSE_FACADE,
    [PHOTO_ENVIRONMENT.BEDROOM]: DEMO_PHOTO_POOL.BEDROOM,
    [PHOTO_ENVIRONMENT.BATHROOM]: DEMO_PHOTO_POOL.BATHROOM,
    [PHOTO_ENVIRONMENT.KITCHEN]: DEMO_PHOTO_POOL.KITCHEN,
    [PHOTO_ENVIRONMENT.LIVING]: DEMO_PHOTO_POOL.LIVING,
  },
  [LISTING_TYPE.HOTEL]: {
    [PHOTO_ENVIRONMENT.FACADE]: DEMO_PHOTO_POOL.HOUSE_FACADE,
    [PHOTO_ENVIRONMENT.BEDROOM]: DEMO_PHOTO_POOL.HOTEL_ROOM,
    [PHOTO_ENVIRONMENT.BATHROOM]: DEMO_PHOTO_POOL.BATHROOM,
    [PHOTO_ENVIRONMENT.KITCHEN]: DEMO_PHOTO_POOL.KITCHEN,
    [PHOTO_ENVIRONMENT.LIVING]: DEMO_PHOTO_POOL.LIVING,
  },
} as const satisfies Record<
  ListingType,
  Record<PhotoEnvironment, DemoPhotoPool>
>

export const DEMO_PHOTOS = {
  HOUSE_FACADE: [
    {
      id: 'fcde67dc-a4a1-4eb0-8452-0a1ca849ad48',
      creator: null,
      page: 'https://www.rawpixel.com/image/6069181/free-public-domain-cc0-photo',
      sources: [
        'https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvZnJib3JhX2JvcmFfbGFuZHNjYXBlX2FyY2hpdGVjdHVyZS1pbWFnZS1reWNoeHpieS5qcGc.jpg',
        'https://api.openverse.org/v1/images/fcde67dc-a4a1-4eb0-8452-0a1ca849ad48/thumb/',
      ],
    },
    {
      id: '26e04261-aec2-4d24-bfda-e4b581a5ba60',
      creator: null,
      page: 'https://www.rawpixel.com/image/6058182/free-public-domain-cc0-photo',
      sources: [
        'https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvZnJrb3Jlc2hhbl9zdGF0ZV9wYXJrX3llbGxvdy1pbWFnZS1reWNnaW5oZi5qcGc.jpg',
        'https://api.openverse.org/v1/images/26e04261-aec2-4d24-bfda-e4b581a5ba60/thumb/',
      ],
    },
    {
      id: 'e93e9a5c-e023-49e3-a23a-1774255b08c1',
      creator: null,
      page: 'https://www.rawpixel.com/image/5910486/image-public-domain-trees-tropical',
      sources: [
        'https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9zdGF0aWMvaW1hZ2Uvd2Vic2l0ZS8yMDIyLTA0L2xyL3B4MTU4MjUyMS1pbWFnZS1rd3Z2czZneS5qcGc.jpg',
        'https://api.openverse.org/v1/images/e93e9a5c-e023-49e3-a23a-1774255b08c1/thumb/',
      ],
    },
    {
      id: '411fd707-12b8-498b-ab42-75c8f9c97300',
      creator: null,
      page: 'https://www.rawpixel.com/image/5904284/photo-image-public-domain-home-free',
      sources: [
        'https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9zdGF0aWMvaW1hZ2Uvd2Vic2l0ZS8yMDIyLTA0L2xyL3B4OTAwMDQzLWltYWdlLWt3dnV1NzB1LmpwZw.jpg',
        'https://api.openverse.org/v1/images/411fd707-12b8-498b-ab42-75c8f9c97300/thumb/',
      ],
    },
    {
      id: '77d72470-723c-4be9-b0e3-d61d733c1754',
      creator: 'Binyamin Mellish',
      page: 'https://stocksnap.io/photo/house-home-L9VZ6SOGBB',
      sources: [
        'https://cdn.stocksnap.io/img-thumbs/960w/L9VZ6SOGBB.jpg',
        'https://api.openverse.org/v1/images/77d72470-723c-4be9-b0e3-d61d733c1754/thumb/',
      ],
    },
  ],
  BUILDING_FACADE: [
    {
      id: '09a39eaa-b9a8-4df5-ab22-7e04df0706e0',
      creator: null,
      page: 'https://www.rawpixel.com/image/8812187/apartment-building',
      sources: [
        'https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIzLTAzL2ZyYmlnX2Jyb3RoZXJfaXNfbm90LWltYWdlLmpwZw.jpg',
        'https://api.openverse.org/v1/images/09a39eaa-b9a8-4df5-ab22-7e04df0706e0/thumb/',
      ],
    },
    {
      id: 'a6654abc-96d8-4438-a711-21b13cbce5b7',
      creator: 'Matt Bango',
      page: 'https://stocksnap.io/photo/apartment-building-WTHV6FFUSE',
      sources: [
        'https://cdn.stocksnap.io/img-thumbs/960w/WTHV6FFUSE.jpg',
        'https://api.openverse.org/v1/images/a6654abc-96d8-4438-a711-21b13cbce5b7/thumb/',
      ],
    },
    {
      id: '99ef0260-1680-4960-9d7e-d1555fe950ab',
      creator: 'Matt Bango',
      page: 'https://stocksnap.io/photo/apartment-building-2T9NFO4RNI',
      sources: [
        'https://cdn.stocksnap.io/img-thumbs/960w/2T9NFO4RNI.jpg',
        'https://api.openverse.org/v1/images/99ef0260-1680-4960-9d7e-d1555fe950ab/thumb/',
      ],
    },
  ],
  BEDROOM: [
    {
      id: 'ec36e194-3b62-43da-996e-d06206dd2160',
      creator: 'Burst',
      page: 'https://stocksnap.io/photo/bedroom-clean-OE0F9BHXJQ',
      sources: [
        'https://cdn.stocksnap.io/img-thumbs/960w/OE0F9BHXJQ.jpg',
        'https://api.openverse.org/v1/images/ec36e194-3b62-43da-996e-d06206dd2160/thumb/',
      ],
    },
    {
      id: '33a9db53-a013-48e9-b0ab-03a192d4e923',
      creator: 'Jay Mantri',
      page: 'https://stocksnap.io/photo/bedroom-bed-12B5400E80',
      sources: [
        'https://cdn.stocksnap.io/img-thumbs/960w/12B5400E80.jpg',
        'https://api.openverse.org/v1/images/33a9db53-a013-48e9-b0ab-03a192d4e923/thumb/',
      ],
    },
    {
      id: '002abe42-35a8-4c24-a10b-9e15a2fb9357',
      creator: 'Mary Whitney',
      page: 'https://stocksnap.io/photo/bedroom-bed-XWI13131WH',
      sources: [
        'https://cdn.stocksnap.io/img-thumbs/960w/XWI13131WH.jpg',
        'https://api.openverse.org/v1/images/002abe42-35a8-4c24-a10b-9e15a2fb9357/thumb/',
      ],
    },
    {
      id: 'e2e7025b-d226-4c3a-91d4-3a762a0a6059',
      creator: 'Mary Whitney',
      page: 'https://stocksnap.io/photo/bedroom-bed-9R85GU3I2P',
      sources: [
        'https://cdn.stocksnap.io/img-thumbs/960w/9R85GU3I2P.jpg',
        'https://api.openverse.org/v1/images/e2e7025b-d226-4c3a-91d4-3a762a0a6059/thumb/',
      ],
    },
    {
      id: '9385beb5-69f0-4242-af7b-64445c790265',
      creator: 'Matt Bango',
      page: 'https://stocksnap.io/photo/bed-bedroom-NNZ04PGNFD',
      sources: [
        'https://cdn.stocksnap.io/img-thumbs/960w/NNZ04PGNFD.jpg',
        'https://api.openverse.org/v1/images/9385beb5-69f0-4242-af7b-64445c790265/thumb/',
      ],
    },
    {
      id: '61817c40-ddbc-46aa-96f2-a1b0c4e2d0ee',
      creator: 'Sylwia Pietruszka',
      page: 'https://stocksnap.io/photo/bed-table-FND1JADL6W',
      sources: [
        'https://cdn.stocksnap.io/img-thumbs/960w/FND1JADL6W.jpg',
        'https://api.openverse.org/v1/images/61817c40-ddbc-46aa-96f2-a1b0c4e2d0ee/thumb/',
      ],
    },
  ],
  HOTEL_ROOM: [
    {
      id: '75e6703d-39a0-4611-bbf7-b9a6b81eef46',
      creator: null,
      page: 'https://www.rawpixel.com/image/5922902/photo-image-public-domain-free-bedroom',
      sources: [
        'https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvcHg1OTEyMzgtaW1hZ2Uta3d2eHE1YzcuanBn.jpg',
        'https://api.openverse.org/v1/images/75e6703d-39a0-4611-bbf7-b9a6b81eef46/thumb/',
      ],
    },
    {
      id: '151a73da-2c44-4c37-8b57-365a98620122',
      creator: null,
      page: 'https://www.rawpixel.com/image/5904186/photo-image-public-domain-room-free',
      sources: [
        'https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9zdGF0aWMvaW1hZ2Uvd2Vic2l0ZS8yMDIyLTA0L2xyL3B4OTAzMTM2LWltYWdlLWt3dnV0NDFhLmpwZw.jpg',
        'https://api.openverse.org/v1/images/151a73da-2c44-4c37-8b57-365a98620122/thumb/',
      ],
    },
    {
      id: '6d479ecc-8f1a-4ae4-9cb6-a31a69a3ff15',
      creator: 'World Travel Adventures',
      page: 'https://stocksnap.io/photo/hotel-bed-OJLOIYVJ9B',
      sources: [
        'https://cdn.stocksnap.io/img-thumbs/960w/OJLOIYVJ9B.jpg',
        'https://api.openverse.org/v1/images/6d479ecc-8f1a-4ae4-9cb6-a31a69a3ff15/thumb/',
      ],
    },
    {
      id: '1e233cb7-4edb-40d3-b7f0-3231099a6d46',
      creator: null,
      page: 'https://www.rawpixel.com/image/5969890/hotel-bedroom',
      sources: [
        'https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvaXMxNjk2NS1pbWFnZS1rd3lzZTFmNi5qcGc.jpg',
        'https://api.openverse.org/v1/images/1e233cb7-4edb-40d3-b7f0-3231099a6d46/thumb/',
      ],
    },
    {
      id: 'e01d08dd-4e7b-464b-8746-0d1932919a73',
      creator: null,
      page: 'https://www.rawpixel.com/image/6059575/free-public-domain-cc0-photo',
      sources: [
        'https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvZnJob3RlbF9wb2RqYXZvcm5fYzNfYWRrXzMtaW1hZ2Uta3ljZ29tMG8uanBn.jpg',
        'https://api.openverse.org/v1/images/e01d08dd-4e7b-464b-8746-0d1932919a73/thumb/',
      ],
    },
  ],
  BATHROOM: [
    {
      id: 'ac21e0c1-844b-4a3c-87dc-dbc361fee8bc',
      creator: null,
      page: 'https://www.rawpixel.com/image/6042971/photo-image-public-domain-house-room',
      sources: [
        'https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvZmw0MTI1ODM0NDE1Mi1pbWFnZS1reWJlaWo2Yi5qcGc.jpg',
        'https://api.openverse.org/v1/images/ac21e0c1-844b-4a3c-87dc-dbc361fee8bc/thumb/',
      ],
    },
    {
      id: '4d99ab9a-778b-4e68-8b96-8c5f87c0278d',
      creator: null,
      page: 'https://www.rawpixel.com/image/6077486/dsc09616',
      sources: [
        'https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvZmwzOTQ5MTU1ODA0MC1pbWFnZS1reWNqMzdydy5qcGc.jpg',
        'https://api.openverse.org/v1/images/4d99ab9a-778b-4e68-8b96-8c5f87c0278d/thumb/',
      ],
    },
    {
      id: '588671df-c1d9-49ed-9069-0817dc476453',
      creator: null,
      page: 'https://www.rawpixel.com/image/9676690/modern-house-interior',
      sources: [
        'https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIyLTExL2ZsNDg5MDk2MDAwNjgtaW1hZ2UuanBn.jpg',
        'https://api.openverse.org/v1/images/588671df-c1d9-49ed-9069-0817dc476453/thumb/',
      ],
    },
    {
      id: '6e898936-8a32-45e6-9240-b58bfdffa170',
      creator: null,
      page: 'https://www.rawpixel.com/image/6077484/dsc09337',
      sources: [
        'https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvZmw0MTI1ODM1OTI0Mi1pbWFnZS1reWNqM291dy5qcGc.jpg',
        'https://api.openverse.org/v1/images/6e898936-8a32-45e6-9240-b58bfdffa170/thumb/',
      ],
    },
  ],
  KITCHEN: [
    {
      id: '1fff238c-735c-43cb-aa89-d60ebb34b001',
      creator: 'The Pic Pac',
      page: 'https://stocksnap.io/photo/kitchen-sink-L07UXRLREE',
      sources: [
        'https://cdn.stocksnap.io/img-thumbs/960w/L07UXRLREE.jpg',
        'https://api.openverse.org/v1/images/1fff238c-735c-43cb-aa89-d60ebb34b001/thumb/',
      ],
    },
    {
      id: '2196bf51-fa01-4adc-bfbf-93dba0a1f362',
      creator: null,
      page: 'https://www.rawpixel.com/image/5912749/image-public-domain-kitchen-interior',
      sources: [
        'https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9zdGF0aWMvaW1hZ2Uvd2Vic2l0ZS8yMDIyLTA0L2xyL3B4MTI3NDc2NS1pbWFnZS1rd3Z3NXJ4dy5qcGc.jpg',
        'https://api.openverse.org/v1/images/2196bf51-fa01-4adc-bfbf-93dba0a1f362/thumb/',
      ],
    },
    {
      id: '3c0a0e94-5b99-4ce1-a3d3-ee998af6a22a',
      creator: 'Matt Bango',
      page: 'https://stocksnap.io/photo/farmhouse-kitchen-QSX4WH8BDB',
      sources: [
        'https://cdn.stocksnap.io/img-thumbs/960w/QSX4WH8BDB.jpg',
        'https://api.openverse.org/v1/images/3c0a0e94-5b99-4ce1-a3d3-ee998af6a22a/thumb/',
      ],
    },
  ],
  LIVING: [
    {
      id: '7151a47a-4cc5-4864-8d66-62e08ea2ffbc',
      creator: 'National Park Service',
      page: 'https://www.rawpixel.com/image/8732262/photo-image-public-domain-wood-house',
      sources: [
        'https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIyLTExL2ZsNTE3MzI4MjA4OTUtaW1hZ2UuanBn.jpg',
        'https://api.openverse.org/v1/images/7151a47a-4cc5-4864-8d66-62e08ea2ffbc/thumb/',
      ],
    },
    {
      id: 'ab2997e5-f264-474a-a933-63cf94045cba',
      creator: 'Kristin Hardwick',
      page: 'https://stocksnap.io/photo/interior-design-HIH67XC5G0',
      sources: [
        'https://cdn.stocksnap.io/img-thumbs/960w/HIH67XC5G0.jpg',
        'https://api.openverse.org/v1/images/ab2997e5-f264-474a-a933-63cf94045cba/thumb/',
      ],
    },
    {
      id: '7f3cecda-6e04-4c06-be66-6c50cf50cf9e',
      creator: 'Justin Schüler',
      page: 'https://stocksnap.io/photo/house-interior-NF6P1OX124',
      sources: [
        'https://cdn.stocksnap.io/img-thumbs/960w/NF6P1OX124.jpg',
        'https://api.openverse.org/v1/images/7f3cecda-6e04-4c06-be66-6c50cf50cf9e/thumb/',
      ],
    },
    {
      id: '39f62bc8-ff8a-4564-ab88-626269d0ff40',
      creator: 'Jarosław Ceborski',
      page: 'https://stocksnap.io/photo/interior-living-6SMA09U7Y8',
      sources: [
        'https://cdn.stocksnap.io/img-thumbs/960w/6SMA09U7Y8.jpg',
        'https://api.openverse.org/v1/images/39f62bc8-ff8a-4564-ab88-626269d0ff40/thumb/',
      ],
    },
  ],
} as const satisfies Record<DemoPhotoPool, ReadonlyArray<DemoPhoto>>
