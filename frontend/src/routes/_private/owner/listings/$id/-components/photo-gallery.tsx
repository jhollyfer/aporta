import * as React from 'react'

import type { OwnerListingShowResponse } from '@aporta/shared'

import { ConfirmDialog } from '#/components/common/confirm-dialog'
import { ListingPhoto } from '#/components/common/listing-photo'
import { Button } from '#/components/ui/button'
import { useInvalidate } from '#/integrations/tanstack-query/invalidate'
import {
  useOwnerListingPhotoDeleteMutation,
  useOwnerListingPhotoReorderMutation,
} from '#/integrations/tanstack-query/mutations/owner-listings'
import { PHOTO_ENVIRONMENT_LABELS } from '#/lib/labels'
import { ownerFailureMessage } from '#/lib/owner-failure'
import { movePhoto } from '#/lib/photo-order'
import type { PhotoMove } from '#/lib/photo-order'
import { m } from '#/paraglide/messages'

type OwnerPhoto = OwnerListingShowResponse['photos'][number]

const CONTROL_CLASS =
  'inline-flex min-h-11 flex-1 items-center justify-center rounded-full px-3 text-sm font-bold text-moss underline underline-offset-4 hover:bg-moss-wash disabled:opacity-40'

/**
 * As fotos que o anúncio já tem, com o que o dono pode fazer em cada uma: subir, descer e
 * remover. Reordenar é por botão com rótulo (teclado e leitor de tela), sem arrastar: cada
 * botão nomeia a foto pela posição e pelo ambiente. A primeira é a capa.
 *
 * O servidor é a fonte da ordem: depois de cada ação a tela refaz o anúncio (`owner.listings`)
 * em vez de mexer na lista local, e o `role="status"` anuncia o resultado. Um erro (foto que
 * já saiu, ordem que mudou em outra aba) também refaz o anúncio, para a tela voltar a dizer o
 * que existe. Remover pede confirmação que nomeia a consequência (`_standards/frontend.md`
 * §10.6) e só fecha quando o servidor responde.
 */
export function PhotoGallery({
  listing,
}: {
  listing: OwnerListingShowResponse
}): React.JSX.Element {
  const invalidate = useInvalidate()
  const [message, setMessage] = React.useState('')
  const [failure, setFailure] = React.useState<string | undefined>(undefined)
  const reorder = useOwnerListingPhotoReorderMutation()
  const remove = useOwnerListingPhotoDeleteMutation()

  const ids = listing.photos.map((photo) => photo.id)
  const busy = reorder.isPending || remove.isPending

  function label(
    photo: OwnerPhoto,
    index: number,
  ): { position: string; environment: string } {
    return {
      position: String(index + 1),
      environment: PHOTO_ENVIRONMENT_LABELS[photo.environment](),
    }
  }

  function move(index: number, direction: PhotoMove): void {
    const photoIds = movePhoto(ids, index, direction)

    if (photoIds === undefined) return

    setMessage('')
    setFailure(undefined)
    reorder.mutate(
      { id: listing.id, photoIds },
      {
        async onSuccess() {
          await invalidate('owner.listings')
          setMessage(
            m.owner_edit_photo_moved({
              position: photoIds.indexOf(ids[index] ?? '') + 1,
              total: photoIds.length,
            }),
          )
        },
        async onError(error) {
          setFailure(ownerFailureMessage(error))
          await invalidate('owner.listings')
        },
      },
    )
  }

  function confirmRemoval(photo: OwnerPhoto, close: () => void): void {
    setMessage('')
    setFailure(undefined)
    remove.mutate(
      { id: listing.id, photoId: photo.id },
      {
        async onSuccess() {
          await invalidate('owner.listings')
          close()
          setMessage(m.owner_edit_photo_removed())
        },
        async onError(error) {
          setFailure(ownerFailureMessage(error))
          await invalidate('owner.listings')
        },
      },
    )
  }

  if (listing.photos.length === 0) return <></>

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-ink-soft">
        {m.owner_edit_photos_order_hint()}
      </p>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {listing.photos.map((photo, index) => {
          const names = label(photo, index)

          return (
            <li
              key={photo.id}
              data-slot="owner-photo"
              className="flex flex-col gap-2 rounded-xl bg-paper p-2"
            >
              <div className="aspect-[4/3] overflow-hidden rounded-lg">
                <ListingPhoto
                  photo={photo}
                  listingType={listing.type}
                  title={listing.title}
                />
              </div>
              <p className="text-xs font-bold text-ink-soft">
                {m.owner_edit_photo_position({
                  position: index + 1,
                  total: listing.photos.length,
                  environment: PHOTO_ENVIRONMENT_LABELS[photo.environment](),
                })}
                {index === 0 && ` · ${m.owner_edit_photo_cover()}`}
              </p>
              <div className="flex flex-wrap items-stretch gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busy || index === 0}
                  onClick={() => move(index, 'up')}
                  aria-label={m.owner_edit_photo_up_named(names)}
                  className={CONTROL_CLASS}
                >
                  {m.owner_edit_photo_up()}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busy || index === listing.photos.length - 1}
                  onClick={() => move(index, 'down')}
                  aria-label={m.owner_edit_photo_down_named(names)}
                  className={CONTROL_CLASS}
                >
                  {m.owner_edit_photo_down()}
                </Button>
                <ConfirmDialog
                  title={m.owner_edit_photo_remove_title()}
                  description={m.owner_edit_photo_remove_text()}
                  confirmLabel={m.owner_edit_photo_remove_confirm()}
                  cancelLabel={m.owner_edit_photo_remove_keep()}
                  error={failure}
                  pending={remove.isPending}
                  onConfirm={(close) => confirmRemoval(photo, close)}
                  renderTrigger={(open) => (
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => {
                        setFailure(undefined)
                        open()
                      }}
                      aria-label={m.owner_edit_photo_remove_named(names)}
                      className={`${CONTROL_CLASS} text-danger hover:bg-clay-wash`}
                    >
                      {m.owner_edit_photo_remove()}
                    </Button>
                  )}
                />
              </div>
            </li>
          )
        })}
      </ul>
      <p role="status" className="min-h-5 text-sm font-bold text-moss-deep">
        {message}
      </p>
      {failure !== undefined && !remove.isPending && (
        <p role="alert" className="text-sm font-bold text-danger">
          {failure}
        </p>
      )}
    </div>
  )
}
