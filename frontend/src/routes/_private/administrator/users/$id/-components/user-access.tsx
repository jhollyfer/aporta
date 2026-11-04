import * as React from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'

import { ACTIVE_STATUS, USER_ROLES } from '@aporta/shared'
import type { ActiveStatus, UserRole } from '@aporta/shared'

import { ActionButton } from '#/components/common/action-button'
import { ConfirmDialog } from '#/components/common/confirm-dialog'
import { PillButton } from '#/components/common/pill-button'
import { SegmentedFilter } from '#/components/common/segmented-filter'
import { Badge } from '#/components/ui/badge'
import { useSession } from '#/hooks/use-session'
import { useInvalidate } from '#/integrations/tanstack-query/invalidate'
import {
  useAdministratorUserChangeRoleMutation,
  useAdministratorUserChangeStatusMutation,
} from '#/integrations/tanstack-query/mutations/administrator'
import { administratorUserQueryOptions } from '#/integrations/tanstack-query/queries/administrator'
import { formatDate } from '#/lib/format'
import { ACTIVE_STATUS_LABELS, USER_ROLE_LABELS } from '#/lib/labels'
import { describeStaffFailure } from '#/lib/staff-failure'
import { m } from '#/paraglide/messages'
import { getLocale } from '#/paraglide/runtime'

type Outcome = 'role' | 'suspended' | 'reactivated'

const OUTCOME_MESSAGES: Record<Outcome, () => string> = {
  role: () => m.staff_user_outcome_role(),
  suspended: () => m.staff_user_outcome_suspended(),
  reactivated: () => m.staff_user_outcome_reactivated(),
}

/**
 * Uma conta para o administrador: quem é, o papel (com a troca) e o acesso (suspender ou
 * reativar). As duas ações pedem confirmação que nomeia a conta e diz a consequência (as sessões
 * abertas caem); a recusa da API (a própria conta, o último administrador, o dono com anúncio)
 * volta no diálogo. Na própria conta as ações nem aparecem: a API recusaria com 409
 * (`DECISIONS.md` #36).
 */
