import { randomUUID } from 'node:crypto'

import { REPORT_STATUS } from '@aporta/shared'
import { test } from '@japa/runner'

import AdministratorReportResolveUseCase from './resolve.use-case.ts'

import ReportMemoryRepository from '#repositories/report/report.memory.repository'
import ClockFake from '#services/clock/clock.fake'
import { reportDraft } from '#tests/report-fixtures'
import { actorDraft } from '#tests/user-fixtures'

function fresh() {
  const reports = new ReportMemoryRepository()
  const listingId = randomUUID()
  reports.putListing({ id: listingId, slug: 'casa', title: 'Casa do centro' })
  const report = reportDraft({ listingId })
  reports.put(report)

  return {
    reports,
    report,
    useCase: new AdministratorReportResolveUseCase(reports, new ClockFake()),
  }
}

test.group('administrator > reports > resolve (unit)', () => {
  test('when resolved, it records the actor, the clock instant and the note', async ({
    assert,
  }) => {
    const { report, useCase } = fresh()
    const actor = actorDraft()

    const result = await useCase.execute({
      id: report.id,
      note: 'Falei com o dono, é verdadeiro.',
      actor,
    })

    if (result.isLeft()) return assert.fail('resolve failed')

    assert.equal(result.value.status, REPORT_STATUS.RESOLVED)
    assert.equal(result.value.resolvedBy, actor.id)
    assert.equal(result.value.resolutionNote, 'Falei com o dono, é verdadeiro.')
    assert.equal(result.value.resolvedAt, '2026-01-15T12:00:00.000+00:00')
  })

  test('when resolved twice, the second answers 409 and the first note stays', async ({
    assert,
  }) => {
    const { reports, report, useCase } = fresh()
    await useCase.execute({
      id: report.id,
      note: 'Primeira nota',
      actor: actorDraft(),
    })

    const again = await useCase.execute({
      id: report.id,
      note: 'Segunda nota',
      actor: actorDraft(),
    })

    assert.containsSubset(again.value, {
      status: 409,
      code: 'REPORT_ALREADY_RESOLVED',
    })
    assert.equal(
      (await reports.findById(report.id))?.snapshot().resolutionNote,
      'Primeira nota',
    )
  })

  test('when the note is outside 3 to 500 characters, it answers 422 on the note and the report stays OPEN', async ({
    assert,
  }) => {
    const { reports, report, useCase } = fresh()

    const result = await useCase.execute({
      id: report.id,
      note: 'ok',
      actor: actorDraft(),
    })

    assert.containsSubset(result.value, {
      status: 422,
      code: 'REPORT_NOTE_INVALID',
    })
    assert.equal(
      (await reports.findById(report.id))?.snapshot().status,
      REPORT_STATUS.OPEN,
    )
  })

  test('when the report does not exist, it answers 404 REPORT_NOT_FOUND', async ({
    assert,
  }) => {
    const { useCase } = fresh()

    const result = await useCase.execute({
      id: randomUUID(),
      note: 'Qualquer nota',
      actor: actorDraft(),
    })

    assert.containsSubset(result.value, {
      status: 404,
      code: 'REPORT_NOT_FOUND',
    })
  })

  test('when the repository fails, it answers 500 with the module code', async ({
    assert,
  }) => {
    const reports = new ReportMemoryRepository()
    reports.findById = () => Promise.reject(new Error('database down'))
    const useCase = new AdministratorReportResolveUseCase(
      reports,
      new ClockFake(),
    )

    const result = await useCase.execute({
      id: randomUUID(),
      note: 'Qualquer nota',
      actor: actorDraft(),
    })

    assert.containsSubset(result.value, {
      status: 500,
      code: 'ADMINISTRATOR_REPORT_RESOLVE_ERROR',
    })
  })
})
