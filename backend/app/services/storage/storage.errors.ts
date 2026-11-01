/**
 * The storage fact "the bucket failed for a reason the contract does not foresee"
 * (network, credentials, 5xx). It is not a business rule and it is not "the object does not
 * exist": the use-case logs it and answers `500`. The original cause stays in `cause`,
 * for the log; it never goes to the client (`_standards/backend.md` §4.2).
 */
export default class StorageFailure {
  readonly code = 'STORAGE_FAILURE'

  private constructor(readonly cause: unknown) {}

  static of(cause: unknown): StorageFailure {
    return new StorageFailure(cause)
  }
}
