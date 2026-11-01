/**
 * The multipart fact "the bucket failed for a reason the contract does not foresee"
 * (network, credentials, timeout, 5xx, a response without `UploadId`). It is not a business
 * rule: the use-case logs it and answers `500`. The original cause stays in `cause`, for the
 * log; it never goes to the client (`_standards/backend.md` §4.2, §5.3).
 */
export default class MultipartFailure {
  readonly code = 'MULTIPART_FAILURE'

  private constructor(readonly cause: unknown) {}

  static of(cause: unknown): MultipartFailure {
    return new MultipartFailure(cause)
  }
}
