import * as React from 'react'
import L from 'leaflet'
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet'

import type { StorefrontListingPinResponse } from '@aporta/shared'

import { formatCurrency } from '#/lib/format'
import { LISTING_TYPE_LABELS } from '#/lib/labels'
import { pinPrice, roundWindow } from '#/lib/listing-map'
import { getLocale } from '#/paraglide/runtime'

import { useListingMap } from './listing-map-context'

/** Centro de Benjamin Constant: o mapa nasce aqui quando não há anúncio para enquadrar. */
const CITY_CENTER: L.LatLngTuple = [-4.3775, -70.0312]

/**
 * A espera depois do último movimento antes de pedir os pins. Um arrasto dispara `moveend`
 * ao soltar, mas um zoom por roda ou por toque duplo dispara vários seguidos, e cada um
 * seria um pedido que o limite de 120 por minuto da API contaria contra a pessoa.
 */
const WINDOW_DEBOUNCE_MS = 300

function priceIcon(label: string, active: boolean): L.DivIcon {
  /*
   * O pin é HTML puro porque o Leaflet o desenha fora do React. O texto é só
   * o valor formatado em reais (dígitos e símbolo), nunca texto do dono do
   * anúncio: nada vindo de usuário entra neste `html`.
   */
  return L.divIcon({
    className: '',
    html: `<div class="price-pin" data-active="${active}">${label}</div>`,
    iconSize: [0, 0],
  })
}

/**
 * Mede o mapa e reenquadra nos cards quando o filtro muda.
 *
 * O reenquadre depende de `fitKey` e **não** dos cards: trocar de página mudaria os cards, e
 * o mapa pularia para longe de onde a pessoa estava olhando. Os cards entram por ref, lidos
 * só no momento do filtro novo.
 */
function WindowWatcher(): null {
  const map = useMap()
  const { cards, fitKey, onWindowChange } = useListingMap()
  const cardsRef = React.useRef(cards)
  cardsRef.current = cards
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const fitPending = React.useRef(false)

  /*
   * O mapa sem tamanho (nasce dentro do contêiner escondido do celular) tem janela de largura
   * zero: pedir pins para ela gastaria o limite da API por um quadro sem pixel visível, e
   * enquadrar nos cards com a caixa em zero escolheria um zoom sem sentido.
   */
  const visible = React.useCallback(() => {
    const { x, y } = map.getSize()
    return x > 0 && y > 0
  }, [map])

  const emit = React.useCallback(() => {
    if (!visible()) return
    const bounds = map.getBounds()
    onWindowChange(
      roundWindow({
        west: bounds.getWest(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        north: bounds.getNorth(),
      }),
    )
  }, [map, onWindowChange, visible])

  const fit = React.useCallback(() => {
    const current = cardsRef.current
    if (current.length === 0) {
      map.setView(CITY_CENTER, 14, { animate: false })
      return
    }
    const bounds = L.latLngBounds(current.map((l) => [l.lat, l.lng]))
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16, animate: false })
  }, [map])

  useMapEvents({
    moveend: () => {
      if (timer.current !== null) clearTimeout(timer.current)
      timer.current = setTimeout(emit, WINDOW_DEBOUNCE_MS)
    },
  })

  React.useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current)
    },
    [],
  )

  /*
   * No celular a lista e o mapa se alternam por CSS, então o mapa pode nascer
   * dentro de um contêiner escondido (largura zero). O Leaflet só mede o
   * contêiner na criação, e sem este aviso os ladrilhos ficam cortados quando
   * o mapa aparece. Ao aparecer, o enquadramento que ficou pendente acontece.
   *
   * Quem mede a janela é sempre o `moveend`: `setView`, `fitBounds` e `invalidateSize` o
   * disparam mesmo quando a vista não mudou. Medir também na mão, logo depois do
   * enquadramento, mandaria dois pedidos por quadro (um antes e outro depois do ajuste), e
   * o primeiro seria jogado fora.
   */
  React.useEffect(() => {
    const observer = new ResizeObserver(() => {
      map.invalidateSize()
      if (!visible() || !fitPending.current) return
      fitPending.current = false
      fit()
    })
    observer.observe(map.getContainer())
    return () => observer.disconnect()
  }, [map, visible, fit])

  /* O primeiro quadro e cada filtro novo: enquadra nos cards. */
  React.useEffect(() => {
    if (!visible()) {
      fitPending.current = true
      return
    }
    fit()
  }, [fitKey, visible, fit])

  return null
}

type PinMarkerProps = {
  pin: StorefrontListingPinResponse
  active: boolean
  locale: string
  onSelect: (slug: string | null) => void
}

/**
 * Um pin. `memo` e `useMemo` porque a janela pode trazer 500 deles: tocar num pin muda só o
 * `active` de dois, e sem isto os outros 498 refariam o `divIcon` e re-ligariam o clique.
 */
const PinMarker = React.memo(function PinMarker({
  pin,
  active,
  locale,
  onSelect,
}: PinMarkerProps): React.JSX.Element {
  const price = formatCurrency(pinPrice(pin.price), locale)
  const icon = React.useMemo(() => priceIcon(price, active), [price, active])
  const handlers = React.useMemo(
    () => ({ click: () => onSelect(pin.slug) }),
    [onSelect, pin.slug],
  )

  return (
    <Marker
      position={[pin.lat, pin.lng]}
      icon={icon}
      title={`${LISTING_TYPE_LABELS[pin.type]()}, ${price}`}
      eventHandlers={handlers}
    />
  )
})

/**
 * O mapa em si. Mora num arquivo à parte porque o Leaflet lê `window` ao ser
 * importado, e importar no servidor derrubaria o SSR: a casca (`listing-map.tsx`)
 * só carrega este arquivo no cliente.
 *
 * Tile do OpenStreetMap, com a atribuição que a licença exige. O mapa é apoio,
 * não o filtro principal: nem todo endereço da cidade tem ponto preciso.
 */
export default function ListingMapCanvas(): React.JSX.Element {
  const { pins, activeSlug, onSelect } = useListingMap()
  const locale = getLocale()

  return (
    <MapContainer
      center={CITY_CENTER}
      zoom={14}
      scrollWheelZoom={false}
      className="size-full min-h-80 rounded-card"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <WindowWatcher />
      {pins.map((pin) => (
        <PinMarker
          key={pin.id}
          pin={pin}
          active={pin.slug === activeSlug}
          locale={locale}
          onSelect={onSelect}
        />
      ))}
    </MapContainer>
  )
}
