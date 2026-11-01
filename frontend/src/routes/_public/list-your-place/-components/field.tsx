import * as React from 'react'

import { cn } from '#/lib/cn'

type FieldProps = {
  label: string
  error?: string
  hint?: string
  htmlFor: string
  className?: string
  children: React.ReactNode
}

/**
 * Rótulo, controle e erro de um campo. O erro é ligado ao controle por
 * `aria-describedby` (quem cuida disso é `errorId`) e anunciado com
 * `role="alert"`; só cor vermelha não diz nada a quem não a distingue.
 */
export function Field({
  label,
  error,
  hint,
  htmlFor,
  className,
  children,
}: FieldProps): React.JSX.Element {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="text-sm font-bold text-ink">
        {label}
      </label>
      {hint !== undefined && (
        <p id={hintId(htmlFor)} className="text-sm text-ink-soft">
          {hint}
        </p>
      )}
      {children}
      {error !== undefined && (
        <p
          id={errorId(htmlFor)}
          role="alert"
          className="text-sm font-bold text-danger"
        >
          {error}
        </p>
      )}
    </div>
  )
}

export function errorId(name: string): string {
  return `${name}-error`
}

export function hintId(name: string): string {
  return `${name}-hint`
}

/** As props de acessibilidade do controle: inválido e a quem apontar para o erro. */
export function invalidProps(
  invalid: boolean,
  name: string,
): { 'aria-invalid': boolean; 'aria-describedby': string | undefined } {
  let describedBy: string | undefined
  if (invalid) describedBy = errorId(name)

  return { 'aria-invalid': invalid, 'aria-describedby': describedBy }
}

export const CONTROL =
  'h-12 w-full rounded-xl border border-line bg-surface px-4 text-base text-ink'
