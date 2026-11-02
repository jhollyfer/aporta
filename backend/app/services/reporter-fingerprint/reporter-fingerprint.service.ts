import { createHmac } from 'node:crypto'

import ReporterFingerprintContract from '#services/reporter-fingerprint/reporter-fingerprint.contract'
import env from '#start/env'

/**
 * HMAC-SHA256 of the address with `APP_KEY` (`_doc-lib/nodejs.md#api/crypto`, `crypto.createHmac`).
 * A plain hash would not do: the IPv4 space is small enough to hash entirely, so anyone with the
 * table could recover the addresses by trying them all. With the key, only the process that holds
 * `APP_KEY` can produce or check a fingerprint. The `reporter:` prefix keeps this key from being
 * the same function as any other HMAC under the same secret.
 *
 * Rotating `APP_KEY` changes every fingerprint: old reports stay readable and stop matching new ones,
 * which is acceptable for a signal that only ever suggests.
 */
export default class ReporterFingerprintService extends ReporterFingerprintContract {
  of(address: string): string {
    return createHmac('sha256', env.get('APP_KEY').release())
      .update(`reporter:${address}`)
      .digest('hex')
  }
}
