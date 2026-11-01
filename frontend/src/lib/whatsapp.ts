/**
 * O link de conversa do WhatsApp, com a mensagem já escrita.
 *
 * `wa.me` e não chat interno: é onde a cidade já está, e o dono responde de
 * onde estiver, sem instalar nada. A mensagem cita o imóvel porque o dono
 * anuncia mais de um e "tenho interesse" sozinho obriga a perguntar de qual.
 *
 * O número fica só com dígitos: `wa.me` recusa `+`, espaço e parêntese, e o
 * link quebrado só aparece quando alguém toca nele.
 */
export function whatsappLink(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, '')
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}
