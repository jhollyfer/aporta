import { test } from '@japa/runner'

import TerminalText from '#core/terminal-text'

test.group('core > terminal text', () => {
  test('when the text is plain, comes out unchanged', ({ assert }) => {
    assert.equal(TerminalText.plain('Relatório 2026.pdf'), 'Relatório 2026.pdf')
  })

  test('when the text has an escape sequence, drops it whole', ({ assert }) => {
    assert.equal(TerminalText.plain('a\u001b[2Jb\u001b[31mc'), 'abc')
  })

  test('when the text has other control characters, each one becomes a question mark', ({
    assert,
  }) => {
    assert.equal(
      TerminalText.plain('a\rb\nc\u0007d\u007fe\u0085f'),
      'a?b?c?d?e?f',
    )
  })
})
