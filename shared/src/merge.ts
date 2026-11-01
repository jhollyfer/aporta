/**
 * Joins two object types into one, flattened: the house's only type utility
 * (`_standards/typescript.md` §8, house opinion).
 *
 * `A & B` works and reads badly: the editor shows the intersection chain instead of the
 * final type, and a repeated key silently becomes `never`. Mapping the keys
 * solves both things - the hover shows the resulting object, field by field.
 *
 * It does not serve a class (it flattens the methods and loses the nominal type) nor a
 * discriminated union (it flattens the variants; there the `&` is still right, §8).
 */
export type Merge<TBase, TOverride> = {
  [K in keyof (TBase & TOverride)]: (TBase & TOverride)[K]
}
