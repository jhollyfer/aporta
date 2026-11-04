import type { AdministratorUserShowResponse } from '@aporta/shared'

import { WireDate } from '#core/response'
import type { UserRecord } from '#repositories/user/user.repository'

/**
 * The account as the administrator reads it (`_standards/architecture.md` §10), by allowlist:
 * identity, role, status and the owner seal. The password never reaches the entity, and the
 * avatar, the sessions and the trash column are left out on purpose.
 */
export default class AdministratorUserPresenter {
  static show(record: UserRecord): AdministratorUserShowResponse {
    const user = record.user.snapshot()

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      verifiedAt: WireDate.isoOrNull(user.verifiedAt),
      createdAt: WireDate.iso(record.createdAt),
      updatedAt: WireDate.isoOrNull(record.updatedAt),
    }
  }
}
