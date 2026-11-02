import * as React from 'react'

import type { OwnerListingShowResponse } from '@aporta/shared'

import { useMultipartUpload } from '#/hooks/use-multipart-upload'
import type { PhotoDrafts } from '#/hooks/use-photo-drafts'
import { HTTPError } from '#/integrations/tanstack-query/http'
import { useOwnerListingPhotosMutation } from '#/integrations/tanstack-query/mutations/owner-listings'
import { ownerFailureMessage } from '#/lib/owner-failure'

/** O resultado do envio: o anúncio como ficou, ou o que impediu. Nada lança para a tela. */
export type SendPhotosResult =
  | { ok: true; listing: OwnerListingShowResponse }
  | { ok: false; message: string }

function messageOf(error: unknown): string {
  if (error instanceof HTTPError) return ownerFailureMessage(error)
  if (error instanceof Error) return error.message
  return ''
}

/**
 * Sobe as fotos escolhidas e as liga ao anúncio: cada arquivo vai por `/storages` (multipart
 * assinado, direto para o bucket, retomável) e, quando **todos** subiram, uma chamada só
 * a `POST /owner/listings/:id/photos` liga o conjunto.
 *
 * Ligar tudo junto, e só no fim, é o que deixa a nova tentativa simples: arquivo que já
 * subiu (`sent`) não sobe de novo, e como nada foi ligado antes, repetir não duplica foto
 * no anúncio. Se o envio de um arquivo falha, os outros seguem (a pessoa vê quais falharam)
 * mas nada é ligado até a próxima tentativa fechar o conjunto.
 *
 * Sobe um arquivo por vez: cada um já abre até três conexões, e a banda de subida, que é o
 * gargalo, não aumenta com mais.
 */
export function useSendPhotos(drafts: PhotoDrafts): {
  send: (listingId: string) => Promise<SendPhotosResult>
  sending: boolean
} {
  const { upload } = useMultipartUpload()
  const attach = useOwnerListingPhotosMutation()
  const [sending, setSending] = React.useState(false)
  const controller = React.useRef<AbortController | null>(null)

  // Fechar a página no meio do envio cancela o que está no ar, em vez de deixá-lo órfão.
  React.useEffect(() => {
    return () => controller.current?.abort()
  }, [])

  async function send(listingId: string): Promise<SendPhotosResult> {
    const abort = new AbortController()
    controller.current = abort
    setSending(true)

    try {
      let failed = 0
      // O `drafts.items` desta chamada é o retrato de quando ela começou: a chave que o
      // envio devolve precisa ser lembrada aqui, senão o `attach` do fim a leria vazia.
      const storageIds = new Map<string, string>()

      for (const item of drafts.items) {
        if (item.storageId !== null) {
          storageIds.set(item.key, item.storageId)
          continue
        }

        drafts.patch(item.key, { status: 'sending', progress: 0, error: null })

        try {
          const stored = await upload(
            item.file,
            (progress) => drafts.patch(item.key, { progress }),
            abort.signal,
          )
          storageIds.set(item.key, stored.id)
          drafts.patch(item.key, {
            status: 'sent',
            progress: 100,
            storageId: stored.id,
          })
        } catch (error) {
          failed += 1
          drafts.patch(item.key, { status: 'failed', error: messageOf(error) })
        }
      }

      if (failed > 0) return { ok: false, message: '' }

      const listing = await attach.mutateAsync({
        id: listingId,
        photos: drafts.items.flatMap((item) => {
          const storageId = storageIds.get(item.key)
          if (storageId === undefined) return []
          return [{ storageId, environment: item.environment }]
        }),
      })

      return { ok: true, listing }
    } catch (error) {
      return { ok: false, message: messageOf(error) }
    } finally {
      setSending(false)
    }
  }

  return { send, sending }
}
