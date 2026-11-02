import { email, password, vine } from '#core/validator'
import type { Infer } from '#core/validator'

export const AuthenticationSessionSignInValidator = vine.create({
  email: email(),
  // Signing in does not validate strength: the password is only compared with the stored hash.
  // Requiring the current format here would lock out whoever registered before the rule
  // got stricter - and would reveal, through the validation message, what the policy is.
  password: vine.string().minLength(1).maxLength(128),
})

export type AuthenticationSessionSignInPayload = Infer<
  typeof AuthenticationSessionSignInValidator
>

/**
 * The owner registering by themselves. The pair of `AuthenticationSessionSignUpValidator` in
 * `@aporta/shared`.
 *
 * `password()` carries `confirmed`, which reads `passwordConfirmation` from the raw body, so
 * the field is not declared here and does not reach the payload. `role` is not declared
 * either: the use-case sets it, and a key the client sends is dropped by VineJS.
 */
export const AuthenticationSessionSignUpValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(120),
  email: email(),
  password: password(),
})

export type AuthenticationSessionSignUpPayload = Infer<
  typeof AuthenticationSessionSignUpValidator
>
