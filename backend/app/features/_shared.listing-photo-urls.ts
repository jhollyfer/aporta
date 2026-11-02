import type { ListingRecord } from '#repositories/listing/listing.repository'
import type StorageContract from '#services/storage/storage.contract'

/**
 * The signed read URL of each listing photo, for the storefront and the owner's panel alike
 * (`_standards/backend.md` §4.9: logic two modules need goes up to `features/_shared.<theme>.ts`).
 *
 * The URL is derived on read and never stored: the disk is private, so no address of an object
 * authorizes by itself, and a stored URL would outlive the deadline it was signed with. The
 * repository hands the files of the records still without `url`; signing is local to the
 * contract (no network), so one call per page costs nothing but the signatures.
 *
 * A class with only `static`, like `WireDate`: it keeps no state, and the contract is passed in
 * because injecting it here would make a presenter-side helper a service.
 */
export default class ListingPhotoUrls {
  /** The `url` by file id, for every file the records carry. */
  static async sign(
    records: ReadonlyArray<ListingRecord>,
    storage: StorageContract,
  ): Promise<ReadonlyMap<string, string>> {
    const signed = await storage.signFiles(
      records.flatMap((record) => record.files),
    )

    return new Map(signed.map((file) => [file.id, file.url]))
  }

  /** The URL of a photo, or null when the slot has no picture (or its file is not servable). */
  static of(
    urls: ReadonlyMap<string, string>,
    storageId: string | null,
  ): string | null {
    if (storageId === null) return null

    return urls.get(storageId) ?? null
  }
}
