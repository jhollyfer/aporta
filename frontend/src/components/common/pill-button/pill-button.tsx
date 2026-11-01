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
 *   outline  a secundária, com o contorno no tom da tinta
 */
const pillVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-full font-extrabold transition-colors motion-reduce:transition-none',
  {
    variants: {
      tone: {
        moss: 'bg-moss text-paper hover:bg-moss-deep',
        sun: 'bg-sun text-ink hover:bg-sun-deep',
        outline: 'border-2 border-ink text-ink hover:bg-ink hover:text-paper',
      },
      scale: {
        md: 'h-11 px-5 text-sm',
        lg: 'h-14 px-8 text-base',
      },
    },
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
