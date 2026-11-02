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

/**
 * What `POST /authentication/sign-up` receives: an owner creating their own account.
 *
 * Strength is validated here (unlike sign-in, which only compares with the hash), with the same
 * `Rule.password()` as the profile edit, so the policy cannot differ between creating a password and
 * changing it. `passwordConfirmation` is declared because Zod removes from the output a key the schema
 * does not declare, and the confirmation is checked by reading the body.
 *
 * `role` does not go in: an account that registers itself is always an `OWNER`. Anything else is the
 * administrator's to set, and a role the client could send would be a role the client could choose.
 */
export const AuthenticationSessionSignUpValidator = z
  .object({
    name: z.string().trim().min(1).max(120),
    email: Rule.email(),
    password: Rule.password(),
    passwordConfirmation: z.string().max(32),
  })
  .refine(...Rule.confirmed())

export type AuthenticationSessionSignUpPayload = z.infer<
  typeof AuthenticationSessionSignUpValidator
>
