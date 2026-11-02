import type { FieldValues, Path, UseFormReturn } from 'react-hook-form'

import type { HTTPError } from '#/integrations/tanstack-query/http'
import { describeOwnerFailure } from '#/lib/owner-failure'

/**
 * Leva a falha da API para o formulário: cada campo acusado ganha o erro dele, e o que
 * não tem campo (ou tem um campo que o formulário não conhece, porque a API ganhou um)
 * vira a mensagem geral em `root`, nunca some em silêncio.
 *
 * Devolve os campos que receberam erro, na ordem em que o formulário os conhece, para a
 * tela levar a pessoa à primeira etapa com problema.
 */
export function applyOwnerFailure<TValues extends FieldValues>(
  form: UseFormReturn<TValues>,
  error: HTTPError,
  known: ReadonlyArray<Path<TValues>>,
): Array<Path<TValues>> {
  const { fields, general } = describeOwnerFailure(error)
  const applied: Array<Path<TValues>> = []
  const orphans: Array<string> = []

  for (const [key, message] of Object.entries(fields)) {
    const field = known.find((candidate) => candidate === key)

    if (field === undefined) {
      orphans.push(message)
      continue
    }

    form.setError(field, { type: 'server', message })
    applied.push(field)
  }

  const root = [general, ...orphans].filter((text) => text !== '').join(' ')

  if (root !== '') form.setError('root', { type: 'server', message: root })

  return applied
}
