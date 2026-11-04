// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { LISTING_PHOTO_MAX_SIZE } from '@aporta/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { usePhotoDrafts } from './use-photo-drafts'

/** Um `File` com o tipo e o tamanho dados; o conteúdo não importa, só `type` e `size`. */
function fileOf(name: string, type: string, size = 10): File {
  const file = new File(['x'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

describe('usePhotoDrafts', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:preview')
    URL.revokeObjectURL = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('aceita JPEG, PNG e WebP até o teto, inclusive no limite exato', () => {
    const { result } = renderHook(() => usePhotoDrafts({ max: 12 }))

    act(() => {
      result.current.add([
        fileOf('a.jpg', 'image/jpeg'),
        fileOf('b.png', 'image/png'),
        fileOf('c.webp', 'image/webp', LISTING_PHOTO_MAX_SIZE),
      ])
    })

    expect(result.current.items).toHaveLength(3)
    expect(result.current.notice).toBeNull()
  })

  it('recusa GIF, PDF e foto acima do teto antes de enviar, com aviso', () => {
    const { result } = renderHook(() => usePhotoDrafts({ max: 12 }))

    act(() => {
      result.current.add([
        fileOf('a.gif', 'image/gif'),
        fileOf('b.pdf', 'application/pdf'),
      ])
    })
    expect(result.current.items).toHaveLength(0)
    expect(result.current.notice).not.toBeNull()

    act(() => {
      result.current.add([
        fileOf('big.jpg', 'image/jpeg', LISTING_PHOTO_MAX_SIZE + 1),
      ])
    })
    expect(result.current.items).toHaveLength(0)
    expect(result.current.notice).toContain('10')
  })
})
