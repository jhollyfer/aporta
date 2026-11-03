import * as React from 'react'

import { Alert, AlertDescription } from '#/components/ui/alert'

export function FormNotice({
  children,
}: {
  children?: string
}): React.JSX.Element | null {
  if (!children) return null

  return (
    <Alert className="rounded-xl border-0 bg-clay-wash px-4 py-3">
      <AlertDescription className="text-sm font-bold text-ink">
        {children}
      </AlertDescription>
    </Alert>
  )
}