export function UserAccess({ id }: { id: string }): React.JSX.Element {
  const invalidate = useInvalidate()
  const { account } = useSession()
  const user = useSuspenseQuery(administratorUserQueryOptions(id)).data
  const [chosen, setChosen] = React.useState<UserRole | undefined>(undefined)
  const [outcome, setOutcome] = React.useState<Outcome | undefined>(undefined)
  const [roleFailure, setRoleFailure] = React.useState('')
  const [statusFailure, setStatusFailure] = React.useState('')

  const changeRole = useAdministratorUserChangeRoleMutation()
  const changeStatus = useAdministratorUserChangeStatusMutation()
  const busy = changeRole.isPending || changeStatus.isPending

  const own = account?.id === user.id
  const suspended = user.status !== ACTIVE_STATUS.ACTIVE
  const target = chosen ?? user.role

  // Suspender e reativar são o mesmo diálogo com outro texto e outro destino.
  let nextStatus: ActiveStatus = ACTIVE_STATUS.INACTIVE
  let accessText = m.staff_user_access_text_active()
  let accessTitle = m.staff_user_suspend_title({ name: user.name })
  let accessConfirmText = m.staff_user_suspend_text()
  let accessConfirm = m.staff_user_suspend_confirm()
  let accessTrigger = m.staff_user_suspend()
  let accessTone: 'danger' | 'moss' = 'danger'
  let accessOutcome: Outcome = 'suspended'
  let statusVariant: 'secondary' | 'destructive' = 'secondary'

  if (suspended) {
    nextStatus = ACTIVE_STATUS.ACTIVE
    accessText = m.staff_user_access_text_suspended()
    accessTitle = m.staff_user_reactivate_title({ name: user.name })
    accessConfirmText = m.staff_user_reactivate_text()
    accessConfirm = m.staff_user_reactivate_confirm()
    accessTrigger = m.staff_user_reactivate()
    accessTone = 'moss'
    accessOutcome = 'reactivated'
    statusVariant = 'destructive'
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-3">
        <PillButton
          to="/administrator/users"
          tone="link"
          className="self-start"
        >
          {m.staff_user_back()}
        </PillButton>
        <h1 className="text-title font-extrabold tracking-tight break-words text-ink">
          {user.name}
        </h1>
        <p className="text-base break-all text-ink-soft">{user.email}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{USER_ROLE_LABELS[user.role]()}</Badge>
          <Badge variant={statusVariant}>
            {ACTIVE_STATUS_LABELS[user.status]()}
          </Badge>
          <span className="text-sm text-ink-soft">
            {m.staff_users_since({
              date: formatDate(user.createdAt, getLocale()),
            })}
          </span>
        </div>
      </header>

      {outcome !== undefined && (
        <p
          role="status"
          className="rounded-xl bg-moss-wash px-4 py-3 text-sm font-bold text-moss-deep"
        >
          {OUTCOME_MESSAGES[outcome]()}
        </p>
      )}

      {own && (
        <p className="rounded-xl bg-clay-wash px-4 py-3 text-sm font-bold text-ink">
          {m.staff_user_own_notice()}
        </p>
      )}

      {!own && (
        <>
          <section
            aria-labelledby="user-role-title"
            className="flex flex-col gap-4 rounded-card bg-surface p-5 sm:p-6"
          >
            <div className="flex flex-col gap-1">
              <h2
                id="user-role-title"
                className="text-xl font-extrabold text-ink"
              >
                {m.staff_user_role_title()}
              </h2>
              <p className="text-base text-ink-soft">
                {m.staff_user_role_text()}
              </p>
            </div>
            <SegmentedFilter<UserRole>
              label={m.staff_users_role_label()}
              value={target}
              options={USER_ROLES.map((value) => ({
                value,
                label: USER_ROLE_LABELS[value](),
              }))}
              onChange={setChosen}
            />
            <ConfirmDialog
              title={m.staff_user_role_confirm_title({
                name: user.name,
                role: USER_ROLE_LABELS[target](),
              })}
              description={m.staff_user_role_confirm_text()}
              confirmLabel={m.staff_user_role_confirm()}
              cancelLabel={m.staff_user_keep()}
              error={roleFailure}
              pending={changeRole.isPending}
              onConfirm={(close) => {
                setRoleFailure('')
                changeRole.mutate(
                  { id: user.id, role: target },
                  {
                    async onSuccess() {
                      await invalidate('administrator.users')
                      close()
                      setChosen(undefined)
                      setOutcome('role')
                    },
                    onError: (error) =>
                      setRoleFailure(describeStaffFailure(error).general),
                  },
                )
              }}
              renderTrigger={(open) => (
                <ActionButton
                  tone="outline"
                  disabled={busy || target === user.role}
                  onClick={() => {
                    setRoleFailure('')
                    open()
                  }}
                  className="self-start"
                >
                  {m.staff_user_role_change()}
                </ActionButton>
              )}
            />
          </section>

          <section
            aria-labelledby="user-access-title"
            className="flex flex-col gap-4 rounded-card bg-surface p-5 sm:p-6"
          >
            <div className="flex flex-col gap-1">
              <h2
                id="user-access-title"
                className="text-xl font-extrabold text-ink"
              >
                {m.staff_user_access_title()}
              </h2>
              <p className="text-base text-ink-soft">{accessText}</p>
            </div>
            <ConfirmDialog
              title={accessTitle}
              description={accessConfirmText}
              confirmLabel={accessConfirm}
              cancelLabel={m.staff_user_keep()}
              error={statusFailure}
              pending={changeStatus.isPending}
              onConfirm={(close) => {
                setStatusFailure('')
                changeStatus.mutate(
                  { id: user.id, status: nextStatus },
                  {
                    async onSuccess() {
                      await invalidate('administrator.users')
                      close()
                      setOutcome(accessOutcome)
                    },
                    onError: (error) =>
                      setStatusFailure(describeStaffFailure(error).general),
                  },
                )
              }}
              renderTrigger={(open) => (
                <ActionButton
                  tone={accessTone}
                  disabled={busy}
                  onClick={() => {
                    setStatusFailure('')
                    open()
                  }}
                  className="self-start"
                >
                  {accessTrigger}
                </ActionButton>
              )}
            />
          </section>
        </>
      )}
    </div>
  )
}
