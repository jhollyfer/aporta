/**
 * O tema do site: `system` segue o aparelho (`prefers-color-scheme`), `light` e `dark` são
 * escolha do visitante. A escolha vira `data-theme` no `<html>` (`styles.css` lê o atributo) e
 * fica no `localStorage`, sem dado pessoal. `system` não grava nada nem põe atributo.
 */
export const THEMES = ['system', 'light', 'dark'] as const

export type Theme = (typeof THEMES)[number]

export const THEME_STORAGE_KEY = 'aporta:theme'

/** A ordem do botão: automático, claro, escuro, e de volta. */
const NEXT_THEME = {
  system: 'light',
  light: 'dark',
  dark: 'system',
} as const satisfies Record<Theme, Theme>

export function nextTheme(theme: Theme): Theme {
  return NEXT_THEME[theme]
}

/** Valor guardado que não é um tema conhecido vale `system`. */
export function toTheme(raw: string | null): Theme {
  return THEMES.find((theme) => theme === raw) ?? 'system'
}

export function readTheme(): Theme {
  try {
    return toTheme(window.localStorage.getItem(THEME_STORAGE_KEY))
  } catch {
    return 'system'
  }
}

/** Aplica no `<html>` e guarda. Navegador sem `localStorage` (janela privada) só perde a memória. */
export function applyTheme(theme: Theme): void {
  const root = window.document.documentElement

  if (theme === 'system') {
    delete root.dataset['theme']
  } else {
    root.dataset['theme'] = theme
  }

  try {
    if (theme === 'system') {
      window.localStorage.removeItem(THEME_STORAGE_KEY)
    } else {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme)
    }
  } catch {
    // sem armazenamento: o tema vale só nesta visita
  }
}

/**
 * O script que roda antes da primeira pintura e põe `data-theme` a partir do que o visitante
 * escolheu, para a página escura não piscar clara. Texto fixo (sem dado do usuário), e o CSP o
 * libera pelo `nonce` do `<script>` que o Start escreve.
 */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`
