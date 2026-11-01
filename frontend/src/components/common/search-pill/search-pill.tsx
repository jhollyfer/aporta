import * as React from 'react'

import { cn } from '#/lib/cn'

import { SearchPillContext } from './search-pill-context'
import type { SearchField, SearchValues } from './search-pill-context'

type SearchPillRootProps = {
  onSearch: (values: SearchValues) => void
  className?: string
  children: React.ReactNode
}

const INITIAL: SearchValues = { type: '', neighborhood: '', period: '' }

/**
 * A busca em pílula com três segmentos (tipo, bairro e período), como a do
 * Airbnb. O estado mora na raiz e os segmentos o leem do contexto; quem usa só
 * decide o que fazer com o resultado (`onSearch`).
 *
 * Três `select` nativos e não um popover: abrem o seletor do próprio celular,
 * custam zero de JavaScript e funcionam com leitor de tela. Num aparelho
 * simples com internet lenta, isso vale mais que o ar de aplicativo.
 */
export function SearchPillRoot({
  onSearch,
  className,
  children,
}: SearchPillRootProps): React.JSX.Element {
  const [values, setValues] = React.useState<SearchValues>(INITIAL)

  const setValue = React.useCallback((field: SearchField, value: string) => {
    setValues((current) => ({ ...current, [field]: value }))
  }, [])

  const context = React.useMemo(
    () => ({ values, setValue }),
    [values, setValue],
  )

  function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    onSearch(values)
  }

  return (
    <SearchPillContext value={context}>
      <form
        onSubmit={handleSubmit}
        className={cn(
          'flex flex-col gap-1 rounded-[1.75rem] border border-line bg-surface p-2 shadow-lg sm:flex-row sm:items-stretch sm:gap-0 sm:rounded-full',
          className,
        )}
      >
        {children}
      </form>
    </SearchPillContext>
  )
}
