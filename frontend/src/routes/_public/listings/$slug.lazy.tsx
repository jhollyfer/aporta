import type * as React from 'react'
import { createLazyFileRoute, getRouteApi } from '@tanstack/react-router'

import { Gallery } from '#/components/common/gallery'
import { OwnerCard } from '#/components/common/owner-card'
import { WhatsAppCta } from '#/components/common/whatsapp-cta'
import { NEIGHBORHOODS } from '#/lib/data/neighborhoods'
import { formatCurrency, formatDate } from '#/lib/format'
import { LISTING_PERIOD_LABELS, LISTING_TYPE_LABELS } from '#/lib/labels'
import { m } from '#/paraglide/messages'
import { getLocale } from '#/paraglide/runtime'

import { Costs } from './-components/costs'

export const Route = createLazyFileRoute('/_public/listings/$slug')({
  component: RouteComponent,
})

const route = getRouteApi('/_public/listings/$slug')

/**
 * O detalhe: galeria por ambiente, o valor com o que está incluso, as regras da
 * casa e o dono. O botão de WhatsApp é a ação principal e fica preso ao rodapé no
 * celular, onde a pessoa já rolou a página inteira até decidir.
 */
function RouteComponent(): React.JSX.Element {
  const { listing } = route.useLoaderData()
  const locale = getLocale()
  const neighborhood = NEIGHBORHOODS.find(
    (item) => item.slug === listing.neighborhood,
  )
  const { monthly, daily } = listing.price
  let minimum = m.detail_minimum_value({ count: listing.minimumStayMonths })
  if (listing.minimumStayMonths === 1) minimum = m.detail_minimum_one()

  const message = m.whatsapp_message({
    title: listing.title,
    neighborhood: neighborhood?.name ?? '',
  })

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pt-8 pb-28 lg:pb-0">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-bold text-moss">
          {LISTING_TYPE_LABELS[listing.type]()} · {neighborhood?.name}
        </p>
        <h1 className="max-w-3xl text-3xl font-extrabold tracking-tight text-ink sm:text-5xl">
          {listing.title}
        </h1>
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Gallery listing={listing}>
          <Gallery.Tabs />
          <Gallery.Main />
          <Gallery.Thumbs />
        </Gallery>

        <div className="flex flex-col gap-6">
          <section
            aria-labelledby="price-title"
            className="flex flex-col gap-2"
          >
            <h2 id="price-title" className="sr-only">
              {m.detail_price_title()}
            </h2>
            {monthly !== null && (
              <p className="text-4xl font-extrabold text-ink">
                {formatCurrency(monthly, locale)}
                <span className="text-lg font-bold text-ink-soft">
                  {m.price_per_month()}
                </span>
              </p>
            )}
            {daily !== null && (
              <p className="text-4xl font-extrabold text-ink">
                {formatCurrency(daily, locale)}
                <span className="text-lg font-bold text-ink-soft">
                  {m.price_per_day()}
                </span>
              </p>
            )}
            <Costs costs={listing.costs} />
          </section>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
            <div>
              <dt className="font-bold text-ink-soft">
                {m.detail_available()}
              </dt>
              <dd className="text-base font-extrabold text-ink">
                {formatDate(listing.availableFrom, locale)}
              </dd>
            </div>
            <div>
              <dt className="font-bold text-ink-soft">{m.detail_minimum()}</dt>
              <dd className="text-base font-extrabold text-ink">{minimum}</dd>
            </div>
            <div>
              <dt className="font-bold text-ink-soft">{m.detail_periods()}</dt>
              <dd className="text-base font-extrabold text-ink">
                {listing.periods
                  .map((period) => LISTING_PERIOD_LABELS[period]())
                  .join(', ')}
              </dd>
            </div>
            <div>
              <dt className="font-bold text-ink-soft">{m.detail_address()}</dt>
              <dd className="text-base font-extrabold text-ink">
                {listing.address}
              </dd>
            </div>
          </dl>

          <OwnerCard owner={listing.owner} />

          <WhatsAppCta
            phone={listing.owner.whatsapp}
            message={message}
            label={m.whatsapp_cta()}
            className="hidden w-full lg:inline-flex"
          />
        </div>
      </div>

      <section
        aria-labelledby="about-title"
        className="flex max-w-3xl flex-col gap-3"
      >
        <h2 id="about-title" className="text-2xl font-extrabold text-ink">
          {m.detail_about_title()}
        </h2>
        <p className="text-lg text-ink">{listing.description}</p>
      </section>

      <section
        aria-labelledby="rules-title"
        className="flex max-w-3xl flex-col gap-3"
      >
        <h2 id="rules-title" className="text-2xl font-extrabold text-ink">
          {m.detail_rules_title()}
        </h2>
        <ul className="list-disc pl-5 text-lg text-ink">
          {listing.rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </section>

      {/* A barra fixa do celular. Fora do fluxo para não cobrir o fim da página: o `pb-28` do contêiner reserva o espaço. */}
      <div className="fixed inset-x-0 bottom-0 z-40 bg-paper p-3 shadow-[0_-4px_16px_rgb(0_0_0/0.12)] lg:hidden">
        <WhatsAppCta
          phone={listing.owner.whatsapp}
          message={message}
          label={m.whatsapp_cta()}
          className="w-full"
        />
      </div>
    </div>
  )
}
