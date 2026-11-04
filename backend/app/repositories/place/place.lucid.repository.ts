import { left, right, type Either, type Paginated } from '@aporta/shared'

import RepositoryFailure from '#core/repository-failure'
import Place from '#domain/place/place.entity'
import PlaceModel from '#models/place'
import PlaceRepository, {
  type PlaceListCriteria,
  type PlaceRecord,
} from '#repositories/place/place.repository'
import LucidMapping from '#repositories/shared/lucid-mapping'

/**
 * The place repository over Lucid: the only file that imports `#models/place`
 * (`_standards/architecture.md` §2). The neighborhood comes preloaded, because every card shows
 * its name.
 */
export default class PlaceLucidRepository extends PlaceRepository {
  async paginate(criteria: PlaceListCriteria): Promise<Paginated<PlaceRecord>> {
    const query = PlaceModel.query()
      .withScopes((scopes) => scopes.trashed(criteria.trashed))
      .preload('neighborhood')

    if (criteria.category) query.where('category', criteria.category)

    // The `OR` goes inside the `where`: loose, the search would cancel the category filter.
    if (criteria.search) {
      const search = `%${criteria.search}%`

      query.where((builder) => {
        builder.whereILike('name', search).orWhereILike('description', search)
      })
    }

    return LucidMapping.page(query, criteria, (row) => this.toRecord(row))
  }

  async findAnyRecordById(id: string): Promise<PlaceRecord | null> {
    const row = await PlaceModel.query()
      .where('id', id)
      .preload('neighborhood')
      .first()

    if (!row) return null
    return this.toRecord(row)
  }

  async save(place: Place): Promise<Either<RepositoryFailure, PlaceRecord>> {
    const snapshot = place.snapshot()
    let date = null
    if (snapshot.date) date = LucidMapping.fromCalendarDate(snapshot.date)

    try {
      await PlaceModel.updateOrCreate(
        { id: snapshot.id },
        {
          category: snapshot.category,
          name: snapshot.name,
          description: snapshot.description,
          neighborhoodId: snapshot.neighborhoodId,
          address: snapshot.address,
          hours: snapshot.hours,
          whatsapp: snapshot.whatsapp,
          date,
          deletedAt: LucidMapping.dateTime(snapshot.deletedAt),
        },
      )

      // Read without the trash cut: an archive is a save too, and has to answer with the row as
      // it was written.
      const saved = await this.findAnyRecordById(snapshot.id)

      if (!saved)
        return left(
          RepositoryFailure.of(
            new Error(`place ${snapshot.id} vanished after save`),
          ),
        )

      return right(saved)
    } catch (error) {
      return left(RepositoryFailure.of(error))
    }
  }

  async delete(place: Place): Promise<void> {
    await PlaceModel.query().where('id', place.id).delete()
  }

  private toRecord(row: PlaceModel): PlaceRecord {
    return {
      place: this.toEntity(row),
      neighborhood: {
        slug: row.neighborhood.slug,
        name: row.neighborhood.name,
      },
    }
  }

  private toEntity(row: PlaceModel): Place {
    let date: string | null = null
    if (row.date) date = LucidMapping.calendarDate(row.date)

    return Place.restore({
      id: row.id,
      category: row.category,
      name: row.name,
      description: row.description,
      neighborhoodId: row.neighborhoodId,
      address: row.address,
      hours: row.hours,
      whatsapp: row.whatsapp,
      date,
      deletedAt: LucidMapping.date(row.deletedAt),
    })
  }
}
