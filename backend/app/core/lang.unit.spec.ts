import { readdir } from 'node:fs/promises'

import app from '@adonisjs/core/services/app'
import { LOCALE, LOCALES } from '@aporta/shared'
import { test } from '@japa/runner'

import {
  icuVariables,
  langFiles,
  readLang,
  sharedMessage,
} from '#tests/lang-fixtures'

/**
 * The translations in `resources/lang/`, seen from outside (`_standards/i18n.md` §4).
 *
 * What the text says belongs to the translator; this spec checks the shape: the three
 * languages have the same files and the same keys, no value is empty, the
 * same key uses the same ICU variables in all three, and the house text rule
 * (§5) holds: no em dash and no `...`. The content of `errors.json` and
 * `validator.json` is checked against the code in their own specs.
 */

const files = await langFiles(LOCALE.PT_BR)

test.group('lang > languages', () => {
  test('when the folder is listed, has one directory per supported language, and only those', async ({
    assert,
  }) => {
    const listing = await readdir(app.makePath('resources/lang'), {
      withFileTypes: true,
    })
    const directories = listing
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()

    assert.deepEqual(directories, [...LOCALES].sort())
  })

  test('when the languages are compared, the three have the same files', async ({
    assert,
  }) => {
    for (const locale of LOCALES) {
      assert.deepEqual(await langFiles(locale), files, locale)
    }
  })
})

for (const file of files) {
  test.group(`lang > ${file}.json`, () => {
    test('when a key is read, exists in the three languages, with none left over', async ({
      assert,
    }) => {
      const entries = await readLang(LOCALE.PT_BR, file)
      const base = [...entries.keys()].sort()

      for (const locale of LOCALES) {
        const translated = await readLang(locale, file)
        const keys = [...translated.keys()].sort()

        assert.deepEqual(keys, base, locale)
      }
    })

    test('when a value is read, is not empty', async ({ assert }) => {
      for (const locale of LOCALES) {
        const empty = [...(await readLang(locale, file))]
          .filter(([, message]) => message.trim() === '')
          .map(([key]) => key)

        assert.deepEqual(empty, [], locale)
      }
    })

    test('when a key is read, uses the same ICU variables in the three languages', async ({
      assert,
    }) => {
      const base = await readLang(LOCALE.PT_BR, file)

      for (const locale of LOCALES) {
        const entries = await readLang(locale, file)
        const diverging = [...base]
          .filter(
            ([key, message]) =>
              icuVariables(entries.get(key) ?? '').join() !==
              icuVariables(message).join(),
          )
          .map(([key]) => key)

        assert.deepEqual(diverging, [], locale)
      }
    })

    test('when a text is read, has no em dash or three dots', async ({
      assert,
    }) => {
      for (const locale of LOCALES) {
        const offenders = [...(await readLang(locale, file))]
          .filter(([, message]) => /[—–]|\.\.\./.test(message))
          .map(([key]) => key)

        assert.deepEqual(offenders, [], locale)
      }
    })
  })
}

/**
 * The same rule says the same thing on both sides. VineJS here and Zod in
 * `shared/` validate the same form (`validators:check` enforces rule
 * parity), and the message the screen shows before submitting is the one the 422
 * would return afterwards. Without this the two copies diverged: the Spanish here
 * used "tú" and the one in `shared/` used "usted". `shared/` is the source; here the
 * text only swaps Zod's `{{ x }}` for ICU's `{ x }`.
 */
test.group('lang > validator.json matches shared', () => {
  test('when comparing with shared, rule messages and field labels match', async ({
    assert,
  }) => {
    for (const locale of LOCALES) {
      const entries = await readLang(locale, 'validator')
      const diverging = [...entries]
        .filter(([key, message]) => {
          const shared = sharedMessage(locale, key)

          return shared !== undefined && shared !== message
        })
        .map(([key]) => key)

      assert.deepEqual(diverging, [], locale)
    }
  })
})
