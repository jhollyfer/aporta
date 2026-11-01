import { type SchemaRules } from '@adonisjs/lucid/types/schema_generator'

/**
 * What the `database/schema.ts` generator needs to know and cannot read from the
 * database.
 *
 * Today only one thing: which columns do **not** come out in the response. Lucid's default
 * is to serialize every column, and `database/schema.ts` is generated — declaring
 * `serializeAs: null` on the model does not survive the next generation. Here it survives.
 *
 * The cut is narrow on purpose: what is **equivalent to a credential** goes in,
 * not all sensitive data. `email` is shown by the authenticated screens by
 * design, and the public routes only return what each `*.presenter.ts`
 * chooses — hiding it here would break the authenticated screens
 * without closing any hole.
 */
export default {
  tables: {
    auth_access_tokens: {
      columns: {
        // The value that proves the session. No route serializes this model today, and
        // that is precisely why the protection needs to be here: whoever
        // adds a `preload` tomorrow will not remember.
        hash: {
          tsType: 'string',
          decorators: [{ name: '@column', args: { serializeAs: null } }],
        },
      },
    },
  },
} satisfies SchemaRules
