import * as React from 'react'
import { Check, Prohibit } from '@phosphor-icons/react'
import { useNavigate } from '@tanstack/react-router'

import {
  LISTING_REVIEW_DECISION,
  LISTING_STATUS,
  USER_ROLE,
} from '@aporta/shared'
import type { AdministratorListingShowResponse } from '@aporta/shared'

import { Button } from '#/components/ui/button'
import { ActionButton } from '#/components/common/action-button'
import { ConfirmDialog } from '#/components/common/confirm-dialog'
import { FormNotice } from '#/components/common/form-notice'
import { NoteDialog } from '#/components/common/note-dialog'
import { PillButton } from '#/components/common/pill-button'
import { useSession } from '#/hooks/use-session'
import { useInvalidate } from '#/integrations/tanstack-query/invalidate'
import {
  useAdministratorListingArchiveMutation,
  useAdministratorListingDeleteMutation,
  useAdministratorListingReviewMutation,
} from '#/integrations/tanstack-query/mutations/administrator'
import { formatDateTime } from '#/lib/format'
import { describeStaffFailure } from '#/lib/staff-failure'
import { m } from '#/paraglide/messages'
import { getLocale } from '#/paraglide/runtime'

type Outcome = 'approved' | 'refused' | 'archived'

const OUTCOME_MESSAGES: Record<Outcome, () => string> = {
  approved: () => m.staff_outcome_approved(),
  refused: () => m.staff_outcome_refused(),
  archived: () => m.staff_outcome_archived(),
}

/** O que a equipe lê sobre o estado atual, antes de qualquer botão. */
const STATE_TEXT: Record<
  AdministratorListingShowResponse['status'],
  () => string
> = {
  PENDING: () => m.staff_state_pending(),
  DRAFT: () => m.staff_state_draft(),
  PUBLISHED: () => m.staff_state_published(),
  ARCHIVED: () => m.staff_state_archived(),
}

/**
 * A decisão sobre o anúncio. As ações dependem do estado, e só as que a API aceita
 * aparecem: aprovar e recusar são da fila de análise (`PENDING`), e arquivar serve a qualquer
 * anúncio que ainda não saiu do ar. Um anúncio `DRAFT` espera o dono, e a equipe só vê o
 * motivo que mandou.
 *
 * Recusar pede o motivo (3 a 500) num diálogo com contador, e o erro de motivo volta ao campo.
 * Arquivar pede confirmação que nomeia o anúncio. "Excluir de vez" só aparece para o
 * `ADMINISTRATOR` e só no anúncio arquivado (a API recusa o resto, `DECISIONS.md` #34); pede
 * confirmação que diz que não tem volta e, apagado, a tela volta para a fila: o anúncio que
 * ela mostra já não existe. Depois de qualquer decisão a tela diz o
 * que aconteceu (`role="status"`) e a fila, a vitrine e a lista do dono refazem.
 */
