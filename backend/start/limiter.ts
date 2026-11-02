import limiter from '@adonisjs/limiter/services/main'

/**
 * The attempt ceilings, per route.
 *
 * The key is the IP. It is not perfect - several people behind the same NAT count
 * together -, but whoever signs in does not have a session yet, and there is nothing else to count.
 */

/**
 * The per-account budget shared by every door that verifies a password.
 */
class AccountBudget {
  /**
   * The key is the email as the account sees it: `Ana@Mail.com ` and
   * `ana@mail.com` are the same account, and each case or whitespace variation
   * that opened a new bucket would circumvent the per-account ceiling.
   */
  static limit(email: string) {
    const account = email.trim().toLowerCase()

    if (account.length === 0) return null

    return limiter
      .allowRequests(20)
      .every('1 hour')
      .blockFor('10 mins')
      .usingKey(`signin:${account}`)
  }
}

/**
 * The panel door, per IP. Five attempts per minute is generous for whoever
 * mistypes the password and tight for whoever guesses it.
 *
 * `blockFor` is what turns the ceiling into a cost: without it the window expires on its own
 * and the attacker goes back to trying five times in the next minute, indefinitely.
 * With it, blowing through the ceiling costs ten minutes stopped.
 */
export const signInThrottle = limiter.define('signIn', function () {
  return limiter.allowRequests(5).every('1 minute').blockFor('10 mins')
})

/**
 * The same door, counted per account.
 *
 * The per-IP ceiling alone does not protect the account: whoever has many addresses tries the
 * same password on each and never blows through any one's limit. Counting by email
 * closes this.
 *
 * It is a second limit and not a composite `ip:email` key, which would be the opposite
 * of what is wanted: with the joint key, the same IP would get five attempts **per
 * email**, and enumerating accounts would become cheaper, not more expensive.
 *
 * Looser than the IP one - twenty per hour - because this is the limit that a
 * person who forgot their own password bumps into, and locking them out by mistake is the abuse
 * it could cause itself.
 */
export const signInAccountThrottle = limiter.define(
  'signInAccount',
  function (context) {
    const email: unknown = context.request.input('email')

    // Without an email in the body there is no account to protect, and `null` is how the limiter
    // receives "apply no ceiling here". Inventing a key for this case would lump
    // every malformed request into a single bucket, and twenty of them would lock the login of
    // someone who did nothing.
    if (typeof email !== 'string') return null

    return AccountBudget.limit(email)
  },
)

/**
 * The registration door, per IP. Nobody has a session to count on, and the account does not
 * exist yet, so the IP is the only key there is (`request.ip()`, which reads
 * `X-Forwarded-For` only from `TRUSTED_PROXIES`).
 *
 * A bucket of its own, and not the sign-in one: someone who mistypes the password five times
 * must not be refused the registration of a second account, and someone who registers
 * accounts must not spend the login attempts of the whole NAT. Five per minute, and
 * `blockFor` for the same reason as `signInThrottle`: without it, going over costs only the
 * rest of the minute, and an account factory keeps going. It also bounds what each call costs,
 * which is a password hash.
 */
export const signUpThrottle = limiter.define('signUp', function () {
  return limiter.allowRequests(5).every('1 minute').blockFor('10 mins')
})

/**
 * `PUT /account` verifies `currentPassword`, so a loop of wrong ones would be a guessing
 * oracle running outside the login ceilings (CWE-307). It spends the **same** account
 * budget as the login: same name (the key prefix), same `signin:<email>` key, so
 * guessing through either door drains one counter.
 *
 * The account is the session's (the route requires `auth()` first), never the body.
 * Only a request that carries `currentPassword` spends: a profile edit without a
 * password change does not touch the budget.
 */
export const currentPasswordThrottle = limiter.define(
  'signInAccount',
  function (context) {
    const user = context.auth.user
    const current: unknown = context.request.input('currentPassword')

    if (!user || current === undefined) return null

    return AccountBudget.limit(user.email)
  },
)

/**
 * The upload. Higher than the rest because a large file becomes several parts,
 * and each part is a request - the ceiling counts requests, not files.
 *
 * Only the writes that open an upload count (`POST /storages` and
 * `POST /storages/:id/complete`): the file library lists and downloads freely
 * without spending the quota. The key is the session user, and not the IP - whoever
 * is behind the same NAT, or a badly declared proxy, does not share the bucket.
 * Without a user (the route requires `auth()` first, so it does not happen) it falls back to the IP, which
 * is the limiter's default key.
 */
export const uploadThrottle = limiter.define('upload', function (context) {
  const user = context.auth.user
  const throttle = limiter.allowRequests(60).every('1 hour')

  if (!user) return throttle

  return throttle.usingKey(`user_${user.id}`)
})

/**
 * The owner's listing writes (create, edit, archive, attach photos). The ceiling is against the
 * loop, not against the person: an owner who writes an ad, corrects it a few times and attaches
 * a dozen pictures is well under sixty an hour, and a script that creates ads to fill the review
 * queue is not. The key is the session user, and not the IP, for the same reason as the upload
 * one: whoever is behind the same NAT does not share the bucket. Without a user (the route
 * requires `auth()` first, so it does not happen) it falls back to the IP.
 */
export const listingWriteThrottle = limiter.define(
  'listingWrite',
  function (context) {
    const user = context.auth.user
    const throttle = limiter.allowRequests(60).every('1 hour')

    if (!user) return throttle

    return throttle.usingKey(`listing_${user.id}`)
  },
)

/**
 * The public scam report, per IP. It is the only write that needs no account, so the address is
 * the only thing to count (`request.ip()`, which reads `X-Forwarded-For` only from
 * `TRUSTED_PROXIES`). Five an hour is generous for someone who found a scam and tight for a script
 * that would bury the staff's queue; `blockFor` is what makes going over cost something, for the
 * same reason as `signInThrottle`. A bucket of its own, so reporting never spends the login
 * attempts of the NAT.
 */
export const reportCreateThrottle = limiter.define('reportCreate', function () {
  return limiter.allowRequests(5).every('1 hour').blockFor('1 hour')
})

/**
 * Session renewal, per IP. It has no session (the expired access token is
 * precisely what brings the client here) and touches the database on every call -
 * it checks the refresh and deletes it. The token is opaque and high-entropy, so
 * guessing it is not the risk: the ceiling is against the loop that hammers the database.
 *
 * Generous on purpose: the SSR and a person's tabs renew together, and several
 * people behind the same NAT count in the same bucket. Without `blockFor`: blowing through
 * costs only the rest of the minute.
 */
export const refreshThrottle = limiter.define('refresh', function () {
  return limiter.allowRequests(60).every('1 minute')
})

/**
 * The public reads of `/storefront`, per IP: scraping and load, not a guessing attack. 120 a
 * minute is two a second, far above a person browsing (the listing page makes a handful of calls
 * and the map a few more while panning) and low enough to make a scraper walk instead of run.
 * Several people behind the same NAT share the bucket, so the ceiling is generous on purpose.
 *
 * Without `blockFor`: going over costs only the rest of the minute. A visitor who hits it by
 * mistake (a tab left refreshing) is back in under a minute, where a ten-minute block would look
 * like the site is down. The answer is the house `429` with `Retry-After`. A bucket of its own,
 * so reading never spends the login attempts or the report budget of the NAT.
 */
export const storefrontReadThrottle = limiter.define(
  'storefrontRead',
  function () {
    return limiter.allowRequests(120).every('1 minute')
  },
)
