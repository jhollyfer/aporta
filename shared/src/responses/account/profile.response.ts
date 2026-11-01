import { ACTIVE_STATUSES } from '../../enums/active-status.js'
import { USER_ROLES } from '../../enums/user-role.js'
import { z } from '../../validator.js'
import { ResponseRule } from '../envelope.js'
import { StorageFileShowResponse } from '../storage/files.response.js'

/**
 * `GET /account` and `PUT /account` answer the account with the avatar preloaded.
 * `password` is `serializeAs: null` in the model: it comes out in no response.
 *
 * Closed (`z.object`) for the reason given in `StorageFileShowResponse`. The
 * relation is nullable: Lucid serializes the preloaded `belongsTo` with no row on the
 * other side as `null`, and it is optional because it only comes when the use case
 * preloads it.
 *
 * One schema for both routes, and not a copy: having both use a single shape is what
 * keeps the `PUT` response from erasing from the client cache what the `GET` just
 * delivered.
 */
export const AccountProfileShowResponse = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.enum(USER_ROLES),
  status: z.enum(ACTIVE_STATUSES),
  avatarId: z.string().nullable(),
  avatar: StorageFileShowResponse.nullable().optional(),
  ...ResponseRule.timestamps(),
})

export type AccountProfileShowResponse = z.infer<
  typeof AccountProfileShowResponse
>

export const AccountProfileUpdateResponse = AccountProfileShowResponse

export type AccountProfileUpdateResponse = z.infer<
  typeof AccountProfileUpdateResponse
>
