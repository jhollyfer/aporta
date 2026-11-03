import * as React from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'

type ModalDialogProps = {
  title: string
  description: string
  /** Um envio está em andamento: o Esc não fecha, para a ação não correr sem dono. */
  pending?: boolean
  /** Chamado quando o diálogo fecha, por qualquer caminho (botão, Esc, `close()`). */
  onClose?: () => void
  /** O botão que abre. Recebe `open` para não precisar de estado de abertura em quem usa. */
  renderTrigger: (open: () => void) => React.ReactNode
  /** O corpo, com `close` para quem decide quando fechar (só depois que o servidor respondeu). */
  children: (close: () => void) => React.ReactNode
}

/**
 * A casca de todo diálogo modal da casa, sobre o `Dialog` do shadcn (Base UI): ele prende o
 * foco, fecha no Esc, inerta o resto da página e devolve o foco a quem abriu.
 * O clique fora **não** fecha (é o contrato do AlertDialog): ação destrutiva e texto
 * digitado pedem um gesto deliberado.
 *
 * Mora em `common/` porque a confirmação, o motivo da equipe e a denúncia pública usam a
 * mesma casca, e o foco, o Esc e a largura não podem divergir entre elas.
 */
export function ModalDialog({
  title,
  description,
  pending = false,
  onClose,
  renderTrigger,
  children,
}: ModalDialogProps): React.JSX.Element {
  const [isOpen, setIsOpen] = React.useState(false)

  function open(): void {
    setIsOpen(true)
  }

  function close(): void {
    setIsOpen(false)
    onClose?.()
  }

  function handleOpenChange(next: boolean): void {
    // Esc e o botão do navegador chegam aqui: com um envio em andamento a ação não corre sem dono.
    if (!next && pending) return
    if (next) {
      setIsOpen(true)
      return
    }

    close()
  }

  return (
    <>
      {renderTrigger(open)}
      <Dialog
        open={isOpen}
        onOpenChange={handleOpenChange}
        disablePointerDismissal
      >
        <DialogContent
          showCloseButton={false}
          className="max-h-[calc(100dvh-2rem)] gap-4 overflow-y-auto rounded-card bg-surface p-6 text-base text-ink sm:max-w-md"
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-balance">
              {title}
            </DialogTitle>
            <DialogDescription className="text-base text-ink-soft">
              {description}
            </DialogDescription>
          </DialogHeader>
          {children(close)}
        </DialogContent>
      </Dialog>
    </>
  )
}
