/**
 * The account domain facts: what the entity refuses, with no HTTP status or
 * screen text (`_standards/domain.md` §2). Email uniqueness is a question
 * for the repository, and the guard of the own account belongs to `UserPolicy`.
 */

/** Archiving what is already in the trash. */
export type UserAlreadyArchived = { readonly code: 'USER_ALREADY_ARCHIVED' }

/** Restoring, reusing or permanently deleting what is not in the trash. */
export type UserNotArchived = { readonly code: 'USER_NOT_ARCHIVED' }

/** The seal is for the people who advertise: staff and archived accounts do not carry it. */
export type UserNotVerifiable = { readonly code: 'USER_NOT_VERIFIABLE' }

/** The administrator changing the role or the status of the account they are signed in with. */
export type UserOwnAccessChange = { readonly code: 'USER_OWN_ACCESS_CHANGE' }

/** The change would leave the platform without a single active administrator. */
export type UserLastAdministrator = {
  readonly code: 'USER_LAST_ADMINISTRATOR'
}

/** An owner who still has an ad outside the trash cannot become staff: staff has no ads of its own. */
export type UserOwnsListings = { readonly code: 'USER_OWNS_LISTINGS' }

/** What an access change (role or status) refuses. */
export type UserAccessError =
  UserOwnAccessChange | UserLastAdministrator | UserOwnsListings

export type UserError =
  UserAlreadyArchived | UserNotArchived | UserNotVerifiable | UserAccessError
