import { randomUUID } from 'node:crypto'

import app from '@adonisjs/core/services/app'
import {
  REPORT_REASON,
  REPORT_STATUS,
  SORT_DIRECTION,
  type ReportReason,
} from '@aporta/shared'
import { test } from '@japa/runner'

import { ListingFactory } from '#database/factories/listing.factory'
import { UserFactory } from '#database/factories/user.factory'
import Report from '#domain/report/report.entity'
import ReportLucidRepository from '#repositories/report/report.lucid.repository'
import ReportMemoryRepository from '#repositories/report/report.memory.repository'
import type ReportRepository from '#repositories/report/report.repository'
import { resetDatabase } from '#tests/database-fixtures'
import { recorded } from '#tests/repository-fixtures'
import { neighborhood } from '#tests/storefront-fixtures'

/**
 * The `ReportRepository` contract test (`_standards/domain.md` §5.4): the same cases on Lucid,
 * against Postgres, and in memory. Each implementation says how to create the ad a report points to
 * and the staff account that resolves it.
 */
type Subject = {
  repository: ReportRepository
  listing(title?: string): Promise<string>
  staff(): Promise<string>
}

const IMPLEMENTATIONS = {
  lucid: async () => ({
    repository: await app.container.make(ReportLucidRepository),
    listing: async (title = 'Kitnet perto do porto') => {
      const row = await neighborhood()
      const listing = await ListingFactory.merge({
        neighborhoodId: row.id,
        title,
      }).create()
      return listing.id
    },
    staff: async () => (await UserFactory.apply('moderator').create()).id,
  }),
  memory: async () => {
    const repository = await app.container.make(ReportMemoryRepository)

    return {
      repository,
      listing: (title = 'Kitnet perto do porto') => {
        const id = randomUUID()
        repository.putListing({ id, slug: `anuncio-${id}`, title })
        return Promise.resolve(id)
      },
      staff: () => Promise.resolve(randomUUID()),
    }
  },
} satisfies Record<string, () => Promise<Subject>>

const PAGE = {
  page: 1,
  perPage: 20,
  sort: 'createdAt',
  direction: SORT_DIRECTION.ASC,
} as const

function reportOn(
  listingId: string,
  reason: ReportReason = REPORT_REASON.SCAM,
  details: string | null = null,
): Report {
  return Report.create({
    id: randomUUID(),
    listingId,
    reason,
    details,
    reporterHash: 'b'.repeat(64),
  })
}

for (const [name, make] of Object.entries(IMPLEMENTATIONS)) {
  test.group(`ReportRepository (${name})`, (group) => {
    group.each.setup(() => resetDatabase())

    test('when saving a new report, it comes back OPEN with the ad it points to', async ({
      assert,
    }) => {
      const { repository, listing } = await make()
      const listingId = await listing('Casa do centro')
      const report = reportOn(
        listingId,
        REPORT_REASON.FAKE_PHOTOS,
        'Foto de outra casa',
      )

      const saved = recorded(await repository.save(report))

      assert.equal(saved.report.snapshot().status, REPORT_STATUS.OPEN)
      assert.equal(saved.report.snapshot().details, 'Foto de outra casa')
      assert.equal(saved.report.snapshot().reporterHash, 'b'.repeat(64))
      assert.equal(saved.listing.id, listingId)
      assert.equal(saved.listing.title, 'Casa do centro')
      assert.instanceOf(saved.createdAt, Date)
      assert.equal((await repository.findById(report.id))?.id, report.id)
      assert.isNull(await repository.findById(randomUUID()))
    })

    test('when asking whether an ad has reports, any report counts, open or resolved', async ({
      assert,
    }) => {
      const { repository, listing, staff } = await make()
      const reported = await listing('Com denúncia')
      const clean = await listing('Sem denúncia')
      const report = reportOn(reported)
      recorded(await repository.save(report))

      assert.isTrue(await repository.existsForListing(reported))
      assert.isFalse(await repository.existsForListing(clean))

      report.resolve(await staff(), 'Conferido pela equipe', new Date())
      recorded(await repository.save(report))

      assert.isTrue(await repository.existsForListing(reported))
    })

    test('when the ad does not exist, save answers a repository failure instead of throwing', async ({
      assert,
    }) => {
      const { repository } = await make()

      const saved = await repository.save(reportOn(randomUUID()))

      assert.containsSubset(saved.value, { code: 'REPOSITORY_FAILURE' })
    })

    test('when resolved and saved, the author, the instant and the note stay', async ({
      assert,
    }) => {
      const { repository, listing, staff } = await make()
      const report = reportOn(await listing())
      await repository.save(report)
      const by = await staff()
      const at = new Date('2026-11-01T12:00:00.000Z')

      recorded(report.resolve(by, 'Falei com o dono.', at))
      const saved = recorded(await repository.save(report))

      assert.containsSubset(saved.report.snapshot(), {
        status: REPORT_STATUS.RESOLVED,
        resolvedBy: by,
        resolutionNote: 'Falei com o dono.',
      })
      assert.equal(saved.report.snapshot().resolvedAt?.getTime(), at.getTime())
    })

    test('when listing, the status and the search narrow it, and the order is the criterion', async ({
      assert,
    }) => {
      const { repository, listing, staff } = await make()
      const porto = await listing('Kitnet perto do porto')
      const orla = await listing('Quarto na orla')
      const first = reportOn(porto, REPORT_REASON.SCAM, 'Pediu sinal por Pix')
      const second = reportOn(orla)
      await repository.save(first)
      await repository.save(second)
      recorded(second.resolve(await staff(), 'Improcedente', new Date()))
      await repository.save(second)

      const open = await repository.paginate({
        ...PAGE,
        status: REPORT_STATUS.OPEN,
      })
      const resolved = await repository.paginate({
        ...PAGE,
        status: REPORT_STATUS.RESOLVED,
      })
      const byDetails = await repository.paginate({ ...PAGE, search: 'pix' })
      const byTitle = await repository.paginate({ ...PAGE, search: 'orla' })
      const all = await repository.paginate(PAGE)

      assert.deepEqual(
        open.data.map((each) => each.report.id),
        [first.id],
      )
      assert.deepEqual(
        resolved.data.map((each) => each.report.id),
        [second.id],
      )
      assert.deepEqual(
        byDetails.data.map((each) => each.report.id),
        [first.id],
      )
      assert.deepEqual(
        byTitle.data.map((each) => each.report.id),
        [second.id],
      )
      assert.equal(all.meta.total, 2)
      assert.deepEqual(
        all.data.map((each) => each.report.id),
        [first.id, second.id],
      )
    })
  })
}
