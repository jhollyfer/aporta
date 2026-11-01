import * as React from 'react'

import type { z } from 'zod'

/**
 * Persiste um rascunho no `localStorage`, validado na leitura.
 *
 * Dois defeitos que isto evita. Primeiro, o storage devolve o que qualquer
 * versão antiga do app gravou, então o valor lido passa pelo schema: rascunho
 * com forma velha vira o valor inicial em vez de quebrar o formulário. Segundo,
 * o storage pode lançar (janela privada, dados bloqueados) ou nem existir (SSR),
 * e o formulário precisa funcionar sem ele: toda leitura e escrita é protegida.
 *
 * A chave leva versão (`:v1`): mudar a forma do rascunho é trocar a chave, e o
 * rascunho antigo some sem migração.
 *
 * Só lê depois de montar (`useEffect`): ler no render faria o servidor e o
 * navegador hidratarem com valores diferentes.
 */
export function useDraftStorage<TSchema extends z.ZodType>(
  key: string,
  schema: TSchema,
): {
  restored: z.infer<TSchema> | null
  ready: boolean
  save: (value: unknown) => void
  clear: () => void
} {
  const [restored, setRestored] = React.useState<z.infer<TSchema> | null>(null)
  const [ready, setReady] = React.useState(false)

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key)
      if (raw !== null) {
        const parsed = schema.safeParse(JSON.parse(raw))
        if (parsed.success) setRestored(parsed.data)
      }
    } catch {
      // Storage indisponível ou JSON corrompido: o formulário segue com o valor inicial.
    }
    setReady(true)
  }, [key, schema])

  const save = React.useCallback(
    (value: unknown) => {
      try {
        window.localStorage.setItem(key, JSON.stringify(value))
      } catch {
        // Cota cheia ou storage bloqueado: perder o rascunho é aceitável, travar o formulário não.
      }
    },
    [key],
  )

  const clear = React.useCallback(() => {
    try {
      window.localStorage.removeItem(key)
    } catch {
      // Sem storage, não há o que limpar.
    }
  }, [key])

  return { restored, ready, save, clear }
}
