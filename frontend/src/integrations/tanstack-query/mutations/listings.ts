import { mutationOptions } from '@tanstack/react-query'

import type { OwnerListingCreate } from '@aporta/shared'

/**
 * O envio do anúncio do dono.
 *
 * Ainda não há API: a função só confirma o recebimento depois de uma pausa
 * curta, e NÃO persiste nada. Existe para o formulário já nascer ligado ao
 * contrato definitivo (`OwnerListingCreate` de `@aporta/shared`) e a troca ser mexer
 * só no corpo daqui, para um `POST` em `/owner/listings`, sem tocar tela. A
 * pausa deixa o estado "enviando" visível para o botão (`isPending`) ser
 * exercitado de verdade, e não só quando a rede de quem usa for lenta.
 */
export const submitListingMutation = mutationOptions({
  mutationKey: ['owner', 'listings', 'submit'],
  mutationFn: async (draft: OwnerListingCreate): Promise<{ title: string }> => {
    await new Promise((resolve) => setTimeout(resolve, 500))
    return { title: draft.title }
  },
})
