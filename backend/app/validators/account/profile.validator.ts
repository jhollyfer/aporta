import { email, password, vine } from '#core/validator'
import type { Infer } from '#core/validator'

/**
 * The account itself, edited by its owner.
 *
 * **Every field is optional**: an absent field means "leave alone", not
 * "erase". A schema that required all fields would make the verb promise
 * partial and the schema refuse partial.
 *
 * `role` and `status` are left out: the role is set on creation, by the
 * administrator, and nobody changes their own. Declaring them only to ignore them later
 * would invite someone to try.
 */
export const AccountProfileUpdateValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(120).optional(),
  email: email().optional(),
  password: password().optional(),
  /**
   * The current password, required **only** when `password` comes in the payload.
   *
   * It is proof of identity, not of strength: whoever hijacks a session has the
   * cookie, but does not know the password. `PASSWORD_SAME_AS_CURRENT` does not serve for
   * this - it compares the new one with the hash, and getting past it is precisely not
   * knowing the current one.
   *
   * `requiredIfExists` and not a check in the use-case: conditional requiredness
   * is payload shape, and here it becomes a `422` pointing at the field -
   * and not a generic error.
   *
   * Without the strength rules of `password()`: the value is checked against the hash,
   * not saved. The ceiling of 32 is the same as the policy's, because it is the largest value
   * the application may already have saved.
   */
  currentPassword: vine
    .string()
    .maxLength(32)
    .optional()
    .requiredIfExists('password'),
  // `nullable` is what allows removing the photo without replacing it. The uuid only guarantees the
  // format; that the file exists is checked in the use-case, otherwise the foreign
  // key violation would blow up as 500 instead of 422.
  avatarId: vine.string().uuid().nullable().optional(),
})

export type AccountProfileUpdatePayload = Infer<
  typeof AccountProfileUpdateValidator
>
