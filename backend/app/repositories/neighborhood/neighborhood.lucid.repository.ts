import type { Paginated } from '@aporta/shared'

import Neighborhood from '#domain/neighborhood/neighborhood.entity'
import NeighborhoodModel from '#models/neighborhood'
import NeighborhoodRepository, {
  type NeighborhoodListCriteria,
} from '#repositories/neighborhood/neighborhood.repository'
import LucidMapping from '#repositories/shared/lucid-mapping'

/**
 * The neighborhood repository over Lucid: the only file that imports `#models/neighborhood`
 * (`_standards/architecture.md` §2), with the mapper as a private method
 * (`_standards/domain.md` §5.2). "Live" is the model's `notDeleted` scope.
 */
export default class NeighborhoodLucidRepository extends NeighborhoodRepository {
  async paginate(
    criteria: NeighborhoodListCriteria,
  ): Promise<Paginated<Neighborhood>> {
    const query = NeighborhoodModel.query().withScopes((scopes) =>
      scopes.notDeleted(),
    )

    if (criteria.search) query.whereILike('name', `%${criteria.search}%`)

    return LucidMapping.page(query, criteria, (row) => this.toEntity(row))
  }

  private toEntity(row: NeighborhoodModel): Neighborhood {
    return Neighborhood.restore({
      id: row.id,
      slug: row.slug,
      name: row.name,
      lat: row.lat,
      lng: row.lng,
      deletedAt: LucidMapping.date(row.deletedAt),
    })
  }
}
