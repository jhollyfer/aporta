import { randomUUID } from 'node:crypto'

import { REPORT_REASON, REPORT_STATUS } from '@aporta/shared'
import { test } from '@japa/runner'

import Report from '#domain/report/report.entity'

const AT = new Date('2026-11-01T12:00:00.000Z')

function report(details: string | null = null): Report {
  return Report.create({
    id: randomUUID(),
    listingId: randomUUID(),
    reason: REPORT_REASON.SCAM,
    details,
    reporterHash: 'a'.repeat(64),
  })
}

test.group('domain > report', () => {
  test('when created, it is OPEN with no resolution', ({ assert }) => {
    const snapshot = report('Pediu sinal por Pix.').snapshot()

    assert.equal(snapshot.status, REPORT_STATUS.OPEN)
    assert.equal(snapshot.details, 'Pediu sinal por Pix.')
    assert.isNull(snapshot.resolvedAt)
    assert.isNull(snapshot.resolvedBy)
    assert.isNull(snapshot.resolutionNote)
  })

  test('when the details are blank, they are stored as none', ({ assert }) => {
    assert.isNull(report('   ').snapshot().details)
  })

  test('when resolved, it records who, when and the trimmed note', ({
    assert,
  }) => {
    const target = report()

    assert.isTrue(
      target.resolve('staff-1', '  Conferi com o dono.  ', AT).isRight(),
    )

    assert.containsSubset(target.snapshot(), {
      status: REPORT_STATUS.RESOLVED,
      resolvedBy: 'staff-1',
      resolvedAt: AT,
      resolutionNote: 'Conferi com o dono.',
    })
  })

  test('when resolved twice, the second is refused and the first record stays', ({
    assert,
  }) => {
    const target = report()
    target.resolve('staff-1', 'Primeira nota', AT)

    const again = target.resolve('staff-2', 'Segunda nota', AT)

    assert.deepEqual(again.value, { code: 'REPORT_ALREADY_RESOLVED' })
    assert.equal(target.snapshot().resolvedBy, 'staff-1')
    assert.equal(target.snapshot().resolutionNote, 'Primeira nota')
  })

  test('when the note is too short or too long, it is refused and the report stays OPEN', ({
    assert,
  }) => {
    for (const note of ['', 'ab', 'x'.repeat(501)]) {
      const target = report()

      assert.deepEqual(target.resolve('staff-1', note, AT).value, {
        code: 'REPORT_NOTE_INVALID',
      })
      assert.equal(target.snapshot().status, REPORT_STATUS.OPEN)
    }
  })
})
