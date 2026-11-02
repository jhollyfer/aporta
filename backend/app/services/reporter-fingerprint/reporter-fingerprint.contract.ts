/**
 * What the database keeps in place of the address a report came from.
 *
 * The staff needs to see that three reports share an origin; nobody needs to know the address.
 * Secrets are a boundary (`_standards/solid.md` §2): the unit tests swap in
 * `ReporterFingerprintFake` and do not depend on `APP_KEY`. `providers/runtime.provider.ts` binds it
 * to `ReporterFingerprintService`.
 */
export default abstract class ReporterFingerprintContract {
  /** The opaque key for an address: stable for the same address, 64 hexadecimal characters. */
  abstract of(address: string): string
}
