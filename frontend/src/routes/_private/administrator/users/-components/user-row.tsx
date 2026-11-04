import * as React from 'react'
import { Link } from '@tanstack/react-router'

import { ACTIVE_STATUS } from '@aporta/shared'
import type { AdministratorUserShowResponse } from '@aporta/shared'

import { Badge } from '#/components/ui/badge'
import { useSession } from '#/hooks/use-session'
import { formatDate } from '#/lib/format'
import { ACTIVE_STATUS_LABELS, USER_ROLE_LABELS } from '#/lib/labels'
import { m } from '#/paraglide/messages'
import { getLocale } from '#/paraglide/runtime'

/**
 * Uma conta da lista: nome, e-mail, papel, desde quando existe e, se estiver suspensa, o aviso
 * (dito por extenso, não só pela cor). A própria conta do administrador leva "(você)", porque é
 * a única que ele não pode mudar.
 */
export function UserRow({
  user,
}: {
  user: AdministratorUserShowResponse
}): React.JSX.Element {
  const { account } = useSession()
  const suspended = user.status !== ACTIVE_STATUS.ACTIVE

  return (
    <li
      data-slot="user-row"
      className="flex flex-col gap-3 rounded-card bg-surface p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-extrabold break-words text-ink">
            {user.name}
            {account?.id === user.id && (
              <span className="font-semibold text-ink-soft">
                {' '}
                {m.staff_users_you()}
              </span>
            )}
          </h2>
          <Badge variant="outline">{USER_ROLE_LABELS[user.role]()}</Badge>
          {suspended && (
            <Badge variant="destructive">
              {ACTIVE_STATUS_LABELS[user.status]()}
            </Badge>
          )}
        </div>
        <p className="text-sm break-all text-ink-soft">{user.email}</p>
        <p className="text-sm text-ink-soft">
          {m.staff_users_since({
            date: formatDate(user.createdAt, getLocale()),
          })}
        </p>
      </div>

      <Link
        to="/administrator/users/$id"
        params={{ id: user.id }}
        aria-label={m.staff_users_manage_named({ name: user.name })}
        className="inline-flex min-h-11 shrink-0 items-center self-start rounded-full px-3 text-sm font-bold text-moss underline underline-offset-4 hover:bg-moss-wash sm:self-center"
      >
        {m.staff_users_manage()}
      </Link>
    </li>
  )
}
