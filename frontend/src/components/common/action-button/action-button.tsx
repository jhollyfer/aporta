import * as React from 'react'
import { CircleNotch } from '@phosphor-icons/react'

import type { Merge } from '@aporta/shared'

import { pillStyle } from '#/components/common/pill-button'
import type { PillScale, PillTone } from '#/components/common/pill-button'
import { Button } from '#/components/ui/button'
import { cn } from '#/lib/cn'

type ActionButtonProps = Merge<
  React.ComponentProps<'button'>,
  {
    tone?: PillTone
    scale?: PillScale
    /** Há um envio em andamento: o botão desabilita, anuncia `aria-busy` e mostra o giro. */
    pending?: boolean
  }
>

/**
 * O botão de ação da casa (enviar formulário, sair), com o mesmo desenho do
 * `PillButton`, que é link e não serve a quem envia. O estilo vem do `pillStyle`
 * do `PillButton`: dois botões feitos à mão para a mesma ação divergem.
 *
 * `disabled` no envio é conforto, não proteção: o que impede o efeito duplicado
 * mora no backend. O giro some com `motion-reduce`, e o texto continua o mesmo para
 * o leitor de tela, que ouve o `aria-busy`.
 */
export function ActionButton({
  tone,
  scale,
  pending = false,
  disabled,
  className,
  children,
  type = 'button',
  ...button
}: ActionButtonProps): React.JSX.Element {
  return (
    <Button
      {...button}
      {...pillStyle({ tone, scale })}
      type={type}
      disabled={disabled || pending}
      aria-busy={pending}
      className={cn(
        'disabled:cursor-not-allowed disabled:opacity-70',
        className,
      )}
    >
      {pending && (
        <CircleNotch
          aria-hidden
          weight="bold"
          className="size-5 animate-spin motion-reduce:animate-none"
        />
      )}
      {children}
    </Button>
  )
}
