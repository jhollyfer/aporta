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

export type UserError =
  UserAlreadyArchived | UserNotArchived | UserNotVerifiable
