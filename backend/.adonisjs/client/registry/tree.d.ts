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
      show: typeof routes['storefront.listings.show']
    }
    neighborhoods: {
      paginate: typeof routes['storefront.neighborhoods.paginate']
    }
    places: {
      paginate: typeof routes['storefront.places.paginate']
    }
  }
  authentication: {
    signIn: typeof routes['authentication.sign_in']
    signOut: typeof routes['authentication.sign_out']
    refresh: typeof routes['authentication.refresh']
  }
  profile: {
    show: typeof routes['profile.show']
    update: typeof routes['profile.update']
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
