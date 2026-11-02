import * as React from 'react'
import { ArrowSquareOut, Flag, Warning } from '@phosphor-icons/react'
import { Link } from '@tanstack/react-router'

import { REPORT_REASON, REPORT_STATUS } from '@aporta/shared'
import type { AdministratorReportShowResponse } from '@aporta/shared'

import { NoteDialog } from '#/components/common/note-dialog'
import { ActionButton } from '#/components/common/action-button'
import { useInvalidate } from '#/integrations/tanstack-query/invalidate'
import { useAdministratorReportResolveMutation } from '#/integrations/tanstack-query/mutations/administrator'
import { cn } from '#/lib/cn'
import { formatDateTime } from '#/lib/format'
import { REPORT_REASON_LABELS } from '#/lib/labels'
import { describeStaffFailure } from '#/lib/staff-failure'
import { m } from '#/paraglide/messages'
import { getLocale } from '#/paraglide/runtime'

type ReportRowProps = {
  report: AdministratorReportShowResponse
  onResolved: () => void
}

/**
 * Uma denúncia: o motivo, o que o visitante escreveu, de onde veio (o pedaço do hash, só
 * para ver que três denúncias são do mesmo lugar) e o caminho para o anúncio. Golpe tem o
 * tom de barro e o ícone de alerta: é o motivo que a equipe olha primeiro, e o texto do
 * motivo continua dito por extenso para quem não vê a cor.
 *
 * "Abrir anúncio" leva à revisão da equipe (que mostra qualquer estado), e não à página
 * pública, que responde 404 a um anúncio já retirado.
 */
export function ReportRow({
  report,
  onResolved,
}: ReportRowProps): React.JSX.Element {
  const invalidate = useInvalidate()
  const [failure, setFailure] = React.useState('')
  const resolve = useAdministratorReportResolveMutation()
  const scam = report.reason === REPORT_REASON.SCAM
  const open = report.status === REPORT_STATUS.OPEN
  let ReasonIcon = Flag
  if (scam) ReasonIcon = Warning

  return (
    <li
      data-slot="report-row"
      className="flex flex-col gap-3 rounded-card bg-surface p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold',
            scam && 'bg-clay-wash text-ink',
            !scam && 'bg-line/60 text-ink',
          )}
        >
          <ReasonIcon aria-hidden weight="bold" className="size-4" />
          {REPORT_REASON_LABELS[report.reason]()}
        </span>
        <p className="text-sm text-ink-soft">
          {formatDateTime(report.createdAt, getLocale())}
          {report.reporter !== null && (
            <>
              {' · '}
              {m.staff_reports_origin({ origin: report.reporter })}
            </>
          )}
        </p>
      </div>

      <Link
        to="/administrator/listings/$id"
        params={{ id: report.listing.id }}
        className="inline-flex min-h-11 max-w-full items-center gap-2 self-start text-base font-extrabold text-moss underline underline-offset-4"
      >
        <span className="min-w-0 break-words">{report.listing.title}</span>
        <ArrowSquareOut aria-hidden weight="bold" className="size-4 shrink-0" />
        <span className="sr-only">{m.staff_reports_open_listing()}</span>
      </Link>

      {report.details !== null && (
        <p className="text-base break-words whitespace-pre-line text-ink">
          {report.details}
        </p>
      )}
      {report.details === null && (
        <p className="text-sm text-ink-soft">{m.staff_reports_no_details()}</p>
      )}

      {!open && (
        <div className="flex flex-col gap-1 rounded-xl bg-paper p-4">
          <p className="text-sm font-bold text-ink-soft">
            {m.staff_reports_resolved_on({
              date: formatDateTime(
                report.resolvedAt ?? report.createdAt,
                getLocale(),
              ),
            })}
          </p>
          {report.resolutionNote !== null && (
            <p className="text-base break-words whitespace-pre-line text-ink">
              {report.resolutionNote}
            </p>
          )}
        </div>
      )}

      {open && (
        <NoteDialog
          title={m.staff_resolve_title()}
          description={m.staff_resolve_text({ title: report.listing.title })}
          label={m.staff_resolve_label()}
          hint={m.staff_resolve_hint()}
          submitLabel={m.staff_resolve_submit()}
          pending={resolve.isPending}
          error={failure}
          onReset={() => setFailure('')}
          onSubmit={(note, { close, setNoteError }) => {
            setFailure('')
            resolve.mutate(
              { id: report.id, note },
              {
                async onSuccess() {
                  await invalidate('administrator.reports')
                  close()
                  onResolved()
                },
                onError(error) {
                  const described = describeStaffFailure(error)
                  if (described.note !== undefined) setNoteError(described.note)
                  setFailure(described.general)
                },
              },
            )
          }}
          renderTrigger={(openDialog) => (
            <ActionButton
              tone="outline"
              onClick={openDialog}
              className="self-start"
            >
              {m.staff_resolve()}
            </ActionButton>
          )}
        />
      )}
    </li>
  )
}
