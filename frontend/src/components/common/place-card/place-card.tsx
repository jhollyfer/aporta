import * as React from 'react'
import { Clock, MapPin } from '@phosphor-icons/react'

import type { Place } from '@aporta/shared'

import { WhatsAppCta } from '#/components/common/whatsapp-cta'
import { NEIGHBORHOODS } from '#/lib/data/neighborhoods'
import { dayOfMonth, shortMonth } from '#/lib/format'
import { m } from '#/paraglide/messages'
import { getLocale } from '#/paraglide/runtime'

/**
 * O cartão curto de um lugar do guia: nome, endereço, horário e, quando houver,
 * o botão de WhatsApp. Evento ganha a data em destaque, porque para quem acabou
 * de chegar a primeira pergunta sobre um evento é "quando".
 */
export function PlaceCard({ place }: { place: Place }): React.JSX.Element {
  const neighborhood = NEIGHBORHOODS.find((n) => n.slug === place.neighborhood)
  const locale = getLocale()

  return (
    <article className="flex gap-4 rounded-card bg-surface p-4">
      {place.date !== null && (
        <time
          dateTime={place.date}
          className="flex w-20 shrink-0 flex-col items-center justify-center rounded-2xl bg-clay-wash text-center font-extrabold text-clay"
        >
          <span className="text-3xl leading-none">
            {dayOfMonth(place.date)}
          </span>
          <span className="text-xs">{shortMonth(place.date, locale)}</span>
        </time>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <h3 className="text-lg font-extrabold text-ink">{place.name}</h3>
        <p className="text-ink-soft">{place.description}</p>
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-soft">
          <span className="inline-flex items-center gap-1">
            <MapPin aria-hidden className="size-4" />
            {place.address}, {neighborhood?.name}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock aria-hidden className="size-4" />
            {place.hours}
          </span>
        </p>
        {place.whatsapp !== null && (
          <WhatsAppCta
            phone={place.whatsapp}
            message={m.guide_whatsapp_message({ name: place.name })}
            label={m.guide_whatsapp_label()}
            className="h-10 w-fit px-4 text-sm"
          />
        )}
      </div>
    </article>
  )
}
