/* eslint-disable prettier/prettier */
import type { AdonisEndpoint } from '@tuyau/core/types'
import type { Registry } from './schema.d.ts'
import type { ApiDefinition } from './tree.d.ts'

export type { Route, Path } from './schema.d.ts'

const placeholder: any = {}

const routes = {
  'health_check': {
    methods: ["GET","HEAD"],
    pattern: '/health-check',
    tokens: [[0,"health-check"]],
    types: placeholder as Registry['health_check']['types'],
  },
  'documentation.openapi': {
    methods: ["GET","HEAD"],
    pattern: '/openapi.json',
    tokens: [[0,"openapi.json"]],
    types: placeholder as Registry['documentation.openapi']['types'],
  },
  'documentation.reference': {
    methods: ["GET","HEAD"],
    pattern: '/documentation',
    tokens: [[0,"documentation"]],
    types: placeholder as Registry['documentation.reference']['types'],
  },
  'storefront.listings.paginate': {
    methods: ["GET","HEAD"],
    pattern: '/storefront/listings',
    tokens: [[0,"storefront"],[0,"listings"]],
    types: placeholder as Registry['storefront.listings.paginate']['types'],
  },
  'storefront.listings.pins': {
    methods: ["GET","HEAD"],
    pattern: '/storefront/listings/pins',
    tokens: [[0,"storefront"],[0,"listings"],[0,"pins"]],
    types: placeholder as Registry['storefront.listings.pins']['types'],
  },
  'storefront.listings.show': {
    methods: ["GET","HEAD"],
    pattern: '/storefront/listings/:slug',
    tokens: [[0,"storefront"],[0,"listings"],[1,"slug"]],
    types: placeholder as Registry['storefront.listings.show']['types'],
  },
  'storefront.neighborhoods.paginate': {
    methods: ["GET","HEAD"],
    pattern: '/storefront/neighborhoods',
    tokens: [[0,"storefront"],[0,"neighborhoods"]],
    types: placeholder as Registry['storefront.neighborhoods.paginate']['types'],
  },
  'storefront.places.paginate': {
    methods: ["GET","HEAD"],
    pattern: '/storefront/places',
    tokens: [[0,"storefront"],[0,"places"]],
    types: placeholder as Registry['storefront.places.paginate']['types'],
  },
  'storefront.reports.create': {
    methods: ["POST"],
    pattern: '/storefront/reports',
    tokens: [[0,"storefront"],[0,"reports"]],
    types: placeholder as Registry['storefront.reports.create']['types'],
  },
  'authentication.sign_in': {
    methods: ["POST"],
    pattern: '/authentication/sign-in',
    tokens: [[0,"authentication"],[0,"sign-in"]],
    types: placeholder as Registry['authentication.sign_in']['types'],
  },
  'authentication.sign_up': {
    methods: ["POST"],
    pattern: '/authentication/sign-up',
    tokens: [[0,"authentication"],[0,"sign-up"]],
    types: placeholder as Registry['authentication.sign_up']['types'],
  },
  'authentication.sign_out': {
    methods: ["POST"],
    pattern: '/authentication/sign-out',
    tokens: [[0,"authentication"],[0,"sign-out"]],
    types: placeholder as Registry['authentication.sign_out']['types'],
  },
  'authentication.refresh': {
    methods: ["POST"],
    pattern: '/authentication/refresh',
    tokens: [[0,"authentication"],[0,"refresh"]],
    types: placeholder as Registry['authentication.refresh']['types'],
  },
  'profile.show': {
    methods: ["GET","HEAD"],
    pattern: '/account',
    tokens: [[0,"account"]],
    types: placeholder as Registry['profile.show']['types'],
  },
  'profile.update': {
    methods: ["PUT"],
    pattern: '/account',
    tokens: [[0,"account"]],
    types: placeholder as Registry['profile.update']['types'],
  },
  'owner.listings.paginate': {
    methods: ["GET","HEAD"],
    pattern: '/owner/listings',
    tokens: [[0,"owner"],[0,"listings"]],
    types: placeholder as Registry['owner.listings.paginate']['types'],
  },
  'owner.listings.create': {
    methods: ["POST"],
    pattern: '/owner/listings',
    tokens: [[0,"owner"],[0,"listings"]],
    types: placeholder as Registry['owner.listings.create']['types'],
  },
  'owner.listings.show': {
    methods: ["GET","HEAD"],
    pattern: '/owner/listings/:id',
    tokens: [[0,"owner"],[0,"listings"],[1,"id"]],
    types: placeholder as Registry['owner.listings.show']['types'],
  },
  'owner.listings.update': {
    methods: ["PUT"],
    pattern: '/owner/listings/:id',
    tokens: [[0,"owner"],[0,"listings"],[1,"id"]],
    types: placeholder as Registry['owner.listings.update']['types'],
  },
  'owner.listings.archive': {
    methods: ["DELETE"],
    pattern: '/owner/listings/:id',
    tokens: [[0,"owner"],[0,"listings"],[1,"id"]],
    types: placeholder as Registry['owner.listings.archive']['types'],
  },
  'owner.listings.photos': {
    methods: ["POST"],
    pattern: '/owner/listings/:id/photos',
    tokens: [[0,"owner"],[0,"listings"],[1,"id"],[0,"photos"]],
    types: placeholder as Registry['owner.listings.photos']['types'],
  },
  'owner.listings.photos.order': {
    methods: ["PUT"],
    pattern: '/owner/listings/:id/photos/order',
    tokens: [[0,"owner"],[0,"listings"],[1,"id"],[0,"photos"],[0,"order"]],
    types: placeholder as Registry['owner.listings.photos.order']['types'],
  },
  'owner.listings.photos.delete': {
    methods: ["DELETE"],
    pattern: '/owner/listings/:id/photos/:photoId',
    tokens: [[0,"owner"],[0,"listings"],[1,"id"],[0,"photos"],[1,"photoId"]],
    types: placeholder as Registry['owner.listings.photos.delete']['types'],
  },
  'administrator.listings.paginate': {
    methods: ["GET","HEAD"],
    pattern: '/administrator/listings',
    tokens: [[0,"administrator"],[0,"listings"]],
    types: placeholder as Registry['administrator.listings.paginate']['types'],
  },
  'administrator.listings.show': {
    methods: ["GET","HEAD"],
    pattern: '/administrator/listings/:id',
    tokens: [[0,"administrator"],[0,"listings"],[1,"id"]],
    types: placeholder as Registry['administrator.listings.show']['types'],
  },
  'administrator.listings.review': {
    methods: ["PUT"],
    pattern: '/administrator/listings/:id/review',
    tokens: [[0,"administrator"],[0,"listings"],[1,"id"],[0,"review"]],
    types: placeholder as Registry['administrator.listings.review']['types'],
  },
  'administrator.listings.archive': {
    methods: ["DELETE"],
    pattern: '/administrator/listings/:id',
    tokens: [[0,"administrator"],[0,"listings"],[1,"id"]],
    types: placeholder as Registry['administrator.listings.archive']['types'],
  },
  'administrator.owners.verify': {
    methods: ["PUT"],
    pattern: '/administrator/owners/:id/verification',
    tokens: [[0,"administrator"],[0,"owners"],[1,"id"],[0,"verification"]],
    types: placeholder as Registry['administrator.owners.verify']['types'],
  },
  'administrator.reports.paginate': {
    methods: ["GET","HEAD"],
    pattern: '/administrator/reports',
    tokens: [[0,"administrator"],[0,"reports"]],
    types: placeholder as Registry['administrator.reports.paginate']['types'],
  },
  'administrator.reports.resolve': {
    methods: ["PUT"],
    pattern: '/administrator/reports/:id/resolution',
    tokens: [[0,"administrator"],[0,"reports"],[1,"id"],[0,"resolution"]],
    types: placeholder as Registry['administrator.reports.resolve']['types'],
  },
  'storages.paginate': {
    methods: ["GET","HEAD"],
    pattern: '/storages',
    tokens: [[0,"storages"]],
    types: placeholder as Registry['storages.paginate']['types'],
  },
  'storages.create': {
    methods: ["POST"],
    pattern: '/storages',
    tokens: [[0,"storages"]],
    types: placeholder as Registry['storages.create']['types'],
  },
  'storages.complete': {
    methods: ["POST"],
    pattern: '/storages/:id/complete',
    tokens: [[0,"storages"],[1,"id"],[0,"complete"]],
    types: placeholder as Registry['storages.complete']['types'],
  },
  'storages.parts': {
    methods: ["GET","HEAD"],
    pattern: '/storages/:id/parts',
    tokens: [[0,"storages"],[1,"id"],[0,"parts"]],
    types: placeholder as Registry['storages.parts']['types'],
  },
  'storages.show': {
    methods: ["GET","HEAD"],
    pattern: '/storages/:id',
    tokens: [[0,"storages"],[1,"id"]],
    types: placeholder as Registry['storages.show']['types'],
  },
  'storages.delete': {
    methods: ["DELETE"],
    pattern: '/storages/:id',
    tokens: [[0,"storages"],[1,"id"]],
    types: placeholder as Registry['storages.delete']['types'],
  },
  'storages.download': {
    methods: ["GET","HEAD"],
    pattern: '/storages/:id/download',
    tokens: [[0,"storages"],[1,"id"],[0,"download"]],
    types: placeholder as Registry['storages.download']['types'],
  },
} as const satisfies Record<string, AdonisEndpoint>

export { routes }

export const registry = {
  routes,
  $tree: {} as ApiDefinition,
}

declare module '@tuyau/core/types' {
  export interface UserRegistry {
    routes: typeof routes
    $tree: ApiDefinition
  }
}
