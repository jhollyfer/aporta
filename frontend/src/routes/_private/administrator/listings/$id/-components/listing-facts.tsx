import * as React from 'react'

import type { AdministratorListingShowResponse } from '@aporta/shared'

import { Costs } from '#/components/common/costs'
import { formatCurrency, formatDate, formatDateTime } from '#/lib/format'
import { LISTING_PERIOD_LABELS, LISTING_TYPE_LABELS } from '#/lib/labels'
import { m } from '#/paraglide/messages'
import { getLocale } from '#/paraglide/runtime'

function Fact({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-sm font-bold text-ink-soft">{label}</dt>
      <dd className="text-base font-bold break-words text-ink">{children}</dd>
    </div>
  )
}

/**
 * O que a equipe confere para decidir: valor, o que está incluso, endereço, contato, texto
 * e regras. O WhatsApp aparece por extenso porque é a conferência de golpe mais comum
 * (o mesmo número em anúncios de donos diferentes), e a equipe precisa lê-lo, não só clicar.
 * É o mesmo dado que o visitante verá; nada aqui é exclusivo do painel além das datas.
 */
export function ListingFacts({
  listing,
}: {
  listing: AdministratorListingShowResponse
}): React.JSX.Element {
  const locale = getLocale()
  const { monthly, daily } = listing.price
  const minimum = m.detail_minimum_value({ count: listing.minimumStayMonths })

  return (
    <div className="flex flex-col gap-6">
      <dl className="grid grid-cols-1 gap-x-6 gap-y-4 min-[480px]:grid-cols-2">
        <Fact label={m.staff_fact_type()}>
          {LISTING_TYPE_LABELS[listing.type]()}
        </Fact>
        <Fact label={m.detail_price_title()}>
          {monthly !== null && (
            <span className="block">
              {formatCurrency(monthly, locale)}
              {m.price_per_month()}
            </span>
          )}
          {daily !== null && (
            <span className="block">
              {formatCurrency(daily, locale)}
              {m.price_per_day()}
            </span>
          )}
        </Fact>
        <Fact label={m.detail_address()}>
          {listing.address}
          {', '}
          {listing.neighborhood.name}
        </Fact>
        <Fact label={m.staff_fact_whatsapp()}>{listing.owner.whatsapp}</Fact>
        <Fact label={m.detail_periods()}>
          {listing.periods
            .map((period) => LISTING_PERIOD_LABELS[period]())
            .join(', ')}
        </Fact>
        <Fact label={m.detail_minimum()}>{minimum}</Fact>
        <Fact label={m.detail_available()}>
          {formatDate(listing.availableFrom, locale)}
        </Fact>
        <Fact label={m.staff_fact_rooms()}>
          {m.staff_fact_rooms_value({
            bedrooms: m.card_bedrooms({ count: listing.bedrooms }),
            bathrooms: m.count_bathrooms({ count: listing.bathrooms }),
          })}
        </Fact>
        <Fact label={m.staff_fact_sent()}>
          {formatDateTime(listing.createdAt, locale)}
        </Fact>
        <Fact label={m.staff_column_updated()}>
          {formatDateTime(listing.updatedAt, locale)}
        </Fact>
      </dl>

      <section aria-labelledby="facts-costs" className="flex flex-col gap-2">
        <h3 id="facts-costs" className="text-sm font-bold text-ink-soft">
          {m.staff_fact_includes()}
        </h3>
        <Costs costs={listing.costs} />
      </section>

      <section aria-labelledby="facts-about" className="flex flex-col gap-2">
        <h3 id="facts-about" className="text-sm font-bold text-ink-soft">
          {m.detail_about_title()}
        </h3>
        <p className="text-base break-words whitespace-pre-line text-ink">
          {listing.description}
        </p>
      </section>

      {listing.rules.length > 0 && (
        <section aria-labelledby="facts-rules" className="flex flex-col gap-2">
          <h3 id="facts-rules" className="text-sm font-bold text-ink-soft">
            {m.detail_rules_title()}
          </h3>
          <ul className="list-disc pl-5 text-base text-ink">
            {listing.rules.map((rule) => (
              <li key={rule} className="break-words">
                {rule}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
