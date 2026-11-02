import * as React from 'react'
import { createLazyFileRoute, getRouteApi } from '@tanstack/react-router'

import { ReviewView } from './-components/review-view'

export const Route = createLazyFileRoute(
  '/_private/administrator/listings/$id/',
)({
  component: RouteComponent,
})

const route = getRouteApi('/_private/administrator/listings/$id/')

function RouteComponent(): React.JSX.Element {
  const { id } = route.useParams()

  return <ReviewView id={id} />
}
