import { defineConfig } from '@adonisjs/core/bodyparser'

const bodyParserConfig = defineConfig({
  /**
   * Parse request bodies for these HTTP methods.
   * Keep this aligned with methods that receive payloads in your routes.
   */
  allowedMethods: ['POST', 'PUT', 'PATCH', 'DELETE'],

  /**
   * Config for the "application/x-www-form-urlencoded"
   * content-type parser.
   */
  form: {
    /**
     * Normalize empty string values to null.
     */
    convertEmptyStringsToNull: true,

    /**
     * Content types handled by the form parser.
     */
    types: ['application/x-www-form-urlencoded'],
  },

  /**
   * Config for the JSON parser.
   */
  json: {
    /**
     * Normalize empty string values to null.
     */
    convertEmptyStringsToNull: true,

    /**
     * Do not trim the strings of the body. The default trims every string, nested ones
     * included, and the rich text JSON carries meaningful spaces inside its text nodes
     * (`"Some "` before a bold run): trimmed, `Some **bold** text` would reach the database as
     * `Somebold text`. The validators that want a trimmed string say `.trim()` themselves.
     * _doc-lib/adonisjs.md#guides/basics/body-parser, https://docs.adonisjs.com/guides/basics/body-parser
     */
    trimWhitespaces: false,

    /**
     * Content types handled by the JSON parser.
     */
    types: [
      'application/json',
      'application/json-patch+json',
      'application/vnd.api+json',
      'application/csp-report',
    ],
  },

  /**
   * No `multipart/form-data` parser: the binary goes straight to the bucket by
   * signed URL (`services/multipart`) and the API only receives JSON. An empty list
   * turns the parser off, and no route loads a file into memory or onto temporary
   * disk.
   * _doc-lib/adonisjs.md#guides/basics/body-parser, https://docs.adonisjs.com/guides/basics/body-parser
   */
  multipart: {
    types: [],
  },
})

export default bodyParserConfig
