import * as React from 'react'
import L from 'leaflet'
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'

import { formatCurrency } from '#/lib/format'
import { getLocale } from '#/paraglide/runtime'

import { useListingMap } from './listing-map-context'

/** Centro de Benjamin Constant: o mapa nasce aqui quando não há anúncio para enquadrar. */
const CITY_CENTER: L.LatLngTuple = [-4.3775, -70.0312]

/** Dias em que a diária equivale ao mês, só para o rótulo do pin de hotel. */
const DAYS_PER_MONTH = 30

/**
 * O valor que o pin mostra: o mensal, ou a diária vezes 30 quando o dono só anuncia a
 * diária (hotel). Sem a conversão, o pin do hotel diria R$ 160 ao lado de kitnets de
 * R$ 900 e pareceria o imóvel mais barato do mapa. O card mostra o valor na unidade
 * em que o dono anunciou; esta conta é só do rótulo.
 */
function pinPrice(price: { monthly: number | null; daily: number | null }) {
  if (price.monthly !== null) return price.monthly
  if (price.daily !== null) return price.daily * DAYS_PER_MONTH
  return 0
}

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

function FitToListings(): null {
  const map = useMap()
  const { listings } = useListingMap()

  /*
   * No celular a lista e o mapa se alternam por CSS, então o mapa pode nascer
   * dentro de um contêiner escondido (largura zero). O Leaflet só mede o
   * contêiner na criação, e sem este aviso os ladrilhos ficam cortados quando
   * o mapa aparece.
   */
  React.useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(map.getContainer())
    return () => observer.disconnect()
  }, [map])

  React.useEffect(() => {
    if (listings.length === 0) {
      map.setView(CITY_CENTER, 14)
      return
    }
    const bounds = L.latLngBounds(listings.map((l) => [l.lat, l.lng]))
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 })
  }, [listings, map])

  return null
}

/**
 * O mapa em si. Mora num arquivo à parte porque o Leaflet lê `window` ao ser
 * importado, e importar no servidor derrubaria o SSR: a casca (`listing-map.tsx`)
 * só carrega este arquivo no cliente.
 *
 * Tile do OpenStreetMap, com a atribuição que a licença exige. O mapa é apoio,
 * não o filtro principal: nem todo endereço da cidade tem ponto preciso.
 */
export default function ListingMapCanvas(): React.JSX.Element {
  const { listings, activeSlug, onSelect } = useListingMap()
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
      <FitToListings />
      {listings.map((listing) => (
        <Marker
          key={listing.id}
          position={[listing.lat, listing.lng]}
          icon={priceIcon(
            formatCurrency(pinPrice(listing.price), locale),
            listing.slug === activeSlug,
          )}
          eventHandlers={{ click: () => onSelect(listing.slug) }}
        />
      ))}
    </MapContainer>
  )
}
