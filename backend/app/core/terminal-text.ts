import { stripVTControlCharacters } from 'node:util'

/**
 * Text that came from a user and is about to be printed on an operator's terminal.
 *
 * A stored label may carry escape sequences (clear screen, rewrite the line, move the
 * cursor) that the terminal obeys instead of showing (CWE-150). The ANSI sequences are
 * dropped whole first, so no `[2J` is left behind as visible junk, and each remaining
 * control character (C0, DEL, C1) becomes `?`, which keeps the length readable.
 */
export default class TerminalText {
  static plain(value: string): string {
    return stripVTControlCharacters(value).replace(/\p{Cc}/gu, '?')
  }
}
