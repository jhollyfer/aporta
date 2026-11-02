import { REPORT_STATUS, SORT_DIRECTION } from '@aporta/shared'
import { test } from '@japa/runner'

import AdministratorReportPaginateUseCase from './paginate.use-case.ts'

import ReportMemoryRepository from '#repositories/report/report.memory.repository'
import { reportDraft } from '#tests/report-fixtures'

function fresh() {
  const reports = new ReportMemoryRepository()
  const listingId = '00000000-0000-4000-8000-0000000000d1'
  reports.putListing({ id: listingId, slug: 'casa', title: 'Casa do centro' })
  const put = (id: string, day: string, resolve = false) => {
    const report = reportDraft({
      id: `00000000-0000-4000-8000-00000000${id}`,
      listingId,
    })
    if (resolve) report.resolve('staff', 'Conferido', new Date())
    reports.put(report, new Date(`${day}T12:00:00.000Z`))
  }
  put('0001', '2026-10-01')
  put('0002', '2026-10-20')
  put('0003', '2026-10-10', true)

  return new AdministratorReportPaginateUseCase(reports)
}

test.group('administrator > reports > paginate (unit)', () => {
  test('when the open ones are asked for, the oldest comes first', async ({
    assert,
  }) => {
    const result = await fresh().execute({ status: REPORT_STATUS.OPEN })

    if (result.isLeft()) return assert.fail('paginate failed')

    assert.deepEqual(
      result.value.data.map((each) => each.createdAt.slice(0, 10)),
      ['2026-10-01', '2026-10-20'],
    )
  })

  test('when the resolved ones are asked for, they come newest first and with who and when', async ({
    assert,
  }) => {
    const result = await fresh().execute({ status: REPORT_STATUS.RESOLVED })

    if (result.isLeft()) return assert.fail('paginate failed')

    assert.lengthOf(result.value.data, 1)
    assert.equal(result.value.data[0]?.resolvedBy, 'staff')
    assert.equal(result.value.data[0]?.listing.slug, 'casa')
  })

  test('when the direction is explicit, it wins; and the reporter is only a piece of the hash', async ({
    assert,
  }) => {
    const result = await fresh().execute({
      status: REPORT_STATUS.OPEN,
      direction: SORT_DIRECTION.DESC,
    })

    if (result.isLeft()) return assert.fail('paginate failed')

    assert.equal(result.value.data[0]?.createdAt.slice(0, 10), '2026-10-20')
    assert.equal(result.value.data[0]?.reporter, 'c'.repeat(12))
  })

  test('when the repository fails, it answers 500 with the module code', async ({
    assert,
  }) => {
    const reports = new ReportMemoryRepository()
    reports.paginate = () => Promise.reject(new Error('database down'))

    const result = await new AdministratorReportPaginateUseCase(
      reports,
    ).execute({})

    assert.containsSubset(result.value, {
      status: 500,
      code: 'ADMINISTRATOR_REPORT_PAGINATE_ERROR',
    })
  })
})
