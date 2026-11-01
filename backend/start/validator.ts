/*
|--------------------------------------------------------------------------
| Validator file
|--------------------------------------------------------------------------
|
| Only registers the configured VineJS at boot. The date transform, the messages
| provider and the shared rules live in `app/core/validator.ts`
| (`_standards/architecture.md` §3): `start/` only loads, and binds the provider to
| `I18nManager`, which only exists with the application up.
|
*/

import i18nManager from '@adonisjs/i18n/services/main'

import { requestMessagesProvider } from '#core/validator'

requestMessagesProvider.bind(i18nManager)
