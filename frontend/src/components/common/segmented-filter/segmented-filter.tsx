import * as React from 'react'

import { Button } from '#/components/ui/button'
import { cn } from '#/lib/cn'

type SegmentedFilterProps<TValue extends string> = {
  /** O nome do grupo para o leitor de tela ("Estado do anúncio"). */
  label: string
  value: TValue
  options: ReadonlyArray<{ value: TValue; label: string }>
  onChange: (value: TValue) => void
}

/**
 * O filtro de estado das filas da equipe: poucas opções, todas à vista, uma marcada.
 * Botões com `aria-pressed` e não `role="tab"`: não há painel por opção, a lista abaixo é
 * a mesma e só muda de conteúdo, e `tab` prometeria um teclado de setas que não existe.
 *
 * Quebra linha em vez de rolar: no celular de 320 px as quatro opções cabem em duas
 * linhas, e uma faixa rolável esconderia o que existe.
 */
export function SegmentedFilter<TValue extends string>({
  label,
  value,
  options,
  onChange,
}: SegmentedFilterProps<TValue>): React.JSX.Element {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = option.value === value

        return (
          <Button
            variant="ghost"
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-bold transition-colors motion-reduce:transition-none',
              active &&
                'border-moss bg-moss-wash text-moss-deep hover:bg-moss-wash',
              !active &&
                'border-line bg-surface text-ink hover:border-ink hover:bg-surface',
            )}
          >
            {option.label}
          </Button>
        )
      })}
    </div>
  )
}
