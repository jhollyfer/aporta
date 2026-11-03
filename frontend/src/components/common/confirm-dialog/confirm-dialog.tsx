import * as React from 'react'

import { ActionButton } from '#/components/common/action-button'
import { FormNotice } from '#/components/common/form-notice'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog'
import { Button } from '#/components/ui/button'

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
 * É o `AlertDialog` do shadcn (Base UI): role `alertdialog`, não fecha por clique fora, e o
 * Esc fica travado enquanto a confirmação está em andamento.
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
  const [isOpen, setIsOpen] = React.useState(false)

  function open(): void {
    setIsOpen(true)
  }

  function close(): void {
    setIsOpen(false)
  }

  function handleOpenChange(next: boolean): void {
    // Esc chega aqui: com a confirmação em andamento a ação não corre sem dono.
    if (!next && pending) return

    setIsOpen(next)
  }

  return (
    <>
      {renderTrigger(open)}
      <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
        <AlertDialogContent className="max-h-[calc(100dvh-2rem)] gap-4 overflow-y-auto rounded-card bg-surface p-6 text-base text-ink data-[size=default]:max-w-md data-[size=default]:sm:max-w-md">
          <AlertDialogHeader className="place-items-start text-left">
            <AlertDialogTitle className="text-xl font-extrabold text-balance">
              {title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base text-ink-soft">
              {description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <FormNotice>{error}</FormNotice>
          <AlertDialogFooter className="m-0 border-0 bg-transparent p-0">
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
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
