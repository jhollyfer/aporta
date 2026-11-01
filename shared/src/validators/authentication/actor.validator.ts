import { USER_ROLES } from '../../enums/user-role.js'
import { z } from '../../validator.js'

/**
 * Who acts on the request: the session's account, with only what the rules read.
 *
 * It is the `actor` that the authentication middleware builds and that goes into the use
 * cases' payload (`_standards/backend.md` §4.3). The type is born from this schema, and
 * not from the ORM model nor from a retyped `type`: use cases and policies do not
 * import a model (`_standards/architecture.md` §2). `role` and `avatarId` are what
 * the policy reads without a new query; `email` serves the email-change check
 * in `/account`.
 */
export const ActorSchema = z.object({
  id: z.string().min(1),
  email: z.string().min(1),
  role: z.enum(USER_ROLES),
  avatarId: z.string().nullable(),
})

export type Actor = z.infer<typeof ActorSchema>
