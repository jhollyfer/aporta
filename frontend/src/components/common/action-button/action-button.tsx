import * as React from 'react'
import { CircleNotch } from '@phosphor-icons/react'
import type { VariantProps } from 'class-variance-authority'

import type { Merge } from '@aporta/shared'

import { pillVariants } from '#/components/common/pill-button'
import { cn } from '#/lib/cn'

type ActionButtonProps = Merge<
  React.ComponentProps<'button'>,
  VariantProps<typeof pillVariants> & {
    /** Há um envio em andamento: o botão desabilita, anuncia `aria-busy` e mostra o giro. */
    pending?: boolean
  }
>

/**
 * O botão de ação da casa (enviar formulário, sair), com o mesmo desenho do
 * `PillButton`, que é link e não serve a quem envia. O estilo vem do `pillVariants`
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
    <button
      {...button}
      type={type}
      disabled={disabled || pending}
      aria-busy={pending}
      className={cn(
        pillVariants({ tone, scale }),
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
    </button>
  )
}
