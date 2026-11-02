import * as React from 'react'

import { ActionButton } from '#/components/common/action-button'

type ConfirmDialogProps = {
  title: string
  description: string
  confirmLabel: string
  cancelLabel: string
  /** O texto de uma falha da confirmação: o diálogo fica aberto para tentar de novo. */
  error?: string
  /** A confirmação está em andamento: trava os dois botões. */
  pending?: boolean
  /** Quem confirma decide quando fechar: `close` só depois que o servidor respondeu. */
  onConfirm: (close: () => void) => void
  /** O botão que abre. Recebe `open` para não precisar de estado de abertura em quem usa. */
  renderTrigger: (open: () => void) => React.ReactNode
}

/**
 * A confirmação de uma ação que não se desfaz (`_standards/frontend.md` §10.6): nomeia a
 * ação, o objeto e a consequência, e os botões levam verbo e objeto, nunca "Sim/Não".
 *
 * É o `<dialog>` nativo com `showModal()`, e não uma biblioteca de sobreposição: o
 * navegador já prende o foco, devolve o foco ao botão que abriu, fecha no Esc e inerta o
 * resto da página, e o projeto não instala o Base UI. O clique fora **não** fecha (é o
 * contrato do AlertDialog): ação destrutiva pede um gesto deliberado.
 */
export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  cancelLabel,
  error,
  pending = false,
  onConfirm,
  renderTrigger,
}: ConfirmDialogProps): React.JSX.Element {
  const dialog = React.useRef<HTMLDialogElement>(null)
  const titleId = React.useId()
  const descriptionId = React.useId()

  function open(): void {
    dialog.current?.showModal()
  }

  function close(): void {
    dialog.current?.close()
  }

  return (
    <>
      {renderTrigger(open)}
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        // Esc durante o envio não pode fechar o diálogo e deixar a ação correndo sem dono.
        onCancel={(event) => {
          if (pending) event.preventDefault()
        }}
        className="m-auto w-[calc(100vw-2rem)] max-w-md rounded-card bg-surface p-6 text-ink backdrop:bg-ink/60"
      >
        <div className="flex flex-col gap-4">
          <h2 id={titleId} className="text-xl font-extrabold text-balance">
            {title}
          </h2>
          <p id={descriptionId} className="text-base text-ink-soft">
            {description}
          </p>
          {error !== undefined && (
            <p
              role="alert"
              className="rounded-xl bg-clay-wash px-4 py-3 text-sm font-bold text-ink"
            >
              {error}
            </p>
          )}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={close}
              disabled={pending}
              className="h-12 rounded-full border-2 border-ink px-6 text-sm font-extrabold text-ink hover:bg-ink hover:text-paper disabled:opacity-60"
            >
              {cancelLabel}
            </button>
            <ActionButton
              type="button"
              tone="danger"
              scale="md"
              className="h-12"
              pending={pending}
              onClick={() => onConfirm(close)}
            >
              {confirmLabel}
            </ActionButton>
          </div>
        </div>
      </dialog>
    </>
  )
}
