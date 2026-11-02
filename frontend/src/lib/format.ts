import { DateTime } from 'luxon'

/**
 * Reais inteiros, sem centavos: aluguel em Benjamin Constant não se anuncia
 * com `,00`, e o ruído a mais custa espaço no pin do mapa.
 */
export function formatCurrency(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value)
}

/** Dias inteiros desde a data. Nunca negativo: relógio adiantado não vira "daqui a -2 dias". */
export function daysSince(iso: string, now: DateTime = DateTime.now()): number {
  const date = DateTime.fromISO(iso)
  const days = Math.floor(now.diff(date, 'days').days)
  return Math.max(days, 0)
}

/** A data de "disponível a partir de", no formato do idioma. */
export function formatDate(iso: string, locale: string): string {
  return DateTime.fromISO(iso)
    .setLocale(locale)
    .toLocaleString(DateTime.DATE_MED)
}

/** O dia do mês, para o destaque de data dos eventos do guia. */
export function dayOfMonth(iso: string): number {
  return DateTime.fromISO(iso).day
}

/** O mês abreviado no idioma, para ficar embaixo do dia no destaque do evento. */
export function shortMonth(iso: string, locale: string): string {
  return DateTime.fromISO(iso).setLocale(locale).toFormat('LLL')
}

/** Dia e hora curtos no idioma, para a fila da equipe: "2 nov. 2026, 14:30". */
export function formatDateTime(iso: string, locale: string): string {
  return DateTime.fromISO(iso)
    .setLocale(locale)
    .toLocaleString(DateTime.DATETIME_MED)
}
