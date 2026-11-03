import * as React from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'

import { Button } from '#/components/ui/button'
import { Textarea } from '#/components/ui/textarea'
import { ActionButton } from '#/components/common/action-button'
import { Field } from '#/components/common/field'
import { errorId, hintId, invalidProps } from '#/lib/form-a11y'
import { FormNotice } from '#/components/common/form-notice'
import { ModalDialog } from '#/components/common/modal-dialog'
import { cn } from '#/lib/cn'
import {
  NOTE_FORM_DEFAULTS,
  NOTE_MAX,
  NoteFormValidator,
} from '#/lib/note-form'
import type { NoteForm } from '#/lib/note-form'
import { m } from '#/paraglide/messages'

/** O que o diálogo entrega a quem o usa para responder ao servidor: fechar ou apontar o campo. */
export type NoteControls = {
  close: () => void
  /** Pendura a recusa do servidor no campo do motivo, onde a pessoa corrige. */
  setNoteError: (message: string) => void
}

type NoteDialogProps = {
  title: string
  description: string
  label: string
  hint?: string
  submitLabel: string
  tone?: 'moss' | 'danger'
  /** O envio está em andamento: trava o texto e os botões. */
  pending?: boolean
  /** O que não é do campo (servidor fora do ar, anúncio que mudou de estado). */
  error?: string
  onSubmit: (note: string, controls: NoteControls) => void
  /** Chamado ao abrir e ao fechar, para quem usa limpar o erro geral da vez anterior. */
  onReset?: () => void
  renderTrigger: (open: () => void) => React.ReactNode
}

/**
 * O diálogo que pede um motivo escrito (recusar um anúncio, resolver uma denúncia). O
 * motivo é a parte que importa: a recusa só serve ao dono se disser o que ajustar, e a
 * resolução é o registro que a equipe deixa. Por isso o campo mostra o contador contra o
 * teto da API (500) e o erro, do cliente ou do servidor, fica **no campo**, ligado por
 * `aria-describedby`, e não numa faixa genérica.
 *
 * Fecha só quando quem usa manda (`controls.close`), depois que o servidor responde: o
 * texto digitado não se perde numa falha.
 */
export function NoteDialog({
  title,
  description,
  label,
  hint,
  submitLabel,
  tone = 'moss',
  pending = false,
  error,
  onSubmit,
  onReset,
  renderTrigger,
}: NoteDialogProps): React.JSX.Element {
  const form = useForm<NoteForm>({
    resolver: zodResolver(NoteFormValidator),
    defaultValues: NOTE_FORM_DEFAULTS,
    mode: 'onTouched',
  })
  // Um id por diálogo: a lista de denúncias monta um diálogo por linha, e `id={fieldId}` repetido
  // faria o `<label for>` de todos apontar para o campo do primeiro.
  const uid = React.useId()
  const fieldId = `note-${uid}`
  const counterId = `${fieldId}-counter`
  const length = form.watch('note').length

  function reset(): void {
    form.reset(NOTE_FORM_DEFAULTS)
    onReset?.()
  }

  return (
    <ModalDialog
      title={title}
      description={description}
      pending={pending}
      onClose={reset}
      renderTrigger={(open) =>
        renderTrigger(() => {
          reset()
          open()
        })
      }
    >
      {(close) => (
        <form
          noValidate
          onSubmit={form.handleSubmit((values) =>
            onSubmit(values.note, {
              close,
              setNoteError: (message) =>
                form.setError('note', { type: 'server', message }),
            }),
          )}
          className="flex flex-col gap-4"
        >
          <Controller
            control={form.control}
            name="note"
            render={({ field, fieldState }) => (
              <Field
                label={label}
                hint={hint}
                htmlFor={fieldId}
                error={fieldState.error?.message}
              >
                <Textarea
                  id={fieldId}
                  rows={4}
                  disabled={pending}
                  {...field}
                  {...invalidProps(fieldState.invalid, fieldId)}
                  aria-describedby={[
                    hint !== undefined && hintId(fieldId),
                    fieldState.invalid && errorId(fieldId),
                    counterId,
                  ]
                    .filter((id) => typeof id === 'string')
                    .join(' ')}
                  className="w-full rounded-xl border border-line bg-surface p-4 text-base text-ink disabled:opacity-70"
                />
                <p
                  id={counterId}
                  className={cn(
                    'self-end text-xs font-bold text-ink-soft',
                    length > NOTE_MAX && 'text-danger',
                  )}
                >
                  {m.note_counter({ count: length, max: NOTE_MAX })}
                </p>
              </Field>
            )}
          />
          <FormNotice>{error}</FormNotice>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              onClick={close}
              disabled={pending}
              variant="ink"
              size="pill-md"
              className="h-12 px-6 disabled:opacity-60"
            >
              {m.note_cancel()}
            </Button>
            <ActionButton
              type="submit"
              tone={tone}
              className="h-12"
              pending={pending}
            >
              {submitLabel}
            </ActionButton>
          </div>
        </form>
      )}
    </ModalDialog>
  )
}
