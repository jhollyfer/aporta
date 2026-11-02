import { randomUUID } from 'node:crypto'

import {
  LISTING_STATUS,
  REPORT_REASON,
  REPORT_STATUS,
  type ListingStatus,
} from '@aporta/shared'
import { test } from '@japa/runner'

import StorefrontReportCreateUseCase from './create.use-case.ts'

import ListingMemoryRepository from '#repositories/listing/listing.memory.repository'
import NeighborhoodMemoryRepository from '#repositories/neighborhood/neighborhood.memory.repository'
import ReportMemoryRepository from '#repositories/report/report.memory.repository'
import IdGeneratorFake from '#services/id-generator/id-generator.fake'
import ReporterFingerprintFake from '#services/reporter-fingerprint/reporter-fingerprint.fake'
import { centroIn, listingIn } from '#tests/listing-fixtures'

const ADDRESS = '203.0.113.7'

function fresh(status: ListingStatus = LISTING_STATUS.PUBLISHED) {
  const listings = new ListingMemoryRepository()
  const centro = centroIn(listings, new NeighborhoodMemoryRepository())
  const entity = listingIn(status, { slug: 'casa', neighborhoodId: centro.id })
  listings.put(entity)
  const reports = new ReportMemoryRepository()
  reports.putListing({
    id: entity.id,
    slug: 'casa',
    title: entity.snapshot().title,
  })
  const fingerprint = new ReporterFingerprintFake()
  const useCase = new StorefrontReportCreateUseCase(
    listings,
    reports,
    new IdGeneratorFake(),
    fingerprint,
  )

  return { entity, reports, fingerprint, useCase }
}

test.group('storefront > reports > create (unit)', () => {
  test('when the ad is on the air, the report is stored OPEN with the fingerprint and never the address', async ({
    assert,
  }) => {
    const { entity, reports, fingerprint, useCase } = fresh()

    const result = await useCase.execute({
      slug: 'casa',
      reason: REPORT_REASON.SCAM,
      details: 'Pediu um Pix de sinal antes da visita.',
      address: ADDRESS,
    })

    if (result.isLeft()) return assert.fail('create failed')

    const stored = (await reports.findById(result.value.id))?.snapshot()
    assert.equal(stored?.status, REPORT_STATUS.OPEN)
    assert.equal(stored?.listingId, entity.id)
    assert.equal(stored?.details, 'Pediu um Pix de sinal antes da visita.')
    assert.equal(stored?.reporterHash, fingerprint.of(ADDRESS))
    assert.notInclude(JSON.stringify(stored), ADDRESS)
  })

  test('when the details are missing, the reason alone is a valid report', async ({
    assert,
  }) => {
    const { reports, useCase } = fresh()

    const result = await useCase.execute({
      slug: 'casa',
      reason: REPORT_REASON.NOT_AVAILABLE,
      address: ADDRESS,
    })

    if (result.isLeft()) return assert.fail('create failed')

    assert.isNull((await reports.findById(result.value.id))?.snapshot().details)
  })

  test('when the honeypot is filled, it answers like a success and stores nothing', async ({
    assert,
  }) => {
    const { reports, useCase } = fresh()

    const result = await useCase.execute({
      slug: 'casa',
      reason: REPORT_REASON.SCAM,
      website: 'http://spam.example',
      address: ADDRESS,
    })

    if (result.isLeft()) return assert.fail('create failed')

    assert.match(result.value.id, /^[0-9a-f-]{36}$/)
    assert.isNull(await reports.findById(result.value.id))
    assert.equal(
      (
        await reports.paginate({
          page: 1,
          perPage: 20,
          sort: 'createdAt',
          direction: 'asc',
        })
      ).meta.total,
      0,
    )
  })

  test('when the ad is not on the air or does not exist, it answers the same 404', async ({
    assert,
  }) => {
    for (const status of [
      LISTING_STATUS.DRAFT,
      LISTING_STATUS.PENDING,
      LISTING_STATUS.ARCHIVED,
    ]) {
      const { useCase } = fresh(status)

      const result = await useCase.execute({
        slug: 'casa',
        reason: REPORT_REASON.SCAM,
        address: ADDRESS,
      })

      assert.containsSubset(result.value, {
        status: 404,
        code: 'LISTING_NOT_FOUND',
      })
    }

    const missing = await fresh().useCase.execute({
      slug: randomUUID(),
      reason: REPORT_REASON.SCAM,
      address: ADDRESS,
    })

    assert.containsSubset(missing.value, { status: 404 })
  })

  test('when the repository fails, it answers 500 with the module code', async ({
    assert,
  }) => {
    const { useCase, reports } = fresh()
    reports.save = () => Promise.reject(new Error('database down'))

    const result = await useCase.execute({
      slug: 'casa',
      reason: REPORT_REASON.SCAM,
      address: ADDRESS,
    })

    assert.containsSubset(result.value, {
      status: 500,
      code: 'STOREFRONT_REPORT_CREATE_ERROR',
    })
  })
})
