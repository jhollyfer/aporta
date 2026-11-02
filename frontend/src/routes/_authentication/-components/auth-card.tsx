import * as React from 'react'

type AuthCardProps = {
  title: string
  lead: string
  children: React.ReactNode
  /** A saída para a outra tela (de entrar para criar conta, e o contrário). */
  footer: React.ReactNode
}

/**
 * O quadro das telas de entrada e de cadastro: título, a linha que o explica, o
 * formulário e o caminho para a outra tela. O cartão se separa do fundo por troca de
 * tom (`surface` sobre `paper`), sem borda e sem sombra, como o resto da casa.
 */
export function AuthCard({
  title,
  lead,
  children,
  footer,
}: AuthCardProps): React.JSX.Element {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl leading-tight font-extrabold tracking-tight text-ink sm:text-4xl">
          {title}
        </h1>
        <p className="text-base text-ink-soft">{lead}</p>
      </header>
      <div className="rounded-card bg-surface p-5 sm:p-8">{children}</div>
      <p className="text-center text-base text-ink-soft">{footer}</p>
    </div>
  )
}
