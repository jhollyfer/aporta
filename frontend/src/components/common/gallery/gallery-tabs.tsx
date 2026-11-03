import * as React from 'react'

import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { PHOTO_ENVIRONMENT_LABELS } from '#/lib/labels'

import { useGallery } from './gallery-context'

/**
 * Abas por ambiente: só os que o anúncio tem foto, na ordem em que aparecem. São as `Tabs` do
 * shadcn (Base UI) sem painel por aba: a foto grande abaixo muda e a aba marca onde se está.
 */
export function GalleryTabs(): React.JSX.Element {
  const { listing, index, jumpTo } = useGallery()
  const current = listing.photos[index]?.environment
  const environments = [...new Set(listing.photos.map((p) => p.environment))]

  return (
    <Tabs
      value={current}
      onValueChange={(value) => {
        const environment = environments.find((item) => item === value)
        if (environment) jumpTo(environment)
      }}
    >
      <TabsList className="h-auto flex-wrap justify-start gap-2 bg-transparent p-0">
        {environments.map((environment) => (
          <TabsTrigger
            key={environment}
            value={environment}
            className="h-auto min-h-11 flex-none rounded-full border border-line px-4 text-sm font-semibold text-ink-soft data-active:border-moss data-active:bg-moss data-active:text-paper dark:data-active:border-moss dark:data-active:bg-moss dark:data-active:text-paper sm:min-h-9"
          >
            {PHOTO_ENVIRONMENT_LABELS[environment]()}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
