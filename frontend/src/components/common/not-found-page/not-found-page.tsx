import * as React from 'react'
import { Link } from '@tanstack/react-router'

import { Scene, SCENE_KIND } from '#/components/common/scene'
import { m } from '#/paraglide/messages'

type NotFoundPageProps = {
  variant?: 'not-found' | 'error'
  /** Refaz a tentativa, no caso do erro. Voltar ao início vem depois: refazer costuma resolver sem perder o lugar. */
  onRetry?: () => void
}

/**
 * A página de saída: endereço que não existe e erro não tratado. A mesma tela
 * serve ao router (fora de qualquer casca) e à rota-curinga `$` (dentro da
 * casca), para quem errar o endereço não ficar sem menu.
 */
export function NotFoundPage({
  variant = 'not-found',
  onRetry,
}: NotFoundPageProps): React.JSX.Element {
  const isError = variant === 'error'

  return (
    <section
      data-slot="not-found-page"
      className="flex min-h-dvh flex-col bg-paper"
    >
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-5 px-4 pt-24 text-center">
        <p className="text-sm font-bold text-ink-soft tabular-nums">
          {isError && '500'}
          {!isError && '404'}
        </p>
        <h1 className="text-4xl font-extrabold tracking-tight text-ink">
          {isError && m.error_title()}
          {!isError && m.not_found_title()}
        </h1>
        <p className="text-lg text-ink-soft">
          {isError && m.error_description()}
          {!isError && m.not_found_description()}
        </p>
        <div className="flex gap-3">
          {isError && onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="h-11 rounded-full bg-moss px-6 text-sm font-extrabold text-paper hover:bg-moss-deep"
            >
              {m.error_retry()}
            </button>
          )}
          <Link
            to="/"
            className="inline-flex h-11 items-center rounded-full border-2 border-ink px-6 text-sm font-extrabold text-ink hover:bg-ink hover:text-paper"
          >
            {m.not_found_home()}
          </Link>
        </div>
      </div>
      <div className="mt-auto h-[38vh] min-h-56">
        <Scene kind={SCENE_KIND.PANORAMA} />
      </div>
    </section>
  )
}
