import * as React from 'react'

import { Button } from '#/components/ui/button'
import { ActionButton } from '#/components/common/action-button'
import { FormNotice } from '#/components/common/form-notice'
import { ModalDialog } from '#/components/common/modal-dialog'

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
 * A casca (foco, Esc, clique fora) é a do `ModalDialog`.
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
  return (
    <ModalDialog
      title={title}
      description={description}
      pending={pending}
      renderTrigger={renderTrigger}
    >
      {(close) => (
        <>
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
              {cancelLabel}
            </Button>
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
        </>
      )}
    </ModalDialog>
  )
}
