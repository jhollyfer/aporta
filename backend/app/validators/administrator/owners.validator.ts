import { vine } from '#core/validator'
import type { Infer } from '#core/validator'

/**
 * Marks or unmarks the "verified owner" seal. The VineJS pair of the Zod
 * `AdministratorOwnerVerifyValidator` in `@aporta/shared`: the body says which of the two, so
 * repeating the call is harmless.
 */
export const AdministratorOwnerVerifyValidator = vine.create({
  verified: vine.boolean({ strict: true }),
})

export type AdministratorOwnerVerifyPayload = Infer<
  typeof AdministratorOwnerVerifyValidator
>
