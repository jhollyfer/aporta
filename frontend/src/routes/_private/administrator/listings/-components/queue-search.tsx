import * as React from 'react'
import { Controller, useForm } from 'react-hook-form'

import { ActionButton } from '#/components/common/action-button'
import { CONTROL, Field } from '#/components/common/field'
import { m } from '#/paraglide/messages'

type SearchValues = { q: string }

type QueueSearchProps = {
  /** O texto que está na URL: o campo o mostra, e muda junto com ela (voltar, limpar). */
  value: string
  onSearch: (q: string | undefined) => void
}

/**
 * A busca da fila por título ou descrição. Existe porque a fila é de todos os donos e cresce:
 * achar "o anúncio da Rua do Porto" paginando de vinte em vinte não é trabalho. Envia ao
 * apertar Enter ou o botão (e não a cada tecla): cada tecla seria um pedido à API, e a
 * lista pularia debaixo do dedo enquanto se digita. Texto vazio limpa a busca.
 */
export function QueueSearch({
  value,
  onSearch,
}: QueueSearchProps): React.JSX.Element {
  const form = useForm<SearchValues>({ defaultValues: { q: value } })

  // A URL manda: voltar do navegador ou "Limpar busca" trocam o texto sem passar pelo campo.
  React.useEffect(() => {
    form.reset({ q: value })
  }, [form, value])

  return (
    <form
      role="search"
      noValidate
      onSubmit={form.handleSubmit(({ q }) => onSearch(q.trim() || undefined))}
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
    >
      <Controller
        control={form.control}
        name="q"
        render={({ field }) => (
          <Field
            label={m.staff_search_label()}
            htmlFor="queue-search"
            className="sm:flex-1"
          >
            <input
              id="queue-search"
              type="search"
              maxLength={100}
              autoComplete="off"
              {...field}
              className={CONTROL}
            />
          </Field>
        )}
      />
      <ActionButton type="submit" tone="outline" className="h-12 sm:self-end">
        {m.staff_search_submit()}
      </ActionButton>
    </form>
  )
}
