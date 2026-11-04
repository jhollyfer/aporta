import * as React from 'react'
import { createLazyFileRoute, getRouteApi } from '@tanstack/react-router'

import { PlaceEditForm } from '../-components/place-form'

export const Route = createLazyFileRoute('/_private/administrator/places/$id/')(
  { component: RouteComponent },
)

const route = getRouteApi('/_private/administrator/places/$id/')

function RouteComponent(): React.JSX.Element {
  const { id } = route.useParams()

  return <PlaceEditForm id={id} />
}
