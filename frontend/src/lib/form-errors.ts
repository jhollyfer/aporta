import type { FieldValues, Path, UseFormReturn } from 'react-hook-form'

/** O que a falha da API diz ao formulário: erro por campo e a mensagem geral. */
export type FormFailure = {
  /** Mensagem por nome de campo (as chaves de `error.errors` ou de uma recusa de negócio). */
  fields: Record<string, string>
  /** O que não pertence a um campo; vazio quando não há. */
  general: string
}

/**
 * Leva a falha da API para o formulário: cada campo acusado ganha o erro dele, e o que
 * não tem campo (ou tem um campo que o formulário não conhece, porque a API ganhou um)
 * vira a mensagem geral em `root`, nunca some em silêncio.
 *
 * Devolve os campos que receberam erro, na ordem em que a API os acusou, para a tela
 * levar a pessoa à primeira etapa com problema.
 */
export function applyHTTPErrorToForm<TValues extends FieldValues>(
  form: UseFormReturn<TValues>,
  known: ReadonlyArray<Path<TValues>>,
  failure: FormFailure,
): Array<Path<TValues>> {
  const applied: Array<Path<TValues>> = []
  const orphans: Array<string> = []

  for (const [key, message] of Object.entries(failure.fields)) {
    const field = known.find((candidate) => candidate === key)

    if (field === undefined) {
      orphans.push(message)
      continue
    }

    form.setError(field, { type: 'server', message })
    applied.push(field)
  }

  const root = [failure.general, ...orphans]
    .filter((text) => text !== '')
    .join(' ')

  if (root !== '') form.setError('root', { type: 'server', message: root })

  return applied
}
