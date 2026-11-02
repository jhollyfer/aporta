import type { ClassValue } from 'clsx'
import { clsx } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/*
 * A escala `--text-*` do tema tem papéis próprios (`text-display`, `text-headline`, `text-title`).
 * Sem registrá-los, o tailwind-merge os lê como cor de texto e descarta um dos dois quando uma
 * classe de cor vem junto.
 */
const merge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['display', 'headline', 'title'] }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return merge(clsx(inputs))
}
