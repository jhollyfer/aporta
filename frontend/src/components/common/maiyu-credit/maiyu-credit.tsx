import type * as React from 'react'

import maiyuLogo from '#/assets/maiyu.png'
import { Picture } from '#/components/common/picture'
import { cn } from '#/lib/cn'
import { m } from '#/paraglide/messages'

const MAIYU_URL = 'https://maiyu.com.br'

/**
 * O crédito de quem construiu o sistema: a logo da Maiyu e "Desenvolvido por Maiyu", com link
 * (`_standards/frontend.md` §8, "Crédito no rodapé"). Só isso: sem slogan, ano nem outra frase
 * de autoria.
 *
 * Mora em `common` porque todo rodapé o mostra. A cor vem de quem usa (`className`): o rodapé do
 * site é escuro. A frase é uma mensagem só (`common_maiyu_credit`, `{#link}Maiyu{/link}`), e as
 * partes dela vêm de `m.common_maiyu_credit.parts()`, para o link ficar no lugar que cada idioma
 * pede (_doc-lib/paraglide.md#/markup).
 */
export function MaiyuCredit({
  className,
  ...rest
}: React.ComponentProps<'p'>): React.JSX.Element {
  return (
    <p
      data-slot="maiyu-credit"
      {...rest}
      className={cn('flex items-center gap-2', className)}
    >
      <Picture
        src={maiyuLogo}
        alt=""
        width={20}
        height={20}
        className="size-5 shrink-0"
        placement="fold"
      />
      <span>{creditNodes()}</span>
    </p>
  )
}

/** O texto da mensagem, com o que está entre `{#link}` e `{/link}` virando o link da Maiyu. */
function creditNodes(): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  let linkText: string | null = null

  for (const part of m.common_maiyu_credit.parts({})) {
    if (part.type === 'markup-start') linkText = ''
    else if (part.type === 'markup-end') {
      nodes.push(
        <a
          key={nodes.length}
          href={MAIYU_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold underline-offset-4 hover:underline"
        >
          {linkText}
        </a>,
      )
      linkText = null
    } else if (part.type === 'text' && linkText !== null) linkText += part.value
    else if (part.type === 'text') nodes.push(part.value)
  }

  return nodes
}
