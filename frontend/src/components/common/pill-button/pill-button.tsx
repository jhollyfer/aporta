import * as React from 'react'
import { Link } from '@tanstack/react-router'
import type { LinkProps } from '@tanstack/react-router'

import type { Merge } from '@aporta/shared'

import { buttonVariants } from '#/components/ui/button'
import { cn } from '#/lib/cn'

export type PillTone = 'moss' | 'sun' | 'danger' | 'outline' | 'link'
export type PillScale = 'md' | 'lg'

/** Os tons do Aporta sobre as variantes do `Button` do shadcn: o link não tem pílula nem preenchimento. */
const TONE_VARIANT = {
  moss: 'moss',
  sun: 'sun',
  danger: 'danger',
  outline: 'ink',
  link: 'moss-link',
} as const satisfies Record<
  PillTone,
  Parameters<typeof buttonVariants>[0] extends infer P
    ? P extends { variant?: infer V }
      ? NonNullable<V>
      : never
    : never
>

const SCALE_SIZE = {
  md: 'pill-md',
  lg: 'pill-lg',
} as const satisfies Record<PillScale, string>

type PillStyle = { tone?: PillTone; scale?: PillScale }

/** A variante e o tamanho do `Button` do shadcn para um tom e uma escala da casa. */
export function pillStyle({ tone = 'moss', scale = 'md' }: PillStyle) {
  return { variant: TONE_VARIANT[tone], size: SCALE_SIZE[scale] } as const
}

/** As classes de um botão em pílula, para o link (`PillButton`). */
export function pillVariants(style: PillStyle): string {
  return buttonVariants(pillStyle(style))
}

type PillButtonProps = Merge<
  LinkProps,
  PillStyle & {
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
