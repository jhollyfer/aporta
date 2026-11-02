import * as React from 'react'
import { Link } from '@tanstack/react-router'
import type { LinkProps } from '@tanstack/react-router'
import { cva } from 'class-variance-authority'
import type { VariantProps } from 'class-variance-authority'

import type { Merge } from '@aporta/shared'

import { cn } from '#/lib/cn'

/**
 * O botão da casa, em forma de link. Sem `components/ui/button` porque o Aporta
 * não usa o shadcn: dois botões feitos à mão para a mesma ação divergem, então
 * há um só, com variantes.
 *
 *   moss     a ação principal da área
 *   sun      a ação de contato (WhatsApp, anunciar): o acento quente, no máximo um por tela
 *   outline  a secundária de formulário (botão), com o contorno no tom da tinta
 *   link     a ação que não é a principal da tela: texto sublinhado, sem pílula (`frontend.md` §10.8)
 *   danger   a ação que não se desfaz (arquivar), só dentro da confirmação
 */
export const pillVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-full font-extrabold transition-[color,background-color,transform] active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100',
  {
    variants: {
      tone: {
        moss: 'bg-moss text-paper hover:bg-moss-deep',
        sun: 'bg-sun text-on-sun hover:bg-sun-deep',
        danger: 'bg-danger text-paper hover:brightness-90',
        outline: 'border-2 border-ink text-ink hover:bg-ink hover:text-paper',
        link: 'text-moss underline underline-offset-4 hover:text-moss-deep',
      },
      scale: {
        md: 'h-11 px-5 text-sm',
        lg: 'h-14 px-8 text-base',
      },
    },
    compoundVariants: [
      // O link não tem pílula: sem raio nem preenchimento lateral, mantendo a altura de 44px do alvo de toque.
      { tone: 'link', class: 'rounded-md px-1' },
    ],
    defaultVariants: { tone: 'moss', scale: 'md' },
  },
)

type PillButtonProps = Merge<
  LinkProps,
  VariantProps<typeof pillVariants> & {
    className?: string
    children: React.ReactNode
  }
>

export function PillButton({
  tone,
  scale,
  className,
  children,
  ...link
}: PillButtonProps): React.JSX.Element {
  return (
    <Link {...link} className={cn(pillVariants({ tone, scale }), className)}>
      {children}
    </Link>
  )
}
