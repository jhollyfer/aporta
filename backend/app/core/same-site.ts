/**
 * The `SameSite` attribute of the session cookie, decided from the addresses of the client and
 * the API.
 *
 * `lax` when the app and the API are on the same site; `none` only when they are not.
 * `SameSite=None` sends the session cookie on **every** cross-site request, and the only CSRF
 * barrier left is the `Origin` check - which does not reach simple content-types. There was a
 * reason for a fixed `none` in production: it supports a deploy with API and app on different
 * sites. Where both are under the same parent domain, it is `none` without needing to be.
 *
 * "Same site" here is "same parent domain": everything after the first label. It is not the
 * public suffix list - `api.x.com.br` and `app.y.com.br` would fall as equal. The error of this
 * approximation is always on the tight side (`lax` where `none` was needed), and then the
 * session simply does not go up: a loud failure, not a silent hole. Whoever is in that setup
 * configures `COOKIE_DOMAIN`.
 */
export default class SameSite {
  private constructor(readonly value: 'lax' | 'none') {}

  static between(
    clientUrl: string | undefined,
    serverUrl: string | undefined,
  ): SameSite {
    const client = SameSite.#hostnameOf(clientUrl)
    const server = SameSite.#hostnameOf(serverUrl)

    if (!client || !server) return new SameSite('none')
    if (client === server) return new SameSite('lax')

    const parent = SameSite.#parentDomain(client)

    if (parent && parent === SameSite.#parentDomain(server))
      return new SameSite('lax')

    return new SameSite('none')
  }

  /** The hostname of a URL, or `null` when the value is not a URL. */
  static #hostnameOf(url: string | undefined): string | null {
    if (!url) return null

    try {
      return new URL(url).hostname.toLowerCase()
    } catch {
      return null
    }
  }

  /** Everything after the first label; `''` when there is nothing to remove. */
  static #parentDomain(hostname: string): string {
    const labels = hostname.split('.')

    if (labels.length < 3) return ''

    return labels.slice(1).join('.')
  }
}
