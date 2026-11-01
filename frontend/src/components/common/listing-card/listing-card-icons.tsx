import * as React from 'react'
import { SealCheck } from '@phosphor-icons/react'

/**
 * O selo de verificado, com o ícone na cor do acento verde.
 * Isolado para o card e o cartão do dono pintarem o mesmo selo.
 */
export function PhosphorVerified(): React.JSX.Element {
  return <SealCheck weight="fill" className="size-4" aria-hidden />
}
