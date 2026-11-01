import type { AccountProfileShowResponse } from '@aporta/shared'

import { WireDate } from '#core/response'
import type { UserRecord } from '#repositories/user/user.repository'
import type { SignedStorageFile } from '#services/storage/storage.contract'

/**
 * The account itself as a response (`_standards/architecture.md` §10), field by
 * field: the password is not on the entity and, by construction, does not leave.
 * `GET /account` and `PUT /account` have the same shape. Receives the photo already
 * signed: signing is bucket I/O, the use-case's job.
 */
export default class ProfilePresenter {
  static show(
    record: UserRecord,
    avatar: SignedStorageFile | null,
  ): AccountProfileShowResponse {
    const user = record.user.snapshot()

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      avatarId: user.avatarId,
      avatar,
      createdAt: WireDate.iso(record.createdAt),
      updatedAt: WireDate.isoOrNull(record.updatedAt),
      deletedAt: WireDate.isoOrNull(user.deletedAt),
    }
  }
}
