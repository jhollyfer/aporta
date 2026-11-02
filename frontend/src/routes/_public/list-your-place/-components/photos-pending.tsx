import * as React from 'react'

import { ActionButton } from '#/components/common/action-button'
import { FormNotice } from '#/components/common/form-notice'
import { PhotoPicker } from '#/components/common/photo-picker'
import { PillButton } from '#/components/common/pill-button'
import type { PhotoDrafts } from '#/hooks/use-photo-drafts'
import { m } from '#/paraglide/messages'

type PhotosPendingProps = {
  drafts: PhotoDrafts
  sending: boolean
  /** O que impediu o envio, quando não foi um arquivo específico (a ligação ao anúncio, por exemplo). */
  message: string
  onRetry: () => void
}

/**
 * O anúncio já foi criado (e o rascunho apagado), mas as fotos ainda não estão nele.
 * Fica na tela enquanto os arquivos sobem e, se algum falha, oferece tentar de novo sem
 * criar o anúncio outra vez: o `onRetry` só repete o que falta. Quem prefere sair vai
 * para "Meus anúncios", de onde dá para adicionar as fotos depois.
 */
export function PhotosPending({
  drafts,
  sending,
  message,
  onRetry,
}: PhotosPendingProps): React.JSX.Element {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 px-4 pt-12 pb-8">
      <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
        {m.owner_photos_title()}
      </h1>
      <p className="text-lg text-ink-soft" role="status">
        {sending && m.owner_photos_sending()}
        {!sending && m.owner_photos_failed()}
      </p>
      <PhotoPicker drafts={drafts} disabled={sending} />
      <FormNotice>{message}</FormNotice>
      <div className="flex flex-wrap gap-3">
        <ActionButton
          scale="lg"
          pending={sending}
          onClick={onRetry}
          type="button"
        >
          {m.owner_photos_retry()}
        </ActionButton>
        <PillButton to="/owner/listings" tone="outline" scale="lg">
          {m.owner_ready_listings()}
        </PillButton>
      </div>
    </div>
  )
}
