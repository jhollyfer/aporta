import * as React from 'react'

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
 * A casca de todo diálogo modal da casa. É o `<dialog>` nativo com `showModal()`, e não uma
 * biblioteca de sobreposição: o navegador já prende o foco, devolve o foco ao botão que
 * abriu, fecha no Esc e inerta o resto da página, e o projeto não instala o Base UI.
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
        onCancel={(event) => {
          if (pending) event.preventDefault()
        }}
        onClose={onClose}
        className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-md overflow-y-auto rounded-card bg-surface p-6 text-ink backdrop:bg-ink/60"
      >
        <div className="flex flex-col gap-4">
          <h2 id={titleId} className="text-xl font-extrabold text-balance">
            {title}
          </h2>
          <p id={descriptionId} className="text-base text-ink-soft">
            {description}
          </p>
          {children(close)}
        </div>
      </dialog>
    </>
  )
}
