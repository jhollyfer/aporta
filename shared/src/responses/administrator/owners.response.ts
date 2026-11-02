import { z } from '../../validator.js'
import { ResponseRule } from '../envelope.js'

/** The seal after the call: what it is now, and since when. */
export const AdministratorOwnerVerifyResponse = z.object({
  id: z.uuid(),
  verified: z.boolean(),
  verifiedAt: ResponseRule.datetime().nullable(),
})

export type AdministratorOwnerVerifyResponse = z.infer<
  typeof AdministratorOwnerVerifyResponse
>
