import { defineConfig, drivers } from '@adonisjs/core/encryption'

import env from '#start/env'

const encryptionConfig = defineConfig({
  /**
   * Default encryption driver used by the application.
   */
  default: 'gcm',

  list: {
    gcm: drivers.aes256gcm({
      /**
       * Keys used for encryption/decryption.
       * First key encrypts, all keys are tried for decryption.
       */
      keys: [env.get('APP_KEY')],

      /**
       * Stable identifier for this driver.
       */
      id: 'gcm',
    }),
  },
})

export default encryptionConfig

/**
 * Inferring types for the list of encryptors you have configured
 * in your application.
 */
declare module '@adonisjs/core/types' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-empty-object-type -- declaration merging requires `interface`, which adds no members here
  export interface EncryptorsList extends InferEncryptors<
    typeof encryptionConfig
  > {}
}
