import { ListingCardAvailable } from './listing-card-available'
import { ListingCardBadge } from './listing-card-badge'
import { ListingCardMeta } from './listing-card-meta'
import { ListingCardPhoto } from './listing-card-photo'
import { ListingCardPrice } from './listing-card-price'
import { ListingCardRoot } from './listing-card'
import { ListingCardTitle } from './listing-card-title'

/**
 * O card do anúncio como compound component: `ListingCard` é a raiz, que
 * guarda o anúncio no contexto, e as partes se compõem como o lugar pedir (a
 * lista usa todas, o mapa usa só foto e preço).
 */
export const ListingCard = Object.assign(ListingCardRoot, {
  Photo: ListingCardPhoto,
  Badge: ListingCardBadge,
  Title: ListingCardTitle,
  Meta: ListingCardMeta,
  Price: ListingCardPrice,
  Available: ListingCardAvailable,
})
