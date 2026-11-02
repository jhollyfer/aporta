/** What a topic keeps in `localStorage`: where, in which version and how to prove the value. */
export type LocalStoreOptions<TValue> = {
  /** The key's subject: `data-table`, `theme`. It composes `aporta:<topic>:v<version>:<id>`. */
  theme: string
  /** It goes up when the stored shape changes: the new key discards what was saved. */
  version: number
  /** Outside data comes in as `unknown`; the caller proves the shape (schema from `shared/`). */
  parse: (raw: unknown) => TValue
  /** What `read` returns when nothing is saved, the parse fails or the storage is blocked. */
  fallback: TValue
}

/**
 * The frontend's single home for `localStorage` (`_standards/frontend.md` §2).
 *
 * One instance per topic. Reading in `try/catch` and the value converted by `parse`;
 * any failure (corrupted JSON, blocked storage, SSR without `window`) returns the
 * `fallback`. A write that fails (quota, private mode) is discarded: the client
 * state is a convenience, never a requirement.
 *
 * No component touches `localStorage` directly.
 */
export class LocalStore<TValue> {
  private readonly prefix: string

  constructor(private readonly options: LocalStoreOptions<TValue>) {
    this.prefix = `aporta:${options.theme}:v${options.version}:`
  }

  /** The full key of an id, the one that appears in the `StorageEvent`. */
  keyOf(id: string): string {
    return this.prefix.concat(id)
  }

  /** The id of a key of this topic and version, or `null` if the key belongs to another owner. */
  idOf(storageKey: string | null): string | null {
    if (storageKey === null || !storageKey.startsWith(this.prefix)) return null

    return storageKey.slice(this.prefix.length)
  }

  read(id: string): TValue {
    try {
      const raw = window.localStorage.getItem(this.keyOf(id))
      if (!raw) return this.options.fallback

      const parsed: unknown = JSON.parse(raw)

      return this.options.parse(parsed)
    } catch {
      return this.options.fallback
    }
  }

  write(id: string, value: TValue): void {
    try {
      window.localStorage.setItem(this.keyOf(id), JSON.stringify(value))
    } catch {
      // Quota exceeded or private mode: the value does not persist and the screen carries on.
    }
  }

  /** Removes the saved value; a failure (blocked storage) is discarded, like in `write`. */
  remove(id: string): void {
    try {
      window.localStorage.removeItem(this.keyOf(id))
    } catch {
      // Blocked storage: there is nothing to remove, and the screen carries on.
    }
  }

  /** The ids saved under this topic and version; other owners' keys never show up. */
  ids(): Array<string> {
    try {
      const found: Array<string> = []

      for (let index = 0; index < window.localStorage.length; index += 1) {
        const id = this.idOf(window.localStorage.key(index))

        if (id !== null) found.push(id)
      }

      return found
    } catch {
      return []
    }
  }
}
