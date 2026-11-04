import * as React from 'react'

import {
  LISTING_PHOTO_MAX_SIZE,
  LISTING_PHOTO_MIMETYPES,
  PHOTO_ENVIRONMENTS,
} from '@aporta/shared'
import type { Merge, PhotoEnvironment } from '@aporta/shared'

import { resumeKey } from '#/lib/upload-resume'
import { m } from '#/paraglide/messages'

export type PhotoStatus = 'waiting' | 'sending' | 'sent' | 'failed'

/**
 * Uma foto escolhida e ainda não ligada ao anúncio. Vive só na memória da aba: o
 * `File` não cabe no `localStorage`, e o rascunho do formulário não o guarda.
 */
export type PhotoDraft = {
  /** A identidade do arquivo (`resumeKey`): a mesma foto escolhida duas vezes não entra duas. */
  key: string
  file: File
  /** `blob:` da prévia local, revogada ao remover e ao desmontar. */
  previewUrl: string
  environment: PhotoEnvironment
  status: PhotoStatus
  /** 0 a 100, só enquanto `sending`. */
  progress: number
  /** A chave do arquivo em `/storages`, quando o envio terminou. */
  storageId: string | null
  error: string | null
}

type PhotoPatch = Partial<
  Pick<PhotoDraft, 'status' | 'progress' | 'storageId' | 'error'>
>

export type PhotoDrafts = {
  items: ReadonlyArray<PhotoDraft>
  /** Quantas fotos ainda cabem no anúncio. */
  max: number
  /** O que ficou de fora na última escolha e por quê; `null` quando entrou tudo. */
  notice: string | null
  add: (files: ReadonlyArray<File>) => void
  remove: (key: string) => void
  setEnvironment: (key: string, environment: PhotoEnvironment) => void
  patch: (key: string, change: PhotoPatch) => void
  reset: () => void
}

type Options = {
  /** O teto de fotos que ainda cabem: 12 no cadastro, 12 menos as que o anúncio já tem na edição. */
  max: number
  /** Os ambientes que o anúncio já mostra, para sugerir o que falta antes de repetir. */
  taken?: ReadonlyArray<PhotoEnvironment>
}

/** O primeiro ambiente da lista que ninguém mostrou ainda; todos usados, o quarto (o mais comum em segunda foto). */
function suggestEnvironment(
  used: ReadonlyArray<PhotoEnvironment>,
): PhotoEnvironment {
  return PHOTO_ENVIRONMENTS.find((env) => !used.includes(env)) ?? 'BEDROOM'
}

function isPhotoType(file: File): boolean {
  return LISTING_PHOTO_MIMETYPES.some((type) => type === file.type)
}

/**
 * A lista de fotos do formulário: escolher, sugerir o ambiente, remover e acompanhar o
 * envio. Só estado e regra de lista; quem sobe os arquivos é o `useSendPhotos`.
 *
 * Revoga as prévias (`URL.revokeObjectURL`) ao remover, ao limpar e ao desmontar: cada
 * `blob:` mantém a foto inteira na memória da aba até alguém soltá-la.
 */
export function usePhotoDrafts({ max, taken = [] }: Options): PhotoDrafts {
  const [items, setItems] = React.useState<ReadonlyArray<PhotoDraft>>([])
  const [notice, setNotice] = React.useState<string | null>(null)
  const latest = React.useRef(items)

  React.useEffect(() => {
    latest.current = items
  }, [items])

  React.useEffect(() => {
    return () => {
      for (const item of latest.current) URL.revokeObjectURL(item.previewUrl)
    }
  }, [])

  function add(files: ReadonlyArray<File>): void {
    const next = [...items]
    let notImage = 0
    let tooLarge = 0
    let duplicated = 0
    let overflow = 0

    for (const file of files) {
      const key = resumeKey(file)

      if (!isPhotoType(file)) {
        notImage += 1
        continue
      }

      if (file.size > LISTING_PHOTO_MAX_SIZE) {
        tooLarge += 1
        continue
      }

      if (next.some((item) => item.key === key)) {
        duplicated += 1
        continue
      }

      if (next.length >= max) {
        overflow += 1
        continue
      }

      next.push({
        key,
        file,
        previewUrl: URL.createObjectURL(file),
        environment: suggestEnvironment([
          ...taken,
          ...next.map((item) => item.environment),
        ]),
        status: 'waiting',
        progress: 0,
        storageId: null,
        error: null,
      })
    }

    setItems(next)
    setNotice(
      describeRefusals({ notImage, tooLarge, duplicated, overflow, max }),
    )
  }

  function remove(key: string): void {
    const gone = items.find((item) => item.key === key)
    if (gone) URL.revokeObjectURL(gone.previewUrl)
    setItems(items.filter((item) => item.key !== key))
    setNotice(null)
  }

  function update(
    key: string,
    change: Partial<Pick<PhotoDraft, 'environment'>> & PhotoPatch,
  ): void {
    // Forma funcional: o progresso chega de várias fotos ao mesmo tempo, e cada `setState`
    // lendo o `items` do render em que nasceu apagaria a atualização da vizinha.
    setItems((current) =>
      current.map((item) => {
        if (item.key !== key) return item
        return { ...item, ...change }
      }),
    )
  }

  function reset(): void {
    for (const item of latest.current) URL.revokeObjectURL(item.previewUrl)
    setItems([])
    setNotice(null)
  }

  return {
    items,
    max,
    notice,
    add,
    remove,
    setEnvironment: (key, environment) => update(key, { environment }),
    patch: update,
    reset,
  }
}

type Refusals = Merge<
  {
    notImage: number
    tooLarge: number
    duplicated: number
    overflow: number
  },
  { max: number }
>

/** Uma frase só, pela causa mais séria: o limite vence o tipo, que vence o tamanho, que vence a repetição. */
function describeRefusals({
  notImage,
  tooLarge,
  duplicated,
  overflow,
  max,
}: Refusals): string | null {
  if (overflow > 0) return m.photos_notice_limit({ max })
  if (notImage > 0) return m.photos_notice_type()
  if (tooLarge > 0) {
    return m.photos_notice_size({
      max: Math.round(LISTING_PHOTO_MAX_SIZE / (1024 * 1024)),
    })
  }
  if (duplicated > 0) return m.photos_notice_duplicated()
  return null
}
