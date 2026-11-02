import { belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { ReportReason, ReportStatus } from '@aporta/shared'

import { ReportSchema } from '#database/schema'
import Listing from '#models/listing'

/**
 * A scam report against an ad. No trash scope: a report is evidence, it is resolved and never
 * archived or deleted.
 */
export default class Report extends ReportSchema {
  @column()
  declare reason: ReportReason

  @column()
  declare status: ReportStatus

  @belongsTo(() => Listing)
  declare listing: BelongsTo<typeof Listing>
}
