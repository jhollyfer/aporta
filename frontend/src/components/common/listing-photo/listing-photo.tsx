import * as React from 'react'

import {
  Bed,
  Buildings,
  DoorOpen,
  House,
  Suitcase,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

import type {
  ListingPhoto as ListingPhotoRecord,
  ListingType,
} from '@aporta/shared'

import { PHOTO_ENVIRONMENT_LABELS } from '#/lib/labels'
import { m } from '#/paraglide/messages'
import { cn } from '#/lib/cn'

const ICONS: Record<ListingType, Icon> = {
  HOUSE: House,
  APARTMENT: Buildings,
  KITNET: DoorOpen,
  ROOM: Bed,
  HOTEL: Suitcase,
}

type ListingPhotoProps = {
  photo: ListingPhotoRecord
  listingType: ListingType
  title: string
  priority?: boolean
  className?: string
}

/**
 * A foto de um anúncio: a imagem real quando o dono enviou, e um quadro neutro
 * ("Foto em breve", com o tipo do imóvel) quando ainda não. Sem desenho repetido
 * em cada card: o mesmo desenho em toda a lista lê como imagem de enfeite.
 *
 * Mora em `common/` porque o card da lista, a galeria do detalhe e o resumo do
 * mapa mostram a mesma foto, e a regra "sem `url`, quadro neutro" não pode divergir
 * entre eles. `loading="lazy"` e dimensões fixas: internet lenta pinta a
 * imagem depois, e sem a caixa reservada a página pula a cada foto que chega.
 *
 * `priority` desliga o lazy da primeira foto da tela, que é o LCP.
 */
export function ListingPhoto({
  photo,
  listingType,
  title,
  priority = false,
  className,
}: ListingPhotoProps): React.JSX.Element {
  const label = `${title}: ${PHOTO_ENVIRONMENT_LABELS[photo.environment]()}`
  let loading: 'eager' | 'lazy' = 'lazy'
  if (priority) loading = 'eager'

  if (photo.url !== null) {
    return (
      <img
        src={photo.url}
        alt={label}
        width={800}
        height={600}
        loading={loading}
        decoding="async"
        className={cn('size-full object-cover', className)}
      />
    )
  }

  const Glyph = ICONS[listingType]

  return (
    <div
      role="img"
      aria-label={label}
      className={cn(
        'flex size-full flex-col items-center justify-center gap-2 bg-clay-wash text-ink-soft',
        className,
      )}
    >
      <Glyph aria-hidden className="size-9" weight="light" />
      <span className="text-xs font-bold tracking-wide uppercase">
        {m.photo_missing()}
      </span>
    </div>
  )
}
