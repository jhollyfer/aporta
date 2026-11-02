import * as React from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createLazyFileRoute, getRouteApi } from '@tanstack/react-router'

import { REPORT_STATUS } from '@aporta/shared'
import type { ReportStatus } from '@aporta/shared'

import { ActionButton } from '#/components/common/action-button'
import { EmptyState } from '#/components/common/empty-state'
import { PaginationNav } from '#/components/common/pagination-nav'
import { SegmentedFilter } from '#/components/common/segmented-filter'
import { administratorReportsQueryOptions } from '#/integrations/tanstack-query/queries/administrator'
import { REPORT_STATUS_LABELS } from '#/lib/labels'
import { m } from '#/paraglide/messages'

import { ReportRow } from './-components/report-row'
import { DEFAULT_REPORT_STATUS, toReportParams } from './-search'

export const Route = createLazyFileRoute('/_private/administrator/reports/')({
  component: RouteComponent,
})

const route = getRouteApi('/_private/administrator/reports/')

const FILTER_ORDER = [
  REPORT_STATUS.OPEN,
  REPORT_STATUS.RESOLVED,
] as const satisfies ReadonlyArray<ReportStatus>

const OTHER: Record<ReportStatus, ReportStatus> = {
  OPEN: REPORT_STATUS.RESOLVED,
  RESOLVED: REPORT_STATUS.OPEN,
}

const EMPTY_TITLE: Record<ReportStatus, () => string> = {
  OPEN: () => m.staff_reports_empty_open_title(),
  RESOLVED: () => m.staff_reports_empty_resolved_title(),
}

const EMPTY_TEXT: Record<ReportStatus, () => string> = {
  OPEN: () => m.staff_reports_empty_open_text(),
  RESOLVED: () => m.staff_reports_empty_resolved_text(),
}

/**
 * As denúncias de anúncio: abertas primeiro, com o motivo, o texto do visitante e o caminho
 * para o anúncio. Resolver pede uma nota (o registro do que a equipe achou), e a confirmação
 * fica aqui em cima, na lista, porque a linha resolvida sai do filtro "abertas" assim que a
 * fila refaz, e uma mensagem dentro dela sumiria junto.
 */
function RouteComponent(): React.JSX.Element {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const status = search.status ?? DEFAULT_REPORT_STATUS
  const [resolved, setResolved] = React.useState(false)
  const { data: reports, meta } = useSuspenseQuery(
    administratorReportsQueryOptions(toReportParams(search)),
  ).data

  function go(patch: { status?: ReportStatus; page?: number }): void {
    setResolved(false)
    void navigate({ search: (previous) => ({ ...previous, ...patch }) })
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-title font-extrabold tracking-tight text-ink">
          {m.staff_reports_title()}
        </h1>
        <p className="text-lg text-ink-soft">{m.staff_reports_lead()}</p>
      </header>

      <SegmentedFilter
        label={m.staff_reports_filter_label()}
        value={status}
        options={FILTER_ORDER.map((value) => ({
          value,
          label: REPORT_STATUS_LABELS[value](),
        }))}
        onChange={(value) => go({ status: value, page: undefined })}
      />

      {resolved && (
        <p
          role="status"
          className="rounded-xl bg-moss-wash px-4 py-3 text-sm font-bold text-moss-deep"
        >
          {m.staff_reports_resolved()}
        </p>
      )}

      {reports.length === 0 && (
        <EmptyState
          title={EMPTY_TITLE[status]()}
          description={EMPTY_TEXT[status]()}
        >
          <ActionButton
            tone="outline"
            onClick={() => go({ status: OTHER[status], page: undefined })}
          >
            {REPORT_STATUS_LABELS[OTHER[status]]()}
          </ActionButton>
        </EmptyState>
      )}

      {reports.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-bold text-ink-soft" aria-live="polite">
            {m.staff_reports_count({ count: meta.total })}
          </p>
          <ul className="flex flex-col gap-3">
            {reports.map((report) => (
              <ReportRow
                key={report.id}
                report={report}
                onResolved={() => setResolved(true)}
              />
            ))}
          </ul>
        </div>
      )}

      <PaginationNav meta={meta} onPage={(page) => go({ page })} />
    </div>
  )
}
