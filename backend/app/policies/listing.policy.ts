import type { AuthorizerResponse } from '@adonisjs/bouncer/types'
import type { Actor } from '@aporta/shared'

import type Listing from '#domain/listing/listing.entity'
import SessionScopedPolicy from '#policies/session-scoped-policy.base'

/**
 * Who may act on which ad on the owner's side.
 *
 * The rule is ownership and nothing else: `Listing.isOwnedBy` is the domain fact, and this policy
 * only turns it into the response. An ad that is someone else's answers **exactly** like one that
 * does not exist (`404`, same `code`, same message): a `403` would tell whoever probes that the
 * uuid is a real ad, and the list of ads is something a competitor would like to enumerate
 * (`docs/SECURITY.md` §4).
 *
 * Reading, editing, archiving and the pictures (attach, remove, reorder) are one method each and one rule on purpose:
 * the day one of them needs more (a moderator who may read any ad, an ad under review that cannot
 * be edited) it changes here, in one place, and the controller of each action already asks.
 *
 * Staff is not special-cased: the owner routes are closed to the staff by the route group, and
 * the review of someone else's ad is a different resource with its own policy (`docs/TASKS.md`,
 * phase 5).
 */
export default class ListingPolicy extends SessionScopedPolicy {
  show(actor: Actor, listing: Listing | null): AuthorizerResponse {
    return this.owned(actor, listing)
  }

  update(actor: Actor, listing: Listing | null): AuthorizerResponse {
    return this.owned(actor, listing)
  }

  archive(actor: Actor, listing: Listing | null): AuthorizerResponse {
    return this.owned(actor, listing)
  }

  attachPhotos(actor: Actor, listing: Listing | null): AuthorizerResponse {
    return this.owned(actor, listing)
  }

  removePhoto(actor: Actor, listing: Listing | null): AuthorizerResponse {
    return this.owned(actor, listing)
  }

  reorderPhotos(actor: Actor, listing: Listing | null): AuthorizerResponse {
    return this.owned(actor, listing)
  }

  private owned(actor: Actor, listing: Listing | null): AuthorizerResponse {
    if (!listing || !listing.isOwnedBy(actor.id))
      return this.hidden('LISTING_NOT_FOUND')

    return true
  }
}
