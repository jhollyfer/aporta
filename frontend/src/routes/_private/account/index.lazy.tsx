import { createLazyFileRoute } from '@tanstack/react-router'

import { AccountCard } from './-components/account-card'

export const Route = createLazyFileRoute('/_private/account/')({
  component: AccountCard,
})
