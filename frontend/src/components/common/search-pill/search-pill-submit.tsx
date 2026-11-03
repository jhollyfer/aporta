import * as React from 'react'
import { MagnifyingGlass } from '@phosphor-icons/react'

import { Button } from '#/components/ui/button'
import { m } from '#/paraglide/messages'

export function SearchPillSubmit(): React.JSX.Element {
  return (
    <Button
      type="submit"
      variant="moss"
      size="pill-md"
      className="h-12 px-6 font-bold"
    >
      <MagnifyingGlass aria-hidden weight="bold" className="size-5" />
      {m.search_submit()}
    </Button>
  )
}
