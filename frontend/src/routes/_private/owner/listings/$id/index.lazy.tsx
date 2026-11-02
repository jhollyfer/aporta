import * as React from 'react'
import { createLazyFileRoute, getRouteApi } from '@tanstack/react-router'

import { EditForm } from './-components/edit-form'

export const Route = createLazyFileRoute('/_private/owner/listings/$id/')({
  component: RouteComponent,
})

const route = getRouteApi('/_private/owner/listings/$id/')

function RouteComponent(): React.JSX.Element {
  const { id } = route.useParams()

  return <EditForm id={id} />
}
