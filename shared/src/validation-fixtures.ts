import type { z } from './validator.js'

/**
 * Reading a validator's result for the tests: the fields that failed,
 * without depending on the order of the issues, and the messages. It stays out of `dist/`
 * (`tsconfig.build.json`): it is test support used by more than one spec.
 */
export class ValidationFixture {
  /** The paths that failed (`tags.0`), one per field, in alphabetical order. */
  static fields(result: z.ZodSafeParseResult<unknown>): Array<string> {
    const paths = (result.error?.issues ?? []).map((issue) =>
      issue.path.join('.'),
    )

    return [...new Set(paths)].sort()
  }

  /** The messages by path, to check text and field together. */
  static messages(
    result: z.ZodSafeParseResult<unknown>,
  ): Array<{ field: string; message: string }> {
    return (result.error?.issues ?? []).map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }))
  }
}
