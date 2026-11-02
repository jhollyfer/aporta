import { REVIEW_NOTE_MAX, REVIEW_NOTE_MIN, z } from '@aporta/shared'

/**
 * O formulário do motivo: o mesmo intervalo (3 a 500) que a API cobra na recusa de um
 * anúncio e na resolução de uma denúncia, lido das constantes do `@aporta/shared` para o
 * campo e o servidor não discordarem. É o formulário, e não o corpo do pedido: o corpo
 * da recusa leva também a `decision`, que a tela não pergunta.
 */
export const NoteFormValidator = z.object({
  note: z.string().trim().min(REVIEW_NOTE_MIN).max(REVIEW_NOTE_MAX),
})

export type NoteForm = z.infer<typeof NoteFormValidator>

export const NOTE_FORM_DEFAULTS: NoteForm = { note: '' }

export { REVIEW_NOTE_MAX as NOTE_MAX }
