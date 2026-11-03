import { defineConfig } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'

import { TrustedProxies } from '#core/trusted-proxies'
import env from '#start/env'

/**
 * The app URL can be used in various places where you want to create absolute
 * URLs to your application. For example, when sending emails, images should
 * use absolute URLs.
 */
export const serverUrl = env.get('APP_SERVER_URL')

/**
 * The configuration settings used by the HTTP server
 */
export const http = defineConfig({
  /**
   * Generate a unique request id for each incoming request.
   * Useful to correlate logs and debug a request flow.
   */
  generateRequestId: true,

  /**
   * Who may state the real client IP in `X-Forwarded-For`: only the proxies in
   * `TRUSTED_PROXIES`, what the deploy topology declares (Coolify's Traefik
   * on the Docker network, for example `172.16.0.0/12`). Without a trusted proxy,
   * `request.ip()` returns the proxy IP for everyone and the per-IP limits
   * become a global bucket; with `true` the client forges the header and picks its
   * own key. When absent, the framework default (`loopback`) applies.
   * https://docs.adonisjs.com/guides/basics/request
   */
  trustProxy: TrustedProxies.compile(env.get('TRUSTED_PROXIES')),

  /**
   * `ETag` on every response that has a body, and `304 Not Modified` when the client already holds
   * it (`If-None-Match`). It pays off on the public reads, whose `Cache-Control` lets a client
   * come back after `max-age` and ask only "has it changed?" instead of downloading the page
   * again. On the other routes it only enables revalidation: it grants no freshness, so nothing
   * private is reused without asking the server.
   */
  etag: true,

  /**
   * Allow HTTP method spoofing via the "_method" form/query parameter.
   * This lets HTML forms target PUT/PATCH/DELETE routes while still
   * submitting with POST.
   */
  allowMethodSpoofing: false,

  /**
   * Enabling async local storage will let you access HTTP context
   * from anywhere inside your application.
   *
   * Turned on for the `RequestMessagesProvider` (`app/core/validator.ts`): the
   * validators are compiled once and called by `Validator.validate()`,
   * without the `ctx` at hand, so the request language only reaches the validation
   * message through `HttpContext.get()`
   * (https://docs.adonisjs.com/guides/concepts/async-local-storage).
   */
  useAsyncLocalStorage: true,

  /**
   * Redirect configuration controls the behavior of
   * response.redirect().back() and query string forwarding.
   */
  redirect: {
    /**
     * When enabled, all redirects automatically carry over the current
     * request's query string parameters to the redirect destination.
     * Use withQs(false) to opt out for a specific redirect.
     */
    forwardQueryString: true,
  },

  /**
   * Manage cookies configuration. The settings for the session id cookie are
   * defined inside the "config/session.ts" file.
   */
  cookie: {
    /**
     * Restrict the cookie to a specific domain.
     * Keep empty to use the current host.
     */
    domain: '',

    /**
     * Restrict the cookie to a URL path. '/' means all routes.
     */
    path: '/',

    /**
     * Default lifetime for cookies managed by the HTTP layer.
     */
    maxAge: '2h',

    /**
     * Prevent JavaScript access to the cookie in the browser.
     */
    httpOnly: true,

    /**
     * Send cookies only over HTTPS in production.
     */
    secure: app.inProduction,

    /**
     * Cross-site policy for cookie sending.
     */
    sameSite: 'lax',
  },
})
