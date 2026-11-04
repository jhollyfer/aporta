import * as React from 'react'
import { createLazyFileRoute } from '@tanstack/react-router'

import { PlaceCreateForm } from '../-components/place-form'

export const Route = createLazyFileRoute('/_private/administrator/places/new/')(
  { component: RouteComponent },
)

function RouteComponent(): React.JSX.Element {
  return <PlaceCreateForm />
}
