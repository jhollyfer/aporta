import * as React from 'react'
import { MagnifyingGlass } from '@phosphor-icons/react'

import { m } from '#/paraglide/messages'

export function SearchPillSubmit(): React.JSX.Element {
  return (
    <button
      type="submit"
      className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-moss px-6 text-sm font-bold text-paper transition-[background-color,transform] hover:bg-moss-deep active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100"
    >
      <MagnifyingGlass aria-hidden weight="bold" className="size-5" />
      {m.search_submit()}
    </button>
  )
}
