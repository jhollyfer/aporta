import { test } from '@japa/runner'

import ClockFake from '#services/clock/clock.fake'
import ClockService from '#services/clock/clock.service'

test.group('services > clock', () => {
  test('when the process clock is read, it returns the current instant', ({
    assert,
  }) => {
    const before = Date.now()
    const now = new ClockService().now().getTime()

    assert.isAtLeast(now, before)
    assert.isAtMost(now, Date.now())
  })

  test('when the fake clock is read twice, it returns the same instant', ({
    assert,
  }) => {
    const clock = new ClockFake()

    assert.equal(clock.now().toISOString(), ClockFake.INSTANT.toISOString())
    assert.equal(clock.now().getTime(), clock.now().getTime())
  })
})
