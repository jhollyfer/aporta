/**
 * An account's role. A lookup object instead of a loose union: the key names the
 * value in the code, the value is what goes to the API, and the type comes out derived
 * (`_standards/typescript.md` §4). The label the user sees lives in the
 * frontend's `lib/labels.ts`, because it is presentation.
 *
 * There are three: the administrator (born only from the seeder, the only one that purges),
 * the moderator (reviews listings and places) and the owner of a property, who is the public
 * that signs up to advertise and never operates the panel.
 */
export const USER_ROLE = {
  ADMINISTRATOR: 'ADMINISTRATOR',
  /** Reviews and archives listings and places. Does not delete for good, and does not manage accounts. */
  MODERATOR: 'MODERATOR',
  /** Owner of a property: manages only what is theirs, and has no access to the panel. */
  OWNER: 'OWNER',
} as const

export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE]

export const USER_ROLES = Object.values(USER_ROLE)

/**
 * Whoever operates the panel, and not only their own account.
 *
 * It exists apart from `USER_ROLES` so that a new role is born **from outside**: an
 * `OWNER` is in `USER_ROLE` without entering here, and is left out of the staff
 * checks by construction rather than by oversight.
 */
export const STAFF_USER_ROLES: ReadonlyArray<UserRole> = [
  USER_ROLE.ADMINISTRATOR,
  USER_ROLE.MODERATOR,
]
