/**
 * The persistence fact "the database failed for a reason the contract does not
 * foresee" (dropped connection, timeout, refused SQL). It is not a business rule: the
 * use-case logs it and answers `500`. The original cause stays in `cause`, for the
 * log; it never goes to the client (`_standards/backend.md` §4.2).
 */
export default class RepositoryFailure {
  readonly code = 'REPOSITORY_FAILURE'

  private constructor(readonly cause: unknown) {}

  static of(cause: unknown): RepositoryFailure {
    return new RepositoryFailure(cause)
  }
}
