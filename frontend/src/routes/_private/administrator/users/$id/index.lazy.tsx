import * as React from 'react'
import { createLazyFileRoute, getRouteApi } from '@tanstack/react-router'

import { UserAccess } from './-components/user-access'

export const Route = createLazyFileRoute('/_private/administrator/users/$id/')({
  component: RouteComponent,
})

const route = getRouteApi('/_private/administrator/users/$id/')

function RouteComponent(): React.JSX.Element {
  const { id } = route.useParams()

  return <UserAccess id={id} />
}
