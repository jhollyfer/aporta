/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  healthCheck: typeof routes['health_check']
  documentation: {
    openapi: typeof routes['documentation.openapi']
    reference: typeof routes['documentation.reference']
  }
  storefront: {
    listings: {
      paginate: typeof routes['storefront.listings.paginate']
      pins: typeof routes['storefront.listings.pins']
      show: typeof routes['storefront.listings.show']
    }
    neighborhoods: {
      paginate: typeof routes['storefront.neighborhoods.paginate']
    }
    places: {
      paginate: typeof routes['storefront.places.paginate']
    }
    reports: {
      create: typeof routes['storefront.reports.create']
    }
  }
  authentication: {
    signIn: typeof routes['authentication.sign_in']
    signUp: typeof routes['authentication.sign_up']
    signOut: typeof routes['authentication.sign_out']
    refresh: typeof routes['authentication.refresh']
  }
  profile: {
    show: typeof routes['profile.show']
    update: typeof routes['profile.update']
  }
  owner: {
    listings: {
      paginate: typeof routes['owner.listings.paginate']
      create: typeof routes['owner.listings.create']
      show: typeof routes['owner.listings.show']
      update: typeof routes['owner.listings.update']
      archive: typeof routes['owner.listings.archive']
      photos: typeof routes['owner.listings.photos']
    }
  }
  administrator: {
    listings: {
      paginate: typeof routes['administrator.listings.paginate']
      show: typeof routes['administrator.listings.show']
      review: typeof routes['administrator.listings.review']
      archive: typeof routes['administrator.listings.archive']
    }
    owners: {
      verify: typeof routes['administrator.owners.verify']
    }
    reports: {
      paginate: typeof routes['administrator.reports.paginate']
      resolve: typeof routes['administrator.reports.resolve']
    }
  }
  storages: {
    paginate: typeof routes['storages.paginate']
    create: typeof routes['storages.create']
    complete: typeof routes['storages.complete']
    parts: typeof routes['storages.parts']
    show: typeof routes['storages.show']
    delete: typeof routes['storages.delete']
    download: typeof routes['storages.download']
  }
}
