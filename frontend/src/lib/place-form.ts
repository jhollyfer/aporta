import { PLACE_CATEGORY } from '@aporta/shared'
import type {
  AdministratorPlaceShowResponse,
  AdministratorPlaceWritePayload,
} from '@aporta/shared'

/**
 * Os campos do formulário do lugar, que são as chaves do `AdministratorPlaceWritePayload`.
 * A tela os passa a `applyHTTPErrorToForm` para decidir o que é "erro de um campo" e o que é
 * "erro geral": uma chave que a API acusar e que não esteja aqui não some, vira a mensagem geral.
 */
export const PLACE_FORM_FIELDS = [
  'category',
  'name',
  'description',
  'neighborhood',
  'address',
  'hours',
  'whatsapp',
  'date',
] as const satisfies ReadonlyArray<keyof AdministratorPlaceWritePayload>

/**
 * O lugar como o formulário o escreve. O servidor devolve o bairro como `{ slug, name }` e o
 * formulário trabalha com o `slug`; WhatsApp e dia ausentes viram texto vazio, porque o campo
 * controlado não aceita `null` (e o validator conta vazio como ausente).
 */
export function placeToForm(
  place: AdministratorPlaceShowResponse,
): AdministratorPlaceWritePayload {
  return {
    category: place.category,
    name: place.name,
    description: place.description,
    neighborhood: place.neighborhood.slug,
    address: place.address,
    hours: place.hours,
    whatsapp: place.whatsapp ?? '',
    date: place.date ?? '',
  }
}

/** O formulário de um lugar novo: nada preenchido, e a primeira aba do guia. */
export const EMPTY_PLACE_FORM: Partial<AdministratorPlaceWritePayload> = {
  category: PLACE_CATEGORY.EAT,
  name: '',
  description: '',
  neighborhood: '',
  address: '',
  hours: '',
  whatsapp: '',
  date: '',
}

/**
 * O que vai à API. Só o evento tem dia: quem trocou a categoria de `EVENT` para outra deixou
 * o campo escondido com a data que digitou, e a API recusaria a data num lugar que não é
 * evento. O `PUT` leva todos os campos (`DECISIONS.md` #35), então a data some aqui.
 */
export function toPlacePayload(
  values: AdministratorPlaceWritePayload,
): AdministratorPlaceWritePayload {
  if (values.category === PLACE_CATEGORY.EVENT) return values

  return { ...values, date: undefined }
}
