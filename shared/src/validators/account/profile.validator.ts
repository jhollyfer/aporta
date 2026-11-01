import { Rule, z } from '../../validator.js'

/**
 * The account itself, edited by its owner (`PUT /account`).
 *
 * **Every field is optional**: an absent field means "do not touch", and not
 * "erase". `role` and `status` do not go in: nobody changes their own role.
 *
 * A blank password counts as absent (`Rule.optional`): it is "do not change", and then
 * neither the confirmation nor the current password is demanded.
 */
export const AccountProfileUpdateValidator = z
  .object({
    name: Rule.optional(z.string().trim().min(1).max(120)),
    email: Rule.optional(Rule.email()),
    password: Rule.optional(Rule.password()),
    // Declared because the backend checks the confirmation by reading the body: Zod
    // removes from the output the key that the schema does not declare.
    passwordConfirmation: Rule.optional(z.string().max(32)),
    /**
     * The current password, required **only** when `password` comes filled in. It is proof
     * of identity, not of strength: the value is checked against the hash.
     */
    currentPassword: Rule.optional(z.string().max(32)),
    // `null` removes the photo without replacing it. The uuid only guarantees the format; that the
    // file exists is checked on the server.
    avatarId: Rule.nullable(z.uuid()),
  })
  .refine(...Rule.confirmed())
  .refine(
    (payload) =>
      payload.password === undefined || payload.currentPassword !== undefined,
    // The backend's `requiredIfExists('password')`, pointed at the field that is missing.
    { path: ['currentPassword'], params: { rule: 'required' } },
  )

export type AccountProfileUpdatePayload = z.infer<
  typeof AccountProfileUpdateValidator
>
