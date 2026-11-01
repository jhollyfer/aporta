import { randomUUID } from 'node:crypto'

import IdGeneratorContract from '#services/id-generator/id-generator.contract'

/**
 * UUID v4 from `node:crypto`, the same format as the `uuid_generate_v4()` that the
 * tables use as default: the id is not sequential and does not reveal volume
 * (`_standards/domain.md` §1).
 */
export default class IdGeneratorService extends IdGeneratorContract {
  next(): string {
    return randomUUID()
  }
}
