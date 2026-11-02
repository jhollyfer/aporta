import * as React from 'react'
import { SealCheck, SealWarning, UserCircle } from '@phosphor-icons/react'

import type { AdministratorListingShowResponse } from '@aporta/shared'

import { ActionButton } from '#/components/common/action-button'
import { FormNotice } from '#/components/common/form-notice'
import { VerifiedMark } from '#/components/common/verified-mark'
import { useInvalidate } from '#/integrations/tanstack-query/invalidate'
import { useAdministratorOwnerVerifyMutation } from '#/integrations/tanstack-query/mutations/administrator'
import { describeStaffFailure } from '#/lib/staff-failure'
import { m } from '#/paraglide/messages'

type Account = NonNullable<AdministratorListingShowResponse['account']>

/**
 * O dono por trás do anúncio e o selo "dono verificado". O selo é da **conta** e não do
 * anúncio: vale para todos os anúncios dela, e é por isso que a ação mora aqui e fala em
 * "este dono". A resposta do clique aparece em `role="status"`, porque a mudança é só um
 * selo ao lado do nome e passaria despercebida.
 *
 * Invalida a fila e a vitrine: o selo está nas duas (linha da fila, cartão do dono do
 * visitante).
 */
export function OwnerSeal({
  account,
}: {
  account: Account
}): React.JSX.Element {
  const invalidate = useInvalidate()
  const [message, setMessage] = React.useState('')
  const [failure, setFailure] = React.useState('')
  const verify = useAdministratorOwnerVerifyMutation()

  function toggle(): void {
    const verified = !account.verified

    setMessage('')
    setFailure('')
    verify.mutate(
      { id: account.id, verified },
      {
        async onSuccess() {
          await Promise.all([
            invalidate('administrator.listings'),
            invalidate('storefront.listings'),
          ])
          let done = m.staff_seal_removed()
          if (verified) done = m.staff_seal_granted()
          setMessage(done)
        },
        onError: (error) => setFailure(describeStaffFailure(error).general),
      },
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <UserCircle
          aria-hidden
          weight="duotone"
          className="size-12 shrink-0 text-moss"
        />
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-base font-extrabold break-words text-ink">
            {account.name}
          </p>
          <p className="text-sm text-ink-soft [overflow-wrap:anywhere]">
            {account.email}
          </p>
          {account.verified && <VerifiedMark />}
          {!account.verified && (
            <p className="inline-flex items-center gap-1 text-xs font-bold text-ink-soft">
              <SealWarning aria-hidden weight="bold" className="size-4" />
              {m.staff_seal_not_verified()}
            </p>
          )}
        </div>
      </div>
      <p className="text-sm text-ink-soft">{m.staff_seal_hint()}</p>
      <ActionButton
        tone="outline"
        pending={verify.isPending}
        onClick={toggle}
        className="self-start"
      >
        {!account.verified && (
          <SealCheck aria-hidden weight="bold" className="size-5" />
        )}
        {account.verified && m.staff_seal_remove()}
        {!account.verified && m.staff_seal_grant()}
      </ActionButton>
      <FormNotice>{failure}</FormNotice>
      {message !== '' && (
        <p
          role="status"
          className="rounded-xl bg-moss-wash px-4 py-3 text-sm font-bold text-moss-deep"
        >
          {message}
        </p>
      )}
    </div>
  )
}
