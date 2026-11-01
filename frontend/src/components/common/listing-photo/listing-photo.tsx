import * as React from 'react'

import { PHOTO_ENVIRONMENT } from '@aporta/shared'
import type {
  ListingPhoto as ListingPhotoRecord,
  ListingType,
} from '@aporta/shared'

import { SCENE_KIND, Scene } from '#/components/common/scene'
import type { SceneKind } from '#/components/common/scene'
import { PHOTO_ENVIRONMENT_LABELS } from '#/lib/labels'
import { cn } from '#/lib/cn'

const FACADE_BY_TYPE: Record<ListingType, SceneKind> = {
  HOUSE: SCENE_KIND.HOUSE,
  ROOM: SCENE_KIND.HOUSE,
  KITNET: SCENE_KIND.BUILDING,
  APARTMENT: SCENE_KIND.BUILDING,
  HOTEL: SCENE_KIND.HOTEL,
}

const INDOOR: Record<
  Exclude<ListingPhotoRecord['environment'], 'FACADE'>,
  SceneKind
> = {
  BEDROOM: SCENE_KIND.BEDROOM,
  BATHROOM: SCENE_KIND.BATHROOM,
  KITCHEN: SCENE_KIND.KITCHEN,
  LIVING: SCENE_KIND.LIVING,
}

type ListingPhotoProps = {
  photo: ListingPhotoRecord
  listingType: ListingType
  title: string
  priority?: boolean
  className?: string
}

function sceneFor(
  photo: ListingPhotoRecord,
  listingType: ListingType,
): SceneKind {
  if (photo.environment === PHOTO_ENVIRONMENT.FACADE) {
    return FACADE_BY_TYPE[listingType]
  }
  return INDOOR[photo.environment]
}

/**
 * A foto de um anúncio: a imagem real quando o dono enviou, e a cena desenhada
 * quando ainda não.
 *
 * Mora em `common/` porque o card da lista, a galeria do detalhe e o resumo do
 * mapa mostram a mesma foto, e a regra "sem `url`, desenha" não pode divergir
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

  return (
    <Scene
      kind={sceneFor(photo, listingType)}
      label={label}
      className={className}
    />
  )
}
