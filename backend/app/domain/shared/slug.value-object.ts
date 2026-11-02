/**
 * The public address of a record, derived from a text: a backend-only value object
 * (`_standards/domain.md` §3), immutable and equal to another by its text.
 *
 * The text is a title a person typed, so it is third-party input that ends up in a URL: accents
 * are stripped (`Colônia` becomes `colonia`), everything that is not a letter or a digit becomes
 * one hyphen, and the base is cut so the whole slug fits the 100-character column. A title with
 * no letter at all (only emoji or punctuation) falls back to `anuncio`, because an empty slug
 * would be an empty path segment.
 *
 * The suffix is what makes it unique: two owners write "Kitnet perto do porto", and the address
 * cannot be the title alone. It is chosen by the caller (a piece of the record id), and a
 * collision with another record is the repository's `UniqueConflict`, retried with another one.
 */
export default class Slug {
  /** The column is `varchar(100)`; the base leaves room for `-` and a suffix of up to 19. */
  static readonly BASE_MAX = 80

  private static readonly FALLBACK = 'anuncio'

  private constructor(readonly value: string) {}

  static of(text: string, suffix: string): Slug {
    const base = text
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, Slug.BASE_MAX)
      .replace(/-+$/g, '')

    if (base.length === 0) return new Slug(`${Slug.FALLBACK}-${suffix}`)

    return new Slug(`${base}-${suffix}`)
  }

  equals(other: Slug): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
