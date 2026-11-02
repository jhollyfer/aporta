/*
|--------------------------------------------------------------------------
| HTTP kernel file
|--------------------------------------------------------------------------
|
| The HTTP kernel file is used to register the middleware with the server
| or the router.
|
*/

import router from '@adonisjs/core/services/router'
import server from '@adonisjs/core/services/server'

/**
 * The error handler is used to convert an exception
 * to a HTTP response.
 */
server.errorHandler(() => import('#exceptions/handler'))

/**
 * The server middleware stack runs middleware on all the HTTP
 * requests, even if there is no route registered for
 * the request URL.
 *
 * The language is first: the message of any error, even one that happens before
 * the route exists, comes out in the requested language.
 */
server.use([
  () => import('#middleware/detect-user-locale.middleware'),
  () => import('#middleware/force-json-response.middleware'),
  () => import('#middleware/container-bindings.middleware'),
  () => import('#middleware/referrer-policy.middleware'),
  () => import('@adonisjs/cors/cors_middleware'),
])

/**
 * The router middleware stack runs middleware on all the HTTP
 * requests with a registered route.
 */
router.use([
  /**
   * Before the bodyparser, on purpose.
   *
   * The barrier decides by method and `Content-Type`, which are headers - it
   * needs the body for nothing. After the bodyparser, a `multipart` from a forbidden
   * origin would be read whole, written to temporary disk and only then
   * refused: all the work, for a request that never had permission.
   */
  () => import('#middleware/origin.middleware'),
  () => import('@adonisjs/core/bodyparser_middleware'),
  () => import('@adonisjs/shield/shield_middleware'),
  () => import('@adonisjs/auth/initialize_auth_middleware'),
  () => import('#middleware/silent-auth.middleware'),
  () => import('#middleware/initialize-bouncer.middleware'),
])

/**
 * Named middleware collection must be explicitly assigned to
 * the routes or the routes group.
 */
export const middleware = router.named({
  documentation: () => import('#middleware/documentation.middleware'),
  auth: () => import('#middleware/auth.middleware'),
  role: () => import('#middleware/role.middleware'),
  publicCache: () => import('#middleware/public-cache.middleware'),
})
