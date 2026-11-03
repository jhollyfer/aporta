import * as React from 'react'
import { CircleHalf, Moon, Sun } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

import { Button } from '#/components/ui/button'
import { applyTheme, nextTheme, readTheme } from '#/lib/theme'
import type { Theme } from '#/lib/theme'
import { m } from '#/paraglide/messages'

const ICONS = {
  system: CircleHalf,
  light: Sun,
  dark: Moon,
} as const satisfies Record<Theme, Icon>

const LABELS = {
  system: () => m.theme_system(),
  light: () => m.theme_light(),
  dark: () => m.theme_dark(),
} as const satisfies Record<Theme, () => string>

/**
 * O botão de tema: um toque troca entre automático (o aparelho decide), claro e escuro. O nome
 * acessível diz o tema atual, e o ícone mostra o mesmo. Começa em `system` no servidor e no
 * primeiro quadro, e lê a escolha guardada depois da hidratação (o script do `<head>` já
 * pintou a página no tema certo, então a troca do ícone não pisca nada).
 */
export function ThemeToggle(): React.JSX.Element {
  const [theme, setTheme] = React.useState<Theme>('system')

  React.useEffect(() => {
    setTheme(readTheme())
  }, [])

  const Glyph = ICONS[theme]

  function cycle(): void {
    const next = nextTheme(theme)

    applyTheme(next)
    setTheme(next)
  }

  return (
    <Button
      variant="ghost"
      type="button"
      onClick={cycle}
      aria-label={m.theme_toggle_label({ theme: LABELS[theme]() })}
      className="inline-flex size-11 items-center justify-center rounded-full text-ink hover:bg-moss-wash sm:size-9"
    >
      <Glyph aria-hidden className="size-5" weight="bold" />
    </Button>
  )
}
