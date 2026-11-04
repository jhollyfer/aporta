import * as React from 'react'
import {
  CheckCircle,
  ImageSquare,
  Spinner,
  WarningCircle,
  X,
} from '@phosphor-icons/react'

import { LISTING_PHOTO_MIMETYPES, PHOTO_ENVIRONMENTS } from '@aporta/shared'

import { Input } from '#/components/ui/input'
import { Progress } from '#/components/ui/progress'
import { Label } from '#/components/ui/label'
import { Button } from '#/components/ui/button'
import { NativeSelect, NativeSelectOption } from '#/components/ui/native-select'
import type { PhotoDraft, PhotoDrafts } from '#/hooks/use-photo-drafts'
import { cn } from '#/lib/cn'
import { PHOTO_ENVIRONMENT_LABELS } from '#/lib/labels'
import { m } from '#/paraglide/messages'

type PhotoPickerProps = {
  drafts: PhotoDrafts
  /** Envio em andamento: a lista fica só para leitura, senão a pessoa remove a foto que está subindo. */
  disabled?: boolean
}

/** O status de uma foto em texto, que é o que o leitor de tela lê (a barra e o ícone só reforçam). */
function statusText(item: PhotoDraft): string {
  if (item.status === 'sending') {
    return m.photos_status_sending({ percent: item.progress })
  }
  if (item.status === 'sent') return m.photos_status_sent()
  if (item.status === 'failed') return m.photos_status_failed()
  return m.photos_status_waiting()
}

function StatusIcon({ status }: { status: PhotoDraft['status'] }) {
  if (status === 'sent') {
    return (
      <CheckCircle aria-hidden weight="fill" className="size-4 text-moss" />
    )
  }
  if (status === 'failed') {
    return (
      <WarningCircle aria-hidden weight="fill" className="size-4 text-danger" />
    )
  }
  if (status === 'sending') {
    return (
      <Spinner
        aria-hidden
        weight="bold"
        className="size-4 animate-spin motion-reduce:animate-none"
      />
    )
  }
  return null
}

function PhotoRow({
  item,
  drafts,
  disabled,
}: {
  item: PhotoDraft
  drafts: PhotoDrafts
  disabled: boolean
}): React.JSX.Element {
  const selectId = React.useId()

  return (
    <li
      data-slot="photo-row"
      className="flex min-w-0 gap-3 rounded-card bg-surface p-3"
    >
      <img
        src={item.previewUrl}
        alt={m.photos_preview_alt({ name: item.file.name })}
        width={96}
        height={96}
        className="size-24 shrink-0 rounded-xl object-cover"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 truncate text-sm font-bold text-ink">
            {item.file.name}
          </p>
          <Button
            variant="ghost"
            type="button"
            onClick={() => drafts.remove(item.key)}
            disabled={disabled}
            aria-label={m.photos_remove({ name: item.file.name })}
            className="-mt-2 -mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink hover:bg-moss-wash disabled:opacity-40"
          >
            <X aria-hidden weight="bold" className="size-5" />
          </Button>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={selectId} className="text-xs font-bold text-ink-soft">
            {m.photos_environment()}
          </Label>
          <NativeSelect
            id={selectId}
            value={item.environment}
            disabled={disabled}
            onChange={(event) => {
              const environment = PHOTO_ENVIRONMENTS.find(
                (env) => env === event.target.value,
              )
              if (environment) drafts.setEnvironment(item.key, environment)
            }}
            className="[&_select]:h-11 [&_select]:py-0 [&_select]:text-sm"
          >
            {PHOTO_ENVIRONMENTS.map((env) => (
              <NativeSelectOption key={env} value={env}>
                {PHOTO_ENVIRONMENT_LABELS[env]()}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        {item.status !== 'waiting' && (
          <div className="flex flex-col gap-1">
            <p className="inline-flex items-center gap-1.5 text-xs font-bold text-ink">
              <StatusIcon status={item.status} />
              <span role="status">{statusText(item)}</span>
            </p>
            {item.status === 'sending' && (
              <Progress
                value={item.progress}
                aria-label={item.file.name}
                className="w-full"
              />
            )}
            {item.error !== null && (
              <p role="alert" className="text-xs font-bold text-danger">
                {item.error}
              </p>
            )}
          </div>
        )}
      </div>
    </li>
  )
}

/**
 * A escolha das fotos do anúncio: seleção múltipla, prévia local, o ambiente de cada
 * foto, remover e o andamento do envio. Só desenha o estado de `usePhotoDrafts`; quem
 * sobe os arquivos é o `useSendPhotos`.
 *
 * O `<input type="file">` fica `sr-only` dentro de um `<Label>` desenhado como botão: o
 * controle nativo é o que teclado e leitor de tela usam, e `peer-focus-visible` devolve o
 * anel de foco ao botão. O valor é zerado a cada escolha, senão escolher o mesmo arquivo
 * de novo (depois de removê-lo) não dispara `change`.
 */
export function PhotoPicker({
  drafts,
  disabled = false,
}: PhotoPickerProps): React.JSX.Element {
  const inputId = React.useId()
  const full = drafts.items.length >= drafts.max
  let label = m.photos_choose_more()
  if (drafts.items.length === 0) label = m.photos_choose()

  return (
    <div data-slot="photo-picker" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          id={inputId}
          type="file"
          accept={LISTING_PHOTO_MIMETYPES.join(',')}
          multiple
          disabled={disabled || full}
          onChange={(event) => {
            drafts.add(Array.from(event.target.files ?? []))
            event.target.value = ''
          }}
          className="peer sr-only h-px w-px border-0 p-0"
        />
        <Label
          htmlFor={inputId}
          className={cn(
            'inline-flex h-12 cursor-pointer items-center gap-2 rounded-full border-2 border-ink px-6 text-sm font-extrabold text-ink transition-colors hover:bg-ink hover:text-paper peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink motion-reduce:transition-none',
            (disabled || full) && 'cursor-not-allowed opacity-50',
          )}
        >
          <ImageSquare aria-hidden weight="bold" className="size-5" />
          {label}
        </Label>
        <p className="text-sm font-bold text-ink-soft tabular-nums">
          {m.photos_count({ count: drafts.items.length, max: drafts.max })}
        </p>
      </div>
      {drafts.notice !== null && (
        <p role="alert" className="text-sm font-bold text-danger">
          {drafts.notice}
        </p>
      )}
      {drafts.items.length === 0 && (
        <p className="text-base text-ink-soft">{m.photos_empty()}</p>
      )}
      {drafts.items.length > 0 && (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {drafts.items.map((item) => (
            <PhotoRow
              key={item.key}
              item={item}
              drafts={drafts}
              disabled={disabled}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
