import string from '@adonisjs/core/helpers/string'
import { test } from '@japa/runner'

import { URL_TTL } from '#config/drive'
import { PUBLIC_CACHE } from '#middleware/public-cache.middleware'

test.group('public-cache middleware (unit)', () => {
  test('when the stale window is added to max-age, the copy still holds signed photo URLs that work', ({
    assert,
  }) => {
    // The oldest copy a cache may serve is `MAX_AGE + STALE_WHILE_REVALIDATE` seconds old. The
    // photo URLs inside it were signed for `URL_TTL`: past that, the page loads with broken
    // photos and no error anywhere.
    const oldestCopy =
      (PUBLIC_CACHE.MAX_AGE + PUBLIC_CACHE.STALE_WHILE_REVALIDATE) * 1000

    assert.isBelow(oldestCopy, string.milliseconds.parse(URL_TTL))
  })
})
