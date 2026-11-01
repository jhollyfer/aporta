/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'

import { controllers } from '#generated/controllers'
import { middleware } from '#start/kernel'
import {
  currentPasswordThrottle,
  signInAccountThrottle,
  signInThrottle,
  refreshThrottle,
  uploadThrottle,
} from '#start/limiter'

/**
 * Routes are grouped by **role**, and not by resource: what a
 * group has in common is who can enter it, and it is the group that carries the
 * middleware. A new route is born protected by the module where it was placed, instead
 * of depending on someone remembering to repeat the protection.
 *
 * Controllers come from `#generated/controllers`, generated from the
 * `app/features` directory: moving or renaming a file breaks the build here, and not in
 * production as a path string would.
 */

/**
 * Liveness probe, the same in every house project: `GET /health-check`, without a
 * session, without a query (`app/features/health-check.controller.ts`).
 */
router.get('/health-check', [controllers.HealthCheck])

/**
 * API documentation: the document and the reference page. Both routes
 * stay outside any authenticated group, and both are in `openapi.ignore`
 * along with `/health-check` - the document does not document itself.
 */
router
  .get('/openapi.json', [controllers.documentation.openapi.show.Show])
  .as('documentation.openapi')
  .use(middleware.documentation())

router
  .get('/documentation', [controllers.documentation.reference.show.Show])
  .as('documentation.reference')
  .use(middleware.documentation())

/**
 * Session. No middleware on purpose - not forgetfulness, it is the trait
 * of the block: it is the entry door, and requiring a session here would make it unreachable.
 *
 * All three routes answer `204` with no body. What changes state travels in
 * `Set-Cookie`, with the `httpOnly` token pair.
 */
router
  .group(() => {
    router
      .post('sign-in', [controllers.authentication.session.signIn.SignIn])
      .use([signInThrottle, signInAccountThrottle])
    // The only one in the group that requires a session: signing out is deleting *this*
    // session's tokens, and without knowing which it is there is nothing to delete.
    router
      .post('sign-out', [controllers.authentication.session.signOut.SignOut])
      .use(middleware.auth())
    // Outside `auth()` because it is the expired access token that brings someone
    // here. What authorizes is the refresh cookie, and nothing else.
    router
      .post('refresh', [controllers.authentication.session.refresh.Refresh])
      .use(refreshThrottle)
  })
  .prefix('authentication')
  .as('authentication')

/**
 * The account itself, whatever the role.
 *
 * No identifier in the path: the scope comes from the session, never from the payload. The
 * `middleware.auth()` is on the group, and not on each route - without a session the role is
 * unknown, and the response is 401, never 403.
 */
router
  .group(() => {
    router.get('/', [controllers.account.profile.show.Show])
    router
      .put('/', [controllers.account.profile.update.Update])
      .use(currentPasswordThrottle)
  })
  .prefix('account')
  .as('profile')
  .use(middleware.auth())

/**
 * Attachments, at the authenticated root like `/account`, **staff only for now**: the
 * library has no per-owner rule (`show`, `paginate`, `complete`, `delete` take any id), so
 * opening it to the `OWNER` role would let a property owner list, finish or delete another
 * owner's files. The feature that lets owners upload (listing photos) must first give these
 * actions an ownership policy, and only then drop the `role()` below. The record is born with
 * its owner (the `actor` of the `create`), who authorizes nothing: whoever attaches keeps the
 * reference.
 *
 * The upload has three steps, and not one, because the binary does not pass through here
 *: the `POST` opens and returns signed URLs, the browser uploads the parts
 * straight to the bucket, and `complete` confirms. `GET :id/parts` is the fourth
 * path, and the same for two cases - resuming after a drop and fetching the
 * next batch of URLs for a file with too many parts.
 *
 * `DELETE` is the pair of `POST` and serves both states: it cancels the upload in
 * progress and deletes the finished file. It only reaches an orphan file - since the
 * record is neutral and shared, ownership does not serve as authorization, and what
 * decides is the live reference.
 *
 * The two reads - `GET /` and `GET :id` - are the panel file library.
 * There is no `PUT`: a file is not edited, it is replaced.
 */
router
  .group(() => {
    router.get('/', [controllers.storage.files.paginate.Paginate])
    // The upload ceiling only on the writes that open an upload: listing and downloading do not
    // spend the quota.
    router
      .post('/', [controllers.storage.files.create.Create])
      .use(uploadThrottle)
    router
      .post(':id/complete', [controllers.storage.files.complete.Complete])
      .as('complete')
      .use(uploadThrottle)
    router.get(':id/parts', [controllers.storage.files.parts.Parts]).as('parts')
    // After `:id/parts`: the two-segment path is the most specific, and registered
    // before it cannot be swallowed by the generic one.
    router.get(':id', [controllers.storage.files.show.Show])
    router.delete(':id', [controllers.storage.files.delete.Delete])

    // The download with the original name sits in this group, behind the session. Outside it,
    // it would be the back door of a private disk: a signed URL issued for any uuid without a
    // session. The `<a>` to save a file keeps working: same-site navigation sends the cookie.
    router
      .get(':id/download', [controllers.storage.files.download.Download])
      .as('download')
  })
  .prefix('storages')
  .as('storages')
  .use(middleware.auth())
  .use(middleware.role(['ADMINISTRATOR', 'MODERATOR']))
