import { m } from '#/paraglide/messages'

import type {
  ActiveStatus,
  ListingPeriod,
  ListingStatus,
  ListingType,
  PhotoEnvironment,
  PlaceCategory,
  ReportReason,
  ReportStatus,
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

export const ACTIVE_STATUS_LABELS: Record<ActiveStatus, () => string> = {
  ACTIVE: () => m.label_account_active(),
  INACTIVE: () => m.label_account_inactive(),
}

export const LISTING_STATUS_LABELS: Record<ListingStatus, () => string> = {
  DRAFT: () => m.label_status_draft(),
  PENDING: () => m.label_status_pending(),
  PUBLISHED: () => m.label_status_published(),
  ARCHIVED: () => m.label_status_archived(),
}

/**
 * Os estados como nome de **fila** da equipe: o `DRAFT` que ela vê é o que voltou ao dono
 * com um motivo, e "rascunho" não diz isso a quem modera.
 */
export const STAFF_LISTING_FILTER_LABELS: Record<ListingStatus, () => string> =
  {
    PENDING: () => m.staff_filter_pending(),
    DRAFT: () => m.staff_filter_draft(),
    PUBLISHED: () => m.staff_filter_published(),
    ARCHIVED: () => m.staff_filter_archived(),
  }

export const REPORT_REASON_LABELS: Record<ReportReason, () => string> = {
  SCAM: () => m.label_reason_scam(),
  NOT_AVAILABLE: () => m.label_reason_not_available(),
  FAKE_PHOTOS: () => m.label_reason_fake_photos(),
  WRONG_INFO: () => m.label_reason_wrong_info(),
  OTHER: () => m.label_reason_other(),
}

export const REPORT_STATUS_LABELS: Record<ReportStatus, () => string> = {
  OPEN: () => m.label_report_open(),
  RESOLVED: () => m.label_report_resolved(),
}
