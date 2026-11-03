import * as React from 'react'

import { Label } from '#/components/ui/label'
import { cn } from '#/lib/cn'
import { errorId, hintId } from '#/lib/form-a11y'

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
      <Label htmlFor={htmlFor} className="text-sm font-bold text-ink">
        {label}
      </Label>
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
