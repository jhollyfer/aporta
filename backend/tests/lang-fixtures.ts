import { readdir, readFile } from 'node:fs/promises'

import app from '@adonisjs/core/services/app'
import { FIELD_LABELS, RULE_MESSAGES } from '@aporta/shared'
import type { Locale } from '@aporta/shared'

/**
 * Reading `resources/lang/<locale>/*.json` in the specs.
 *
 * The file is read from disk, and not through `I18nManager`, so the spec sees
 * what is versioned: the manager already applies fallback between languages and would hide
 * the key missing in `es` or `en`.
 */

/** Each message by the full key path: `shared.fields.name`. */
export type LangEntries = ReadonlyMap<string, string>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function flatten(node: unknown, prefix: string, into: Map<string, string>) {
  if (typeof node === 'string') {
    into.set(prefix, node)
    return
  }

  if (!isRecord(node)) {
    throw new Error(`"${prefix}" is neither text nor object`)
  }

  for (const [key, value] of Object.entries(node)) {
    flatten(value, [prefix, key].filter(Boolean).join('.'), into)
  }
}

export function langDirectory(locale: string): string {
  return app.makePath('resources/lang', locale)
}

/** The `*.json` files of a language, without the extension. */
export async function langFiles(locale: Locale): Promise<Array<string>> {
  const listing = await readdir(langDirectory(locale))

  return listing
    .filter((file) => file.endsWith('.json'))
    .map((file) => file.replace(/\.json$/, ''))
    .sort()
}

export async function readLang(
  locale: Locale,
  file: string,
): Promise<LangEntries> {
  const raw = await readFile(`${langDirectory(locale)}/${file}.json`, 'utf8')
  const parsed: unknown = JSON.parse(raw)
  const entries = new Map<string, string>()

  flatten(parsed, '', entries)

  return entries
}

/** The names of the ICU variables of a message, sorted: `{ min }` becomes `min`. */
export function icuVariables(message: string): Array<string> {
  return [...message.matchAll(/\{\s*(\w+)\s*[,}]/g)]
    .map((match) => match[1])
    .filter((name): name is string => name !== undefined)
    .sort()
}

/**
 * The text that `shared/` gives for a `validator.json` key
 * (`shared.messages.<rule>` or `shared.fields.<field>`), with Zod's `{{ x }}`
 * swapped for ICU's `{ x }`; `undefined` when `shared/` does not have the key.
 */
export function sharedMessage(locale: Locale, key: string): string | undefined {
  const messages: Readonly<Record<string, string>> = RULE_MESSAGES[locale]
  const fields: Readonly<Record<string, string>> = FIELD_LABELS[locale]

  if (key.startsWith('shared.messages.')) {
    const rule = messages[key.slice('shared.messages.'.length)]

    return rule?.replace(/\{\{\s*(\w+)\s*\}\}/g, '{ $1 }')
  }

  if (key.startsWith('shared.fields.')) {
    return fields[key.slice('shared.fields.'.length)]
  }

  return undefined
}
