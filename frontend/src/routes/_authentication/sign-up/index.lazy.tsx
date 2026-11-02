import { createLazyFileRoute } from '@tanstack/react-router'

import { SignUpForm } from './-components/sign-up-form'

export const Route = createLazyFileRoute('/_authentication/sign-up/')({
  component: SignUpForm,
})
