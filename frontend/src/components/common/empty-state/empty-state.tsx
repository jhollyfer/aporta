import * as React from 'react'

import { MagnifyingGlass } from '@phosphor-icons/react'

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '#/components/ui/empty'

type EmptyStateProps = {
  title: string
  description: string
  children?: React.ReactNode
}

export function EmptyState({
  title,
  description,
  children,
}: EmptyStateProps): React.JSX.Element {
  return (
    <Empty
      data-slot="empty-state"
      className="rounded-card bg-moss-wash px-6 py-12"
    >
      <EmptyHeader>
        <MagnifyingGlass
          aria-hidden
          className="size-8 text-ink-soft"
          weight="light"
        />
        <EmptyTitle className="text-xl font-extrabold text-ink">
          {title}
        </EmptyTitle>
        <EmptyDescription className="max-w-md text-base text-ink-soft">
          {description}
        </EmptyDescription>
      </EmptyHeader>
      {children !== undefined && <EmptyContent>{children}</EmptyContent>}
    </Empty>
  )
}
