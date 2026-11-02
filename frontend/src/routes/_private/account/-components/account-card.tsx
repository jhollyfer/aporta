import * as React from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'

import { USER_ROLE } from '@aporta/shared'

import { PillButton } from '#/components/common/pill-button'
import { accountOptions } from '#/integrations/tanstack-query/queries/account'
import { USER_ROLE_LABELS } from '#/lib/labels'
import { m } from '#/paraglide/messages'

import { SignOutButton } from './sign-out-button'

/**
 * Minha conta: nome, e-mail e tipo de conta, e o botão de sair. A lista é de definição
 * (`dl`), que é o que o leitor de tela entende como "rótulo e valor". `break-words` no
 * e-mail porque endereço comprido não tem onde quebrar e estouraria a tela de 320 px.
 */
export function AccountCard(): React.JSX.Element {
  const { data: account } = useSuspenseQuery(accountOptions())

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <h1 className="text-3xl leading-tight font-extrabold tracking-tight text-ink sm:text-4xl">
        {m.account_title()}
      </h1>
      <dl className="flex flex-col gap-4 rounded-card bg-surface p-5 sm:p-8">
        <div className="flex flex-col gap-1">
          <dt className="text-sm font-bold text-ink-soft">
            {m.account_name()}
          </dt>
          <dd className="text-base font-bold break-words text-ink">
            {account.name}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-sm font-bold text-ink-soft">
            {m.account_email()}
          </dt>
          <dd className="text-base font-bold break-words text-ink">
            {account.email}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-sm font-bold text-ink-soft">
            {m.account_role()}
          </dt>
          <dd className="text-base font-bold text-ink">
            {USER_ROLE_LABELS[account.role]()}
          </dd>
        </div>
      </dl>
      <div className="flex flex-wrap gap-3">
        {account.role === USER_ROLE.OWNER && (
          <PillButton to="/owner/listings" scale="lg">
            {m.nav_my_listings()}
          </PillButton>
        )}
        <PillButton to="/list-your-place" tone="sun" scale="lg">
          {m.account_list_cta()}
        </PillButton>
        <SignOutButton />
      </div>
    </div>
  )
}