export function DecisionPanel({
  listing,
}: {
  listing: AdministratorListingShowResponse
}): React.JSX.Element {
  const invalidate = useInvalidate()
  const navigate = useNavigate()
  const { account } = useSession()
  const [outcome, setOutcome] = React.useState<Outcome | undefined>(undefined)
  const [failure, setFailure] = React.useState('')
  const [archiveFailure, setArchiveFailure] = React.useState('')
  const [deleteFailure, setDeleteFailure] = React.useState('')
  const [refuseFailure, setRefuseFailure] = React.useState('')

  const review = useAdministratorListingReviewMutation()
  const archive = useAdministratorListingArchiveMutation()
  const remove = useAdministratorListingDeleteMutation()
  const busy = review.isPending || archive.isPending || remove.isPending

  const refreshAll = (): Promise<unknown> =>
    Promise.all([
      invalidate('administrator.listings'),
      invalidate('storefront.listings'),
      invalidate('owner.listings'),
    ])

  function approve(): void {
    setOutcome(undefined)
    setFailure('')
    review.mutate(
      { id: listing.id, decision: LISTING_REVIEW_DECISION.APPROVE },
      {
        async onSuccess() {
          await refreshAll()
          setOutcome('approved')
        },
        async onError(error) {
          setFailure(describeStaffFailure(error).general)
          // 409: outra pessoa decidiu antes. Refaz a tela para mostrar o estado de agora.
          await invalidate('administrator.listings')
        },
      },
    )
  }

  const canDecide = listing.status === LISTING_STATUS.PENDING
  const canDelete =
    account?.role === USER_ROLE.ADMINISTRATOR &&
    listing.status === LISTING_STATUS.ARCHIVED
  const canArchive =
    listing.status !== LISTING_STATUS.ARCHIVED && outcome !== 'archived'

  return (
    <div className="flex flex-col gap-4">
      <p className="text-base font-bold text-ink">
        {STATE_TEXT[listing.status]()}
      </p>

      {listing.review !== null && (
        <div className="flex flex-col gap-1 rounded-xl bg-paper p-4">
          <p className="text-sm font-bold text-ink-soft">
            {m.staff_last_decision({
              date: formatDateTime(listing.review.reviewedAt, getLocale()),
            })}
          </p>
          {listing.review.note !== null && (
            <p className="text-base break-words whitespace-pre-line text-ink">
              {listing.review.note}
            </p>
          )}
        </div>
      )}

      {canDecide && (
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <ActionButton
            scale="lg"
            pending={
              review.isPending && review.variables.decision === 'APPROVE'
            }
            disabled={busy}
            onClick={approve}
            className="w-full sm:w-auto"
          >
            <Check aria-hidden weight="bold" className="size-5" />
            {m.staff_approve()}
          </ActionButton>
          <NoteDialog
            title={m.staff_refuse_title({ title: listing.title })}
            description={m.staff_refuse_text()}
            label={m.staff_refuse_label()}
            hint={m.staff_refuse_hint()}
            submitLabel={m.staff_refuse_submit()}
            tone="danger"
            pending={review.isPending}
            error={refuseFailure}
            onReset={() => setRefuseFailure('')}
            onSubmit={(note, { close, setNoteError }) => {
              setOutcome(undefined)
              setRefuseFailure('')
              review.mutate(
                {
                  id: listing.id,
                  decision: LISTING_REVIEW_DECISION.REFUSE,
                  note,
                },
                {
                  async onSuccess() {
                    await refreshAll()
                    close()
                    setOutcome('refused')
                  },
                  onError(error) {
                    const described = describeStaffFailure(error)
                    if (described.note !== undefined) {
                      setNoteError(described.note)
                    }
                    setRefuseFailure(described.general)
                  },
                },
              )
            }}
            renderTrigger={(open) => (
              <ActionButton
                tone="outline"
                scale="lg"
                disabled={busy}
                onClick={open}
                className="w-full sm:w-auto"
              >
                <Prohibit aria-hidden weight="bold" className="size-5" />
                {m.staff_refuse()}
              </ActionButton>
            )}
          />
        </div>
      )}

      <FormNotice>{failure}</FormNotice>

      {outcome !== undefined && (
        <p
          role="status"
          className="rounded-xl bg-moss-wash px-4 py-3 text-sm font-bold text-moss-deep"
        >
          {OUTCOME_MESSAGES[outcome]()}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {listing.status === LISTING_STATUS.PUBLISHED && (
          <PillButton
            to="/listings/$slug"
            params={{ slug: listing.slug }}
            tone="link"
          >
            {m.owner_listings_view()}
          </PillButton>
        )}
        {canArchive && (
          <ConfirmDialog
            title={m.owner_listings_archive_title({ title: listing.title })}
            description={m.staff_archive_text()}
            confirmLabel={m.owner_listings_archive_confirm()}
            cancelLabel={m.owner_listings_archive_keep()}
            error={archiveFailure}
            pending={archive.isPending}
            onConfirm={(close) => {
              setOutcome(undefined)
              setArchiveFailure('')
              archive.mutate(listing.id, {
                async onSuccess() {
                  await refreshAll()
                  close()
                  setOutcome('archived')
                },
                onError: (error) =>
                  setArchiveFailure(describeStaffFailure(error).general),
              })
            }}
            renderTrigger={(open) => (
              <Button
                variant="ghost"
                type="button"
                disabled={busy}
                onClick={() => {
                  setArchiveFailure('')
                  open()
                }}
                className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-bold text-danger underline underline-offset-4 hover:bg-clay-wash disabled:opacity-60"
              >
                {m.owner_listings_archive()}
              </Button>
            )}
          />
        )}
        {canDelete && (
          <ConfirmDialog
            title={m.staff_delete_title({ title: listing.title })}
            description={m.staff_delete_text()}
            confirmLabel={m.staff_delete_confirm()}
            cancelLabel={m.staff_delete_keep()}
            error={deleteFailure}
            pending={remove.isPending}
            onConfirm={() => {
              setDeleteFailure('')
              remove.mutate(listing.id, {
                async onSuccess() {
                  // Sai da tela antes de refazer as consultas: o detalhe que ela lê já não existe.
                  await navigate({ to: '/administrator/listings' })
                  await refreshAll()
                },
                onError: (error) =>
                  setDeleteFailure(describeStaffFailure(error).general),
              })
            }}
            renderTrigger={(open) => (
              <Button
                variant="ghost"
                type="button"
                disabled={busy}
                onClick={() => {
                  setDeleteFailure('')
                  open()
                }}
                className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-bold text-danger underline underline-offset-4 hover:bg-clay-wash disabled:opacity-60"
              >
                {m.staff_delete()}
              </Button>
            )}
          />
        )}
      </div>
    </div>
  )
}
