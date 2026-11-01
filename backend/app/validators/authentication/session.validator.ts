import { email, vine } from '#core/validator'
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
