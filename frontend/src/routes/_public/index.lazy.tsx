import type * as React from 'react'
import { createLazyFileRoute } from '@tanstack/react-router'

import { Featured } from './-components/featured'
import { GuideBand } from './-components/guide-band'
import { Hero } from './-components/hero'
import { OwnerBand } from './-components/owner-band'
import { Trust } from './-components/trust'

export const Route = createLazyFileRoute('/_public/')({
  component: RouteComponent,
})

function RouteComponent(): React.JSX.Element {
  return (
    <>
      <Hero />
      <Featured />
      <Trust />
      <GuideBand />
      <OwnerBand />
    </>
  )
}
