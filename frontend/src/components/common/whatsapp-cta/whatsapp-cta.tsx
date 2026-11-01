import * as React from 'react'
import { WhatsappLogo } from '@phosphor-icons/react'

import { whatsappLink } from '#/lib/whatsapp'
import { cn } from '#/lib/cn'

type WhatsAppCtaProps = {
  phone: string
  message: string
  label: string
  className?: string
}

/**
 * O botão principal da plataforma. WhatsApp e não chat interno: é onde a
 * cidade já está, e o dono responde de onde estiver. É o único elemento no
 * acento quente (`sun`) do site, para o olho achar a ação sem procurar.
 *
 * `rel="noopener noreferrer"` e `target="_blank"`: o WhatsApp abre em outro
 * app ou aba, e a página do Aporta não deve ficar com referência a ele.
 */
export function WhatsAppCta({
  phone,
  message,
  label,
  className,
}: WhatsAppCtaProps): React.JSX.Element {
  return (
    <a
      href={whatsappLink(phone, message)}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex h-12 items-center justify-center gap-2 rounded-full bg-sun px-6 text-base font-extrabold text-on-sun transition-[background-color,transform] hover:bg-sun-deep active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100',
        className,
      )}
    >
      <WhatsappLogo aria-hidden weight="fill" className="size-6" />
      {label}
    </a>
  )
}
