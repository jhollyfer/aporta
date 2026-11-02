import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { REPORT_SORT_COLUMNS } from '@aporta/shared'

import AdministratorReportPaginateUseCase from './paginate.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { AdministratorReportPaginateValidator } from '#validators/administrator/reports.validator'

@inject()
export default class AdministratorReportPaginateController {
  static docs = defineDocs({
    description:
      'A fila de denúncias de golpe para a equipe. `?status=OPEN` traz o que espera, do mais ' +
      'antigo para o mais novo; `?status=RESOLVED` traz o que já foi visto, do mais recente para o ' +
      'mais antigo.\n\n' +
      '`?search` filtra pelos detalhes da denúncia e pelo título do anúncio. ' +
      `\`?sort\` aceita ${REPORT_SORT_COLUMNS.join(', ')} e \`?direction\` aceita asc ou desc. ` +
      'O denunciante aparece só como um pedaço do hash do endereço, o bastante para ver que três ' +
      'denúncias vieram do mesmo lugar.',
  })

  constructor(private readonly useCase: AdministratorReportPaginateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(
      AdministratorReportPaginateValidator,
    )
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
