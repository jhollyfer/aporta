import { z } from '../../validator.js'

/**
 * Marks or unmarks the "verified owner" seal (`PUT /administrator/owners/:id/verification`). The
 * body says which of the two, so repeating the call is harmless.
 */
export const AdministratorOwnerVerifyValidator = z.object({
  verified: z.boolean(),
})

export type AdministratorOwnerVerifyPayload = z.infer<
  typeof AdministratorOwnerVerifyValidator
>
