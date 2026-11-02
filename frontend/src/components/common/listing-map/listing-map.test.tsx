// @vitest-environment jsdom
import * as React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { StorefrontListingPinResponse } from '@aporta/shared'

import { HTTPError } from '#/integrations/tanstack-query/http'

import { ListingMapContext } from './listing-map-context'
import type { ListingMapContextValue } from './listing-map-context'
import { ListingMapStatus } from './listing-map-status'
import { ListingMapSummary } from './listing-map-summary'

/*
 * O `Link` do router precisa do router montado. O que se confere aqui é o resumo e o aviso,
 * não a navegação: um `<a>` com o destino já diz o que importa.
 */
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    params,
    children,
    className,
  }: {
    params: { slug: string }
    children: React.ReactNode
    className?: string
  }) => (
    <a href={`/listings/${params.slug}`} className={className}>
      {children}
    </a>
  ),
}))

const PIN: StorefrontListingPinResponse = {
  id: '2d2c3a77-5a3c-4f43-9d36-3a6a4b5d1a10',
  slug: 'kitnet-fora-da-pagina',
  type: 'KITNET',
  lat: -4.3779,
  lng: -70.0309,
  price: { monthly: 900, daily: null },
}

function context(
  patch: Partial<ListingMapContextValue>,
): ListingMapContextValue {
  return {
    cards: [],
    fitKey: '{}',
    activeSlug: null,
    onSelect: () => undefined,
    pins: [],
    total: 0,
    ready: true,
    error: null,
    onRetry: () => undefined,
    onWindowChange: () => undefined,
    ...patch,
  }
}

function renderWith(
  value: ListingMapContextValue,
  children: React.ReactNode,
): void {
  render(<ListingMapContext value={value}>{children}</ListingMapContext>)
}

afterEach(cleanup)

describe('ListingMapSummary', () => {
  it('pin de um anúncio que não está na página de cards: o resumo sai do próprio pin e leva ao anúncio', () => {
    renderWith(
      context({ pins: [PIN], total: 1, activeSlug: PIN.slug }),
      <ListingMapSummary />,
    )

    const link = screen.getByRole('link', { name: /Kitnet/ })

    expect(link.getAttribute('href')).toBe('/listings/kitnet-fora-da-pagina')
    expect(link.textContent).toContain('900')
    expect(link.textContent).toContain('/mês')
  })

  it('o pin do hotel mostra a diária na unidade em que o dono anunciou', () => {
    renderWith(
      context({
        pins: [{ ...PIN, price: { monthly: null, daily: 160 } }],
        total: 1,
        activeSlug: PIN.slug,
      }),
      <ListingMapSummary />,
    )

    expect(screen.getByRole('link').textContent).toContain('/dia')
  })

  it('sem pin selecionado, não desenha nada', () => {
    renderWith(context({ pins: [PIN], total: 1 }), <ListingMapSummary />)

    expect(screen.queryByRole('link')).toBeNull()
  })
})

describe('ListingMapStatus', () => {
  it('janela vazia: diz que não há imóvel e como achar mais', () => {
    renderWith(context({}), <ListingMapStatus />)

    expect(screen.getByRole('status').textContent).toContain(
      'Nenhum imóvel nesta área',
    )
  })

  it('há mais anúncios na janela do que o mapa desenha: pede para aproximar', () => {
    renderWith(context({ pins: [PIN], total: 730 }), <ListingMapStatus />)

    const text = screen.getByRole('status').textContent

    expect(text).toContain('1 de 730')
    expect(text).toContain('Aproxime')
  })

  it('o mapa cabe tudo: nenhum aviso', () => {
    renderWith(context({ pins: [PIN], total: 1 }), <ListingMapStatus />)

    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('antes da primeira janela, nenhum aviso: vazio ainda não é conclusão', () => {
    renderWith(context({ ready: false }), <ListingMapStatus />)

    expect(screen.queryByRole('status')).toBeNull()
  })

  it('429 diz o tempo de espera e oferece tentar de novo', () => {
    const error = new HTTPError(
      { message: 'limite', status: 429, code: 'TOO_MANY_REQUESTS' },
      30,
    )
    const onRetry = vi.fn()

    renderWith(context({ error, onRetry }), <ListingMapStatus />)

    expect(screen.getByRole('alert').textContent).toContain('30 s')
    screen.getByRole('button', { name: 'Tentar de novo' }).click()
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('429 sem Retry-After legível cai na mensagem sem número', () => {
    const error = new HTTPError({
      message: 'limite',
      status: 429,
      code: 'TOO_MANY_REQUESTS',
    })

    renderWith(context({ error }), <ListingMapStatus />)

    expect(screen.getByRole('alert').textContent).toContain(
      'Espere um instante',
    )
  })

  it('outra falha diz que o mapa não carregou', () => {
    const error = new HTTPError({
      message: 'x',
      status: 500,
      code: 'UNKNOWN_ERROR',
    })

    renderWith(context({ error }), <ListingMapStatus />)

    expect(screen.getByRole('alert').textContent).toContain(
      'Não deu para carregar',
    )
  })
})
