import * as React from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createLazyFileRoute, getRouteApi } from '@tanstack/react-router'

import { ACTIVE_STATUSES, USER_ROLES } from '@aporta/shared'
import type { ActiveStatus, UserRole } from '@aporta/shared'

import { ActionButton } from '#/components/common/action-button'
import { EmptyState } from '#/components/common/empty-state'
import { PaginationNav } from '#/components/common/pagination-nav'
import { QueueSearch } from '#/components/common/queue-search'
import { SegmentedFilter } from '#/components/common/segmented-filter'
import { administratorUsersQueryOptions } from '#/integrations/tanstack-query/queries/administrator'
import { ACTIVE_STATUS_LABELS, USER_ROLE_LABELS } from '#/lib/labels'
import { m } from '#/paraglide/messages'

import { UserRow } from './-components/user-row'
import { toUsersParams } from './-search'

export const Route = createLazyFileRoute('/_private/administrator/users/')({
  component: RouteComponent,
})

const route = getRouteApi('/_private/administrator/users/')

/** "Todos" não é um valor da API: é a ausência do filtro, e tem o próprio botão. */
type RoleTab = UserRole | 'ALL'
type StatusTab = ActiveStatus | 'ALL'

/**
 * As contas da plataforma, só para o administrador: filtro de papel e de status, busca por nome
 * ou e-mail e página na URL. Cada linha leva à conta, onde se muda o papel ou se suspende.
 */
function RouteComponent(): React.JSX.Element {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const { data: users, meta } = useSuspenseQuery(
    administratorUsersQueryOptions(toUsersParams(search)),
  ).data

  let roleTab: RoleTab = 'ALL'
  if (search.role !== undefined) roleTab = search.role

  let statusTab: StatusTab = 'ALL'
  if (search.status !== undefined) statusTab = search.status

  function go(patch: {
    role?: UserRole | undefined
    status?: ActiveStatus | undefined
    page?: number
    q?: string | undefined
  }): void {
    void navigate({ search: (previous) => ({ ...previous, ...patch }) })
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-title font-extrabold tracking-tight text-ink">
          {m.staff_users_title()}
        </h1>
        <p className="text-lg text-ink-soft">{m.staff_users_lead()}</p>
      </header>

      <SegmentedFilter<RoleTab>
        label={m.staff_users_role_label()}
        value={roleTab}
        options={[
          { value: 'ALL', label: m.staff_users_filter_all() },
          ...USER_ROLES.map((value) => ({
            value,
            label: USER_ROLE_LABELS[value](),
          })),
        ]}
        onChange={(value) => {
          if (value === 'ALL') go({ role: undefined, page: undefined })
          else go({ role: value, page: undefined })
        }}
      />

      <SegmentedFilter<StatusTab>
        label={m.staff_users_status_label()}
        value={statusTab}
        options={[
          { value: 'ALL', label: m.staff_users_filter_all() },
          ...ACTIVE_STATUSES.map((value) => ({
            value,
            label: ACTIVE_STATUS_LABELS[value](),
          })),
        ]}
        onChange={(value) => {
          if (value === 'ALL') go({ status: undefined, page: undefined })
          else go({ status: value, page: undefined })
        }}
      />

      <QueueSearch
        label={m.staff_users_search_label()}
        value={search.q ?? ''}
        onSearch={(q) => go({ q, page: undefined })}
      />

      {users.length === 0 && search.q !== undefined && (
        <EmptyState
          title={m.staff_users_search_empty_title()}
          description={m.staff_users_search_empty_text({ q: search.q })}
        >
          <ActionButton
            tone="outline"
            onClick={() => go({ q: undefined, page: undefined })}
          >
            {m.staff_search_clear()}
          </ActionButton>
        </EmptyState>
      )}

      {users.length === 0 && search.q === undefined && (
        <EmptyState
          title={m.staff_users_empty_title()}
          description={m.staff_users_empty_text()}
        />
      )}

      {users.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-bold text-ink-soft" aria-live="polite">
            {m.staff_users_count({ count: meta.total })}
          </p>
          <ul className="flex flex-col gap-3">
            {users.map((user) => (
              <UserRow key={user.id} user={user} />
            ))}
          </ul>
        </div>
      )}

      <PaginationNav meta={meta} onPage={(page) => go({ page })} />
    </div>
  )
}
