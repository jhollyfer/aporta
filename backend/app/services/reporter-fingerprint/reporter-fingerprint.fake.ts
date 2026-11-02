import ReporterFingerprintContract from '#services/reporter-fingerprint/reporter-fingerprint.contract'

/** A predictable fingerprint for the unit tests: 64 characters made from the address, no secret. */
export default class ReporterFingerprintFake extends ReporterFingerprintContract {
  of(address: string): string {
    return Buffer.from(address).toString('hex').padEnd(64, '0').slice(0, 64)
  }
}
