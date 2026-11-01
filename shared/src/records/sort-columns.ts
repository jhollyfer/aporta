/**
 * The columns by which each listing can be sorted - a constant that both
 * sides read, without a schema (`_standards/architecture.md` §9, `records/`).
 *
 * The column comes from a closed list because the value goes straight into the server's
 * `orderBy`; on the client the list serves so the screen does not offer what the API
 * refuses. It lives outside `validator.ts` on purpose: the routes read these tuples in
 * `validateSearch`, which lands in the entry chunk, and importing from the schemas
 * module would bring Zod into every page.
 */

/**
 * Which columns the users listing can be sorted by: the ones the screen
 * shows. `password` is a hash, and `avatar` is a relation, which would require a `join`.
 */
export const USER_SORT_COLUMNS = [
  'name',
  'email',
  'role',
  'status',
  'createdAt',
] as const

/** Which columns the file library can be sorted by. */
export const STORAGE_SORT_COLUMNS = [
  'originalName',
  'mimetype',
  'size',
  'createdAt',
] as const
