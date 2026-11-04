/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import { USER_ROLE } from '@aporta/shared'

import { controllers } from '#generated/controllers'
import { middleware } from '#start/kernel'
import {
  currentPasswordThrottle,
  listingWriteThrottle,
  reportCreateThrottle,
  signInAccountThrottle,
  signInThrottle,
  signUpThrottle,
  storefrontReadThrottle,
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
 * The public storefront. **No middleware at all**, and not by forgetfulness: it is the trait of
 * the block. Choosing a place to live in Benjamin Constant does not require an account, and the
 * visitor who has to sign up before seeing a price is the visitor who goes back to the WhatsApp
 * group this platform exists to replace.
 *
 * What limits what comes out of here is not an authentication layer. Each resource's repository
 * cuts the rows (`paginatePublished`, `findPublishedRecordBySlug`: `PUBLISHED` and outside the
 * trash), and the storefront presenter cuts the columns (no `status`, no `deletedAt`, no keys).
 * The owner's WhatsApp does leave, by design: it is the contact the ad exists to publish.
 *
 * **Reads, and one write.** Everything in this group is a `GET` but `POST /storefront/reports`
 * (the scam report), which carries its own per-IP throttle on the route (`start/limiter.ts`).
 * `storefront.e2e.spec.ts` proves it: no route asks for a cookie, and the report is the only one
 * that is not a `GET`.
 *
 * The reads carry two middleware and nothing else: a per-IP ceiling (`storefrontReadThrottle`,
 * TM-016) and `Cache-Control: public` on a `200` (`publicCache`, whose TTL stays under the
 * signed photo URL's). The report has neither the cache (a write) nor the read ceiling.
 *
 * The listing is reached by `slug`, which is what the storefront URL carries. The neighborhoods
 * and the guide have no detail route: the screen only ever reads them as a list.
 */
router
  .group(() => {
    router
      .group(() => {
        router.get('/', [controllers.storefront.listings.paginate.Paginate])
        // Before `:slug`, or `pins` would be read as the slug of an ad. The price of that order:
        // an ad whose slug is exactly `pins` would be unreachable, and none can be: a generated
        // slug always ends in an eight-character suffix (`Slug.of`).
        router.get('pins', [controllers.storefront.listings.pins.Pins])
        router.get(':slug', [controllers.storefront.listings.show.Show])
      })
      .prefix('listings')
      .as('listings')
      .use([storefrontReadThrottle, middleware.publicCache()])

    router
      .group(() => {
        router.get('/', [
          controllers.storefront.neighborhoods.paginate.Paginate,
        ])
      })
      .prefix('neighborhoods')
      .as('neighborhoods')
      .use([storefrontReadThrottle, middleware.publicCache()])

    router
      .group(() => {
        router.get('/', [controllers.storefront.places.paginate.Paginate])
      })
      .prefix('places')
      .as('places')
      .use([storefrontReadThrottle, middleware.publicCache()])

    // The one write in the group, as the paragraph above anticipated: it carries its own
    // per-IP throttle on the route. A report needs no account, because whoever was almost
    // scammed will not sign up to warn the others.
    router
      .group(() => {
        router
          .post('/', [controllers.storefront.reports.create.Create])
          .use(reportCreateThrottle)
      })
      .prefix('reports')
      .as('reports')
  })
  .prefix('storefront')
  .as('storefront')

/**
 * Session. No middleware on purpose - not forgetfulness, it is the trait
 * of the block: it is the entry door, and requiring a session here would make it unreachable.
 *
 * Sign-in, sign-out and refresh answer `204` with no body: what changes state travels in
 * `Set-Cookie`, with the `httpOnly` token pair. Sign-up answers `201` with the profile and
 * sets no cookie.
 */
router
  .group(() => {
    router
      .post('sign-in', [controllers.authentication.session.signIn.SignIn])
      .use([signInThrottle, signInAccountThrottle])
    // The owner creating their own account. Anonymous, like `sign-in`, and it opens no
    // session: the client signs in next, so the cookie pair has a single door.
    router
      .post('sign-up', [controllers.authentication.session.signUp.SignUp])
      .use(signUpThrottle)
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
 * The owner's own ads. The group asks for a session and for the `OWNER` role: the staff reviews
 * other people's ads through its own routes (`docs/TASKS.md`, phase 5), and an administrator
 * writing an ad here would write it under his own account.
 *
 * No identifier selects the account: the scope is the session. The list is cut to it inside the
 * query, and the routes that take an `:id` go through `ListingPolicy` in the controller, so
 * an ad of another account answers the same `404` as one that does not exist. The writes carry
 * a ceiling per user (`listingWriteThrottle`).
 *
 * The photos are files already uploaded through `/storages` (open to the `OWNER` below), tied to
 * the ad by their key: the binary never passes through here. Removing and reordering them are two
 * more routes under the same ad; `photos/order` is declared before `photos/:photoId` so the word
 * `order` is never read as an identifier.
 */
router
  .group(() => {
    router
      .group(() => {
        router.get('/', [controllers.owner.listings.paginate.Paginate])
        router
          .post('/', [controllers.owner.listings.create.Create])
          .use(listingWriteThrottle)
        router.get(':id', [controllers.owner.listings.show.Show])
        router
          .put(':id', [controllers.owner.listings.update.Update])
          .use(listingWriteThrottle)
        router
          .delete(':id', [controllers.owner.listings.archive.Archive])
          .use(listingWriteThrottle)
        router
          .post(':id/photos', [controllers.owner.listingPhotos.create.Create])
          .as('photos')
          .use(listingWriteThrottle)
        router
          .put(':id/photos/order', [
            controllers.owner.listingPhotos.reorder.Reorder,
          ])
          .as('photos.order')
          .use(listingWriteThrottle)
        router
          .delete(':id/photos/:photoId', [
            controllers.owner.listingPhotos.delete.Delete,
          ])
          .as('photos.delete')
          .use(listingWriteThrottle)
      })
      .prefix('listings')
      .as('listings')
  })
  .prefix('owner')
  .as('owner')
  .use(middleware.auth())
  .use(middleware.role([USER_ROLE.OWNER]))

/**
 * The staff's side of the moderation: the queue of ads, the owner's seal, the scam reports and
 * the city guide the team keeps (`places`), plus the accounts (`users`), which only the
 * `ADMINISTRATOR` reaches.
 * Open to `ADMINISTRATOR` and `MODERATOR` alike (`docs/PRD.md` §8 leaves open who composes the
 * team; the role lists below are the place to narrow it). The `OWNER` never enters: an owner
 * reviewing ads would be reviewing his own.
 *
 * `DELETE :id` archives (the removal the moderator has); `DELETE :id/permanent` erases an
 * **already archived** ad for good and is the `ADMINISTRATOR`'s alone. An ad with a report is not
 * erased: reports and decisions stay tied to it as record. The routes that take an `:id` need no policy because no per-record
 * rule exists beyond the role: staff acts on any ad, report or owner account, and a missing one is
 * an honest `404` (the staff may know the id exists).
 */
router
  .group(() => {
    router
      .group(() => {
        router.get('/', [controllers.administrator.listings.paginate.Paginate])
        router.get(':id', [controllers.administrator.listings.show.Show])
        router.put(':id/review', [
          controllers.administrator.listings.review.Review,
        ])
        router.delete(':id', [
          controllers.administrator.listings.archive.Archive,
        ])
        // The staff archives; erasing for good is the ADMINISTRATOR's alone, so the route
        // narrows the group's roles (`role.middleware.ts`).
        router
          .delete(':id/permanent', [
            controllers.administrator.listings.delete.Delete,
          ])
          .use(middleware.role([USER_ROLE.ADMINISTRATOR]))
      })
      .prefix('listings')
      .as('listings')

    router
      .group(() => {
        router.get('/', [controllers.administrator.places.paginate.Paginate])
        router.post('/', [controllers.administrator.places.create.Create])
        router.get(':id', [controllers.administrator.places.show.Show])
        router.put(':id', [controllers.administrator.places.update.Update])
        router.put(':id/unarchive', [
          controllers.administrator.places.unarchive.Unarchive,
        ])
        router.delete(':id', [controllers.administrator.places.archive.Archive])
        // The staff keeps the guide; erasing a place for good is the ADMINISTRATOR's alone, and
        // the same convention as the ads: the route narrows the group's roles.
        router
          .delete(':id/permanent', [
            controllers.administrator.places.delete.Delete,
          ])
          .use(middleware.role([USER_ROLE.ADMINISTRATOR]))
      })
      .prefix('places')
      .as('places')

    router
      .group(() => {
        router.put(':id/verification', [
          controllers.administrator.owners.verify.Verify,
        ])
      })
      .prefix('owners')
      .as('owners')

    router
      .group(() => {
        router.get('/', [controllers.administrator.reports.paginate.Paginate])
        router.put(':id/resolution', [
          controllers.administrator.reports.resolve.Resolve,
        ])
      })
      .prefix('reports')
      .as('reports')

    // The accounts are the ADMINISTRATOR's alone: the group lets the moderator through, so the
    // whole block narrows the roles, the same convention as `DELETE :id/permanent`.
    router
      .group(() => {
        router.get('/', [controllers.administrator.users.paginate.Paginate])
        router.get(':id', [controllers.administrator.users.show.Show])
        router.put(':id/role', [
          controllers.administrator.users.changeRole.ChangeRole,
        ])
        router.put(':id/status', [
          controllers.administrator.users.changeStatus.ChangeStatus,
        ])
      })
      .prefix('users')
      .as('users')
      .use(middleware.role([USER_ROLE.ADMINISTRATOR]))
  })
  .prefix('administrator')
  .as('administrator')
  .use(middleware.auth())
  .use(middleware.role([USER_ROLE.ADMINISTRATOR, USER_ROLE.MODERATOR]))

/**
 * Attachments, at the authenticated root like `/account`. Open to the staff, who see the whole
 * collection, and to the `OWNER`, who uploads the pictures of his ads and sees only his own
 * files: `StoragePolicy` decides per file in the controller (`show`, `complete`, `parts`,
 * `delete` and `download` take an id), and the list is cut to the account inside the query. A
 * file of another account answers the same `404` as one that does not exist. The record is born
 * with its owner (the `actor` of the `create`), which is what the policy compares.
 *
 * The upload has three steps, and not one, because the binary does not pass through here
 *: the `POST` opens and returns signed URLs, the browser uploads the parts
 * straight to the bucket, and `complete` confirms. `GET :id/parts` is the fourth
 * path, and the same for two cases - resuming after a drop and fetching the
 * next batch of URLs for a file with too many parts.
 *
 * `DELETE` is the pair of `POST` and serves both states: it cancels the upload in
 * progress and deletes the finished file. It only reaches an orphan file: ownership
 * (`StoragePolicy`) decides who may ask, and the live reference decides whether the file can go,
 * so a photo on an ad keeps its file.
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
  .use(
    middleware.role([
      USER_ROLE.ADMINISTRATOR,
      USER_ROLE.MODERATOR,
      USER_ROLE.OWNER,
    ]),
  )
