import { Rule, z } from '../../validator.js'

/** What `POST /authentication/sign-in` receives. */
export const AuthenticationSessionSignInValidator = z.object({
  email: Rule.email(),
  // Signing in does not validate strength: the password is only compared with the stored hash, and
  // requiring the current format would lock out whoever registered before - and would say, through the
  // validation message, what the policy is. `min(1)` is the "required".
  password: z.string().min(1).max(128),
})

export type AuthenticationSessionSignInPayload = z.infer<
  typeof AuthenticationSessionSignInValidator
>
