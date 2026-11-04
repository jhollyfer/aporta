import * as React from 'react'
import { ArrowCounterClockwise, MapPin, Clock } from '@phosphor-icons/react'
import { Link } from '@tanstack/react-router'

import { USER_ROLE } from '@aporta/shared'
import type { AdministratorPlaceShowResponse } from '@aporta/shared'

import { ActionButton } from '#/components/common/action-button'
import { ConfirmDialog } from '#/components/common/confirm-dialog'
import { FormNotice } from '#/components/common/form-notice'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { useSession } from '#/hooks/use-session'
import { useInvalidate } from '#/integrations/tanstack-query/invalidate'
import {
  useAdministratorPlaceArchiveMutation,
  useAdministratorPlaceDeleteMutation,
  useAdministratorPlaceUnarchiveMutation,
} from '#/integrations/tanstack-query/mutations/administrator'
import { formatDate } from '#/lib/format'
import { PLACE_CATEGORY_LABELS } from '#/lib/labels'
import { describeStaffFailure } from '#/lib/staff-failure'
import { m } from '#/paraglide/messages'
import { getLocale } from '#/paraglide/runtime'

/** O que a equipe fez com um lugar, para a lista dizer em cima (a linha some do filtro ao refazer). */
export type PlaceOutcome = 'archived' | 'restored' | 'deleted'

const DANGER_LINK =
  'inline-flex min-h-11 items-center rounded-full px-3 text-sm font-bold text-danger underline underline-offset-4 hover:bg-clay-wash disabled:opacity-60'

/**
 * Uma linha do guia: nome, aba, onde fica e quando abre, e as ações que o estado do lugar
 * permite. No ar: editar e arquivar. Arquivado: restaurar e, só para o `ADMINISTRATOR`, excluir
 * de vez (a API recusa o resto com 403, `DECISIONS.md` #35). Arquivar e excluir pedem confirmação
 * que nomeia o lugar; a falha volta no diálogo, e depois do sucesso a lista, a vitrine e o
 * painel refazem.
 */
export function PlaceRow({
  place,
  onOutcome,
}: {
  place: AdministratorPlaceShowResponse
  onOutcome: (outcome: PlaceOutcome) => void
}): React.JSX.Element {
  const invalidate = useInvalidate()
  const { account } = useSession()
  const [archiveFailure, setArchiveFailure] = React.useState('')
  const [deleteFailure, setDeleteFailure] = React.useState('')
  const [restoreFailure, setRestoreFailure] = React.useState('')

  const archive = useAdministratorPlaceArchiveMutation()
  const unarchive = useAdministratorPlaceUnarchiveMutation()
  const remove = useAdministratorPlaceDeleteMutation()
  const busy = archive.isPending || unarchive.isPending || remove.isPending

  const archived = place.archivedAt !== null
  const canDelete = archived && account?.role === USER_ROLE.ADMINISTRATOR

  const refreshAll = (): Promise<unknown> =>
    Promise.all([
      invalidate('administrator.places'),
      invalidate('storefront.places'),
    ])

  function restore(): void {
    setRestoreFailure('')
    unarchive.mutate(place.id, {
      async onSuccess() {
        await refreshAll()
        onOutcome('restored')
      },
      async onError(error) {
        setRestoreFailure(describeStaffFailure(error).general)
        await invalidate('administrator.places')
      },
    })
  }

  return (
    <li
      data-slot="place-row"
      className="flex flex-col gap-3 rounded-card bg-surface p-4 sm:flex-row sm:items-start sm:justify-between"
    >
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-extrabold break-words text-ink">
            {place.name}
          </h2>
          <Badge variant="outline">
            {PLACE_CATEGORY_LABELS[place.category]()}
          </Badge>
        </div>
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-soft">
          <span className="inline-flex items-center gap-1">
            <MapPin aria-hidden className="size-4" />
            {place.address}, {place.neighborhood.name}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock aria-hidden className="size-4" />
            {place.hours}
          </span>
          {place.date !== null && (
            <time dateTime={place.date} className="font-bold">
              {formatDate(place.date, getLocale())}
            </time>
          )}
        </p>
        <FormNotice>{restoreFailure}</FormNotice>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1">
        {!archived && (
          <>
            <Link
              to="/administrator/places/$id"
              params={{ id: place.id }}
              aria-label={m.staff_places_edit_named({ name: place.name })}
              className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-bold text-moss underline underline-offset-4 hover:bg-moss-wash"
            >
              {m.staff_places_edit()}
            </Link>
            <ConfirmDialog
              title={m.staff_places_archive_title({ name: place.name })}
              description={m.staff_places_archive_text()}
              confirmLabel={m.staff_places_archive_confirm()}
              cancelLabel={m.staff_places_archive_keep()}
              error={archiveFailure}
              pending={archive.isPending}
              onConfirm={(close) => {
                setArchiveFailure('')
                archive.mutate(place.id, {
                  async onSuccess() {
                    await refreshAll()
                    close()
                    onOutcome('archived')
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
                  className={DANGER_LINK}
                >
                  {m.staff_places_archive()}
                </Button>
              )}
            />
          </>
        )}
        {archived && (
          <ActionButton
            tone="outline"
            pending={unarchive.isPending}
            disabled={busy}
            onClick={restore}
            aria-label={m.staff_places_restore_named({ name: place.name })}
          >
            <ArrowCounterClockwise
              aria-hidden
              weight="bold"
              className="size-4"
            />
            {m.staff_places_restore()}
          </ActionButton>
        )}
        {canDelete && (
          <ConfirmDialog
            title={m.staff_places_delete_title({ name: place.name })}
            description={m.staff_places_delete_text()}
            confirmLabel={m.staff_places_delete_confirm()}
            cancelLabel={m.staff_places_delete_keep()}
            error={deleteFailure}
            pending={remove.isPending}
            onConfirm={(close) => {
              setDeleteFailure('')
              remove.mutate(place.id, {
                async onSuccess() {
                  await refreshAll()
                  close()
                  onOutcome('deleted')
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
                className={DANGER_LINK}
              >
                {m.staff_places_delete()}
              </Button>
            )}
          />
        )}
      </div>
    </li>
  )
}
