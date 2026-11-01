import { defineConfig } from '@adonisjs/shield'

const shieldConfig = defineConfig({
  /**
   * The API only answers JSON (and download redirects), so nothing it
   * returns loads a resource: `default-src 'none'` and the directives that block being
   * framed, swapping the base and posting forms. helmet requires
   * `default-src` in the policy. The reference page (Scalar, with a CDN
   * script) is the only HTML response and swaps this header in its own controller
   * (`SCALAR_CONTENT_SECURITY_POLICY`). Whoever serves the panel HTML is the
   * frontend, with its own policy (`frontend/src/lib/security-headers.ts`).
   * https://docs.adonisjs.com/guides/security/securing-ssr-applications
   */
  csp: {
    /**
     * Enable the Content-Security-Policy header.
     */
    enabled: true,

    useDefaults: false,

    /**
     * Per-resource CSP directives.
     */
    directives: {
      defaultSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'none'"],
    },

    /**
     * Report violations without blocking resources.
     */
    reportOnly: false,
  },

  /**
   * Configure CSRF protection options. Refer documentation
   * to learn more.
   */
  csrf: {
    /**
     * Enable CSRF token verification for state-changing requests.
     */
    enabled: false,

    /**
     * Route patterns to exclude from CSRF checks.
     * Useful for external webhooks or API endpoints.
     */
    exceptRoutes: [],

    /**
     * Expose an encrypted XSRF-TOKEN cookie for frontend HTTP clients.
     */
    enableXsrfCookie: true,

    /**
     * HTTP methods protected by CSRF validation.
     */
    methods: ['POST', 'PUT', 'PATCH', 'DELETE'],
  },

  /**
   * Control how your website should be embedded inside
   * iframes.
   */
  xFrame: {
    /**
     * Enable the X-Frame-Options header.
     */
    enabled: true,

    /**
     * Block all framing attempts. Default value is DENY.
     */
    action: 'DENY',
  },

  /**
   * Force browser to always use HTTPS.
   */
  hsts: {
    /**
     * Enable the Strict-Transport-Security header.
     */
    enabled: true,

    /**
     * HSTS policy duration remembered by browsers.
     */
    maxAge: '180 days',
  },

  /**
   * Disable browsers from sniffing content types and rely only
   * on the response content-type header.
   */
  contentTypeSniffing: {
    /**
     * Enable X-Content-Type-Options: nosniff.
     */
    enabled: true,
  },
})

export default shieldConfig
