import * as React from 'react'

/**
 * A mensagem geral do formulário (credencial errada, servidor fora do ar). `role="alert"`
 * a anuncia assim que aparece; o ícone não entra porque cor e texto já dizem, e o texto
 * é o que o leitor de tela lê. Não renderiza nada sem mensagem, e o espaço só existe
 * quando há o que dizer.
 */
export function FormNotice({
  children,
}: {
  children?: string
}): React.JSX.Element | null {
  if (!children) return null

  return (
    <p
      role="alert"
      className="rounded-xl bg-clay-wash px-4 py-3 text-sm font-bold text-ink"
    >
      {children}
    </p>
  )
}
