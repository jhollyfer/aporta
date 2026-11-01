import { test } from '@japa/runner'

import SameSite from '#core/same-site'

/**
 * The session cookie `SameSite`.
 *
 * The rule is tight on purpose: `none` sends the cookie on every cross-site request
 * and leaves CSRF resting only on the `Origin` check, so it only
 * shows up when the app and the API are really on different sites. The error of the
 * parent-domain approximation always falls on the tight side, and then the session does not
 * go up - a loud failure, not a silent hole.
 */
test.group('core > same-site (unit)', () => {
  test('when the host is the same, is lax', ({ assert }) => {
    assert.equal(
      SameSite.between(
        'https://app.exemplo.com.br',
        'https://app.exemplo.com.br',
      ).value,
      'lax',
    )
  })

  test('when the subdomains share a parent domain, are lax', ({ assert }) => {
    // The `api-` in front of the host does not change the site.
    assert.equal(
      SameSite.between(
        'https://app.exemplo.com.br',
        'https://api-app.exemplo.com.br',
      ).value,
      'lax',
    )
  })

  test('when the domains differ, are none', ({ assert }) => {
    assert.equal(
      SameSite.between('https://app.exemplo.com.br', 'https://api.outro.com.br')
        .value,
      'none',
    )
  })

  test('when there is no usable URL, falls back to none', ({ assert }) => {
    // Absent or malformed is the unknown setup, and in it `lax` would drop the
    // session without saying why.
    assert.equal(
      SameSite.between(undefined, 'https://api-app.exemplo.com.br').value,
      'none',
    )
    assert.equal(
      SameSite.between('nao-e-url', 'https://api-app.exemplo.com.br').value,
      'none',
    )
  })

  test('when two .com.br domains are compared, match as the known limit of the heuristic', ({
    assert,
  }) => {
    // `#parentDomain` cuts the first label, and does not consult the public suffix
    // list: `exemplo.com.br` and `outro.com.br` both become `com.br`. The test
    // exists to record the error, not to approve it.
    //
    // It falls on the tight side - `lax` where `none` was needed - and then the
    // session simply does not go up: a loud failure, not a silent hole.
    // Whoever is in that setup configures `COOKIE_DOMAIN` and solves it. Loading the
    // public suffix list to get this case right would cost more than it is
    // worth, because no installation of this project is in it.
    assert.equal(
      SameSite.between('https://exemplo.com.br', 'https://outro.com.br').value,
      'lax',
    )
  })

  test('when the host has a single label, has no parent domain', ({
    assert,
  }) => {
    // `localhost` against `api`: nothing to cut, and the host comparison already failed.
    assert.equal(
      SameSite.between('http://localhost:3000', 'http://api:3333').value,
      'none',
    )
  })
})
