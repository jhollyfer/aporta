import type * as React from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createLazyFileRoute, getRouteApi } from '@tanstack/react-router'

import { Gallery } from '#/components/common/gallery'
import { OwnerCard } from '#/components/common/owner-card'
import { WhatsAppCta } from '#/components/common/whatsapp-cta'
import { storefrontListingQueryOptions } from '#/integrations/tanstack-query/queries/storefront'
import { formatCurrency, formatDate } from '#/lib/format'
import { LISTING_PERIOD_LABELS, LISTING_TYPE_LABELS } from '#/lib/labels'
import { m } from '#/paraglide/messages'
import { getLocale } from '#/paraglide/runtime'

import { ReportListing } from './-components/report-listing'

import { Costs } from '#/components/common/costs'

export const Route = createLazyFileRoute('/_public/listings/$slug')({
  component: RouteComponent,
})

const route = getRouteApi('/_public/listings/$slug')

/**
 * A barra do celular é `sticky` dentro do contêiner da página e não `fixed`: ela gruda no rodapé da
 * tela enquanto o conteúdo rola e para no fim dele, em vez de cobrir o rodapé do site.
 */
const STICKY_BAR =
  'sticky bottom-0 z-40 -mx-4 bg-paper p-3 shadow-[0_-4px_16px_rgb(0_0_0/0.12)] lg:hidden' // taste-skill-ignore: barra fixa

/**
 * O detalhe: galeria por ambiente, o valor com o que está incluso, as regras da
 * casa e o dono. O botão de WhatsApp é a ação principal e fica preso ao rodapé no
 * celular, onde a pessoa já rolou a página inteira até decidir.
 */
function RouteComponent(): React.JSX.Element {
  const { slug } = route.useParams()
  const { data: listing } = useSuspenseQuery(
    storefrontListingQueryOptions(slug),
  )
  const locale = getLocale()
  const { monthly, daily } = listing.price
  let minimum = m.detail_minimum_value({ count: listing.minimumStayMonths })
  if (listing.minimumStayMonths === 1) minimum = m.detail_minimum_one()

  const message = m.whatsapp_message({
    title: listing.title,
    neighborhood: listing.neighborhood.name,
  })

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pt-8">
      <header className="enter flex flex-col gap-2">
        <p className="text-sm font-bold text-moss">
          {LISTING_TYPE_LABELS[listing.type]()} · {listing.neighborhood.name}
        </p>
        <h1 className="max-w-4xl text-[clamp(2rem,4.6vw,4.25rem)] leading-[1.04] font-extrabold tracking-tight break-words text-ink">
          {listing.title}
        </h1>
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Gallery listing={listing} className="enter [--i:1]">
          <Gallery.Tabs />
          <Gallery.Main />
          <Gallery.Thumbs />
        </Gallery>

        <div className="flex flex-col gap-6">
          <section
            aria-labelledby="price-title"
            className="reveal flex flex-col gap-2"
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

          <dl className="reveal grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
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
        className="reveal flex max-w-3xl flex-col gap-3"
      >
        <h2 id="about-title" className="text-2xl font-extrabold text-ink">
          {m.detail_about_title()}
        </h2>
        <p className="text-lg text-ink">{listing.description}</p>
      </section>

      <section
        aria-labelledby="rules-title"
        className="reveal flex max-w-3xl flex-col gap-3"
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

      <ReportListing slug={listing.slug} title={listing.title} />

      {/* A barra do celular: última filha do contêiner, para o `sticky` parar acima do rodapé do site. */}
      <div className={STICKY_BAR}>
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
