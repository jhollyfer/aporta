import { m } from '#/paraglide/messages'

import type {
  ListingPeriod,
  ListingType,
  PhotoEnvironment,
  PlaceCategory,
  UserRole,
} from '@aporta/shared'

/**
 * Os rótulos de cada valor fechado do vocabulário, no idioma da requisição.
 *
 * O valor é função e não string: a mensagem do Paraglide é lida no render, no
 * idioma de quem visita, e uma string resolvida ao carregar o módulo congelaria
 * o idioma da primeira requisição do servidor. O `Record` com chave fechada faz
 * valor novo no `shared/` sem rótulo aqui deixar de compilar.
 */
export const LISTING_TYPE_LABELS: Record<ListingType, () => string> = {
  HOUSE: () => m.label_type_house(),
  APARTMENT: () => m.label_type_apartment(),
  KITNET: () => m.label_type_kitnet(),
  ROOM: () => m.label_type_room(),
  HOTEL: () => m.label_type_hotel(),
}

export const LISTING_PERIOD_LABELS: Record<ListingPeriod, () => string> = {
  SEMESTER: () => m.label_period_semester(),
  ACADEMIC_YEAR: () => m.label_period_academic_year(),
  MONTHLY: () => m.label_period_monthly(),
  DAILY: () => m.label_period_daily(),
}

export const PLACE_CATEGORY_LABELS: Record<PlaceCategory, () => string> = {
  EAT: () => m.label_place_eat(),
  DRINK: () => m.label_place_drink(),
  EVENT: () => m.label_place_event(),
  SERVICE: () => m.label_place_service(),
}

export const PHOTO_ENVIRONMENT_LABELS: Record<PhotoEnvironment, () => string> =
  {
    FACADE: () => m.label_env_facade(),
    BEDROOM: () => m.label_env_bedroom(),
    BATHROOM: () => m.label_env_bathroom(),
    KITCHEN: () => m.label_env_kitchen(),
    LIVING: () => m.label_env_living(),
  }

export const USER_ROLE_LABELS: Record<UserRole, () => string> = {
  OWNER: () => m.label_role_owner(),
  MODERATOR: () => m.label_role_moderator(),
  ADMINISTRATOR: () => m.label_role_administrator(),
}
