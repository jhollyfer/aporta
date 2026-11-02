import * as React from 'react'

import { PhotoPicker } from '#/components/common/photo-picker'
import type { PhotoDrafts } from '#/hooks/use-photo-drafts'
import { m } from '#/paraglide/messages'

/**
 * O passo de fotos: escolher, dar um ambiente a cada uma e ver a prévia. Os arquivos só
 * sobem no último passo, junto com o anúncio. Foto é opcional (o anúncio vai sem), mas o
 * texto avisa que a foto não fica salva no aparelho como o resto do rascunho: o
 * `localStorage` não guarda arquivo, e quem sai da página escolhe de novo.
 */
export function PhotosStep({
  drafts,
}: {
  drafts: PhotoDrafts
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-base text-ink-soft">{m.photos_step_lead()}</p>
      <PhotoPicker drafts={drafts} />
      <p className="text-sm text-ink-soft">{m.photos_step_unsaved()}</p>
    </div>
  )
}
