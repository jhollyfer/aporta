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
  'storefront.notices.paginate': {
    methods: ["GET","HEAD"],
    pattern: '/storefront/notices',
    tokens: [[0,"storefront"],[0,"notices"]],
    types: placeholder as Registry['storefront.notices.paginate']['types'],
  },
  'storefront.notices.show': {
    methods: ["GET","HEAD"],
    pattern: '/storefront/notices/:slug',
    tokens: [[0,"storefront"],[0,"notices"],[1,"slug"]],
    types: placeholder as Registry['storefront.notices.show']['types'],
  },
  'storefront.events.paginate': {
    methods: ["GET","HEAD"],
    pattern: '/storefront/events',
    tokens: [[0,"storefront"],[0,"events"]],
    types: placeholder as Registry['storefront.events.paginate']['types'],
  },
  'storefront.events.show': {
    methods: ["GET","HEAD"],
    pattern: '/storefront/events/:slug',
    tokens: [[0,"storefront"],[0,"events"],[1,"slug"]],
    types: placeholder as Registry['storefront.events.show']['types'],
  },
  'storefront.podcasts.paginate': {
    methods: ["GET","HEAD"],
    pattern: '/storefront/podcasts',
    tokens: [[0,"storefront"],[0,"podcasts"]],
    types: placeholder as Registry['storefront.podcasts.paginate']['types'],
  },
  'storefront.podcasts.show': {
    methods: ["GET","HEAD"],
    pattern: '/storefront/podcasts/:id',
    tokens: [[0,"storefront"],[0,"podcasts"],[1,"id"]],
    types: placeholder as Registry['storefront.podcasts.show']['types'],
  },
  'storefront.videos.paginate': {
    methods: ["GET","HEAD"],
    pattern: '/storefront/videos',
    tokens: [[0,"storefront"],[0,"videos"]],
    types: placeholder as Registry['storefront.videos.paginate']['types'],
  },
  'storefront.videos.show': {
    methods: ["GET","HEAD"],
    pattern: '/storefront/videos/:id',
    tokens: [[0,"storefront"],[0,"videos"],[1,"id"]],
    types: placeholder as Registry['storefront.videos.show']['types'],
  },
  'storefront.albums.paginate': {
    methods: ["GET","HEAD"],
    pattern: '/storefront/albums',
    tokens: [[0,"storefront"],[0,"albums"]],
    types: placeholder as Registry['storefront.albums.paginate']['types'],
  },
  'storefront.albums.show': {
    methods: ["GET","HEAD"],
    pattern: '/storefront/albums/:id',
    tokens: [[0,"storefront"],[0,"albums"],[1,"id"]],
    types: placeholder as Registry['storefront.albums.show']['types'],
  },
  'storefront.testimonials.paginate': {
    methods: ["GET","HEAD"],
    pattern: '/storefront/testimonials',
    tokens: [[0,"storefront"],[0,"testimonials"]],
    types: placeholder as Registry['storefront.testimonials.paginate']['types'],
  },
  'storefront.testimonials.show': {
    methods: ["GET","HEAD"],
    pattern: '/storefront/testimonials/:id',
    tokens: [[0,"storefront"],[0,"testimonials"],[1,"id"]],
    types: placeholder as Registry['storefront.testimonials.show']['types'],
  },
  'authentication.sign_in': {
    methods: ["POST"],
    pattern: '/authentication/sign-in',
    tokens: [[0,"authentication"],[0,"sign-in"]],
    types: placeholder as Registry['authentication.sign_in']['types'],
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
  'administrator.dashboard': {
    methods: ["GET","HEAD"],
    pattern: '/administrator/dashboard',
    tokens: [[0,"administrator"],[0,"dashboard"]],
    types: placeholder as Registry['administrator.dashboard']['types'],
  },
  'administrator.notices.paginate': {
    methods: ["GET","HEAD"],
    pattern: '/administrator/notices',
    tokens: [[0,"administrator"],[0,"notices"]],
    types: placeholder as Registry['administrator.notices.paginate']['types'],
  },
  'administrator.notices.create': {
    methods: ["POST"],
    pattern: '/administrator/notices',
    tokens: [[0,"administrator"],[0,"notices"]],
    types: placeholder as Registry['administrator.notices.create']['types'],
  },
  'administrator.notices.show': {
    methods: ["GET","HEAD"],
    pattern: '/administrator/notices/:id',
    tokens: [[0,"administrator"],[0,"notices"],[1,"id"]],
    types: placeholder as Registry['administrator.notices.show']['types'],
  },
  'administrator.notices.update': {
    methods: ["PUT"],
    pattern: '/administrator/notices/:id',
    tokens: [[0,"administrator"],[0,"notices"],[1,"id"]],
    types: placeholder as Registry['administrator.notices.update']['types'],
  },
  'administrator.events.paginate': {
    methods: ["GET","HEAD"],
    pattern: '/administrator/events',
    tokens: [[0,"administrator"],[0,"events"]],
    types: placeholder as Registry['administrator.events.paginate']['types'],
  },
  'administrator.events.create': {
    methods: ["POST"],
    pattern: '/administrator/events',
    tokens: [[0,"administrator"],[0,"events"]],
    types: placeholder as Registry['administrator.events.create']['types'],
  },
  'administrator.events.show': {
    methods: ["GET","HEAD"],
    pattern: '/administrator/events/:id',
    tokens: [[0,"administrator"],[0,"events"],[1,"id"]],
    types: placeholder as Registry['administrator.events.show']['types'],
  },
  'administrator.events.update': {
    methods: ["PUT"],
    pattern: '/administrator/events/:id',
    tokens: [[0,"administrator"],[0,"events"],[1,"id"]],
    types: placeholder as Registry['administrator.events.update']['types'],
  },
  'administrator.podcasts.paginate': {
    methods: ["GET","HEAD"],
    pattern: '/administrator/podcasts',
    tokens: [[0,"administrator"],[0,"podcasts"]],
    types: placeholder as Registry['administrator.podcasts.paginate']['types'],
  },
  'administrator.podcasts.create': {
    methods: ["POST"],
    pattern: '/administrator/podcasts',
    tokens: [[0,"administrator"],[0,"podcasts"]],
    types: placeholder as Registry['administrator.podcasts.create']['types'],
  },
  'administrator.podcasts.show': {
    methods: ["GET","HEAD"],
    pattern: '/administrator/podcasts/:id',
    tokens: [[0,"administrator"],[0,"podcasts"],[1,"id"]],
    types: placeholder as Registry['administrator.podcasts.show']['types'],
  },
  'administrator.podcasts.update': {
    methods: ["PUT"],
    pattern: '/administrator/podcasts/:id',
    tokens: [[0,"administrator"],[0,"podcasts"],[1,"id"]],
    types: placeholder as Registry['administrator.podcasts.update']['types'],
  },
  'administrator.videos.paginate': {
    methods: ["GET","HEAD"],
    pattern: '/administrator/videos',
    tokens: [[0,"administrator"],[0,"videos"]],
    types: placeholder as Registry['administrator.videos.paginate']['types'],
  },
  'administrator.videos.create': {
    methods: ["POST"],
    pattern: '/administrator/videos',
    tokens: [[0,"administrator"],[0,"videos"]],
    types: placeholder as Registry['administrator.videos.create']['types'],
  },
  'administrator.videos.show': {
    methods: ["GET","HEAD"],
    pattern: '/administrator/videos/:id',
    tokens: [[0,"administrator"],[0,"videos"],[1,"id"]],
    types: placeholder as Registry['administrator.videos.show']['types'],
  },
  'administrator.videos.update': {
    methods: ["PUT"],
    pattern: '/administrator/videos/:id',
    tokens: [[0,"administrator"],[0,"videos"],[1,"id"]],
    types: placeholder as Registry['administrator.videos.update']['types'],
  },
  'administrator.albums.paginate': {
    methods: ["GET","HEAD"],
    pattern: '/administrator/albums',
    tokens: [[0,"administrator"],[0,"albums"]],
    types: placeholder as Registry['administrator.albums.paginate']['types'],
  },
  'administrator.albums.create': {
    methods: ["POST"],
    pattern: '/administrator/albums',
    tokens: [[0,"administrator"],[0,"albums"]],
    types: placeholder as Registry['administrator.albums.create']['types'],
  },
  'administrator.albums.show': {
    methods: ["GET","HEAD"],
    pattern: '/administrator/albums/:id',
    tokens: [[0,"administrator"],[0,"albums"],[1,"id"]],
    types: placeholder as Registry['administrator.albums.show']['types'],
  },
  'administrator.albums.update': {
    methods: ["PUT"],
    pattern: '/administrator/albums/:id',
    tokens: [[0,"administrator"],[0,"albums"],[1,"id"]],
    types: placeholder as Registry['administrator.albums.update']['types'],
  },
  'administrator.testimonials.paginate': {
    methods: ["GET","HEAD"],
    pattern: '/administrator/testimonials',
    tokens: [[0,"administrator"],[0,"testimonials"]],
    types: placeholder as Registry['administrator.testimonials.paginate']['types'],
  },
  'administrator.testimonials.create': {
    methods: ["POST"],
    pattern: '/administrator/testimonials',
    tokens: [[0,"administrator"],[0,"testimonials"]],
    types: placeholder as Registry['administrator.testimonials.create']['types'],
  },
  'administrator.testimonials.show': {
    methods: ["GET","HEAD"],
    pattern: '/administrator/testimonials/:id',
    tokens: [[0,"administrator"],[0,"testimonials"],[1,"id"]],
    types: placeholder as Registry['administrator.testimonials.show']['types'],
  },
  'administrator.testimonials.update': {
    methods: ["PUT"],
    pattern: '/administrator/testimonials/:id',
    tokens: [[0,"administrator"],[0,"testimonials"],[1,"id"]],
    types: placeholder as Registry['administrator.testimonials.update']['types'],
  },
  'administrator.users.paginate': {
    methods: ["GET","HEAD"],
    pattern: '/administrator/users',
    tokens: [[0,"administrator"],[0,"users"]],
    types: placeholder as Registry['administrator.users.paginate']['types'],
  },
  'administrator.users.create': {
    methods: ["POST"],
    pattern: '/administrator/users',
    tokens: [[0,"administrator"],[0,"users"]],
    types: placeholder as Registry['administrator.users.create']['types'],
  },
  'administrator.users.show': {
    methods: ["GET","HEAD"],
    pattern: '/administrator/users/:id',
    tokens: [[0,"administrator"],[0,"users"],[1,"id"]],
    types: placeholder as Registry['administrator.users.show']['types'],
  },
  'administrator.users.update': {
    methods: ["PUT"],
    pattern: '/administrator/users/:id',
    tokens: [[0,"administrator"],[0,"users"],[1,"id"]],
    types: placeholder as Registry['administrator.users.update']['types'],
  },
  'administrator.lifecycle.notices.archive': {
    methods: ["PATCH"],
    pattern: '/administrator/notices/:id/archive',
    tokens: [[0,"administrator"],[0,"notices"],[1,"id"],[0,"archive"]],
    types: placeholder as Registry['administrator.lifecycle.notices.archive']['types'],
  },
  'administrator.lifecycle.notices.unarchive': {
    methods: ["PATCH"],
    pattern: '/administrator/notices/:id/unarchive',
    tokens: [[0,"administrator"],[0,"notices"],[1,"id"],[0,"unarchive"]],
    types: placeholder as Registry['administrator.lifecycle.notices.unarchive']['types'],
  },
  'administrator.lifecycle.notices.purge': {
    methods: ["DELETE"],
    pattern: '/administrator/notices/:id',
    tokens: [[0,"administrator"],[0,"notices"],[1,"id"]],
    types: placeholder as Registry['administrator.lifecycle.notices.purge']['types'],
  },
  'administrator.lifecycle.events.archive': {
    methods: ["PATCH"],
    pattern: '/administrator/events/:id/archive',
    tokens: [[0,"administrator"],[0,"events"],[1,"id"],[0,"archive"]],
    types: placeholder as Registry['administrator.lifecycle.events.archive']['types'],
  },
  'administrator.lifecycle.events.unarchive': {
    methods: ["PATCH"],
    pattern: '/administrator/events/:id/unarchive',
    tokens: [[0,"administrator"],[0,"events"],[1,"id"],[0,"unarchive"]],
    types: placeholder as Registry['administrator.lifecycle.events.unarchive']['types'],
  },
  'administrator.lifecycle.events.purge': {
    methods: ["DELETE"],
    pattern: '/administrator/events/:id',
    tokens: [[0,"administrator"],[0,"events"],[1,"id"]],
    types: placeholder as Registry['administrator.lifecycle.events.purge']['types'],
  },
  'administrator.lifecycle.podcasts.archive': {
    methods: ["PATCH"],
    pattern: '/administrator/podcasts/:id/archive',
    tokens: [[0,"administrator"],[0,"podcasts"],[1,"id"],[0,"archive"]],
    types: placeholder as Registry['administrator.lifecycle.podcasts.archive']['types'],
  },
  'administrator.lifecycle.podcasts.unarchive': {
    methods: ["PATCH"],
    pattern: '/administrator/podcasts/:id/unarchive',
    tokens: [[0,"administrator"],[0,"podcasts"],[1,"id"],[0,"unarchive"]],
    types: placeholder as Registry['administrator.lifecycle.podcasts.unarchive']['types'],
  },
  'administrator.lifecycle.podcasts.purge': {
    methods: ["DELETE"],
    pattern: '/administrator/podcasts/:id',
    tokens: [[0,"administrator"],[0,"podcasts"],[1,"id"]],
    types: placeholder as Registry['administrator.lifecycle.podcasts.purge']['types'],
  },
  'administrator.lifecycle.videos.archive': {
    methods: ["PATCH"],
    pattern: '/administrator/videos/:id/archive',
    tokens: [[0,"administrator"],[0,"videos"],[1,"id"],[0,"archive"]],
    types: placeholder as Registry['administrator.lifecycle.videos.archive']['types'],
  },
  'administrator.lifecycle.videos.unarchive': {
    methods: ["PATCH"],
    pattern: '/administrator/videos/:id/unarchive',
    tokens: [[0,"administrator"],[0,"videos"],[1,"id"],[0,"unarchive"]],
    types: placeholder as Registry['administrator.lifecycle.videos.unarchive']['types'],
  },
  'administrator.lifecycle.videos.purge': {
    methods: ["DELETE"],
    pattern: '/administrator/videos/:id',
    tokens: [[0,"administrator"],[0,"videos"],[1,"id"]],
    types: placeholder as Registry['administrator.lifecycle.videos.purge']['types'],
  },
  'administrator.lifecycle.albums.archive': {
    methods: ["PATCH"],
    pattern: '/administrator/albums/:id/archive',
    tokens: [[0,"administrator"],[0,"albums"],[1,"id"],[0,"archive"]],
    types: placeholder as Registry['administrator.lifecycle.albums.archive']['types'],
  },
  'administrator.lifecycle.albums.unarchive': {
    methods: ["PATCH"],
    pattern: '/administrator/albums/:id/unarchive',
    tokens: [[0,"administrator"],[0,"albums"],[1,"id"],[0,"unarchive"]],
    types: placeholder as Registry['administrator.lifecycle.albums.unarchive']['types'],
  },
  'administrator.lifecycle.albums.purge': {
    methods: ["DELETE"],
    pattern: '/administrator/albums/:id',
    tokens: [[0,"administrator"],[0,"albums"],[1,"id"]],
    types: placeholder as Registry['administrator.lifecycle.albums.purge']['types'],
  },
  'administrator.lifecycle.testimonials.archive': {
    methods: ["PATCH"],
    pattern: '/administrator/testimonials/:id/archive',
    tokens: [[0,"administrator"],[0,"testimonials"],[1,"id"],[0,"archive"]],
    types: placeholder as Registry['administrator.lifecycle.testimonials.archive']['types'],
  },
  'administrator.lifecycle.testimonials.unarchive': {
    methods: ["PATCH"],
    pattern: '/administrator/testimonials/:id/unarchive',
    tokens: [[0,"administrator"],[0,"testimonials"],[1,"id"],[0,"unarchive"]],
    types: placeholder as Registry['administrator.lifecycle.testimonials.unarchive']['types'],
  },
  'administrator.lifecycle.testimonials.purge': {
    methods: ["DELETE"],
    pattern: '/administrator/testimonials/:id',
    tokens: [[0,"administrator"],[0,"testimonials"],[1,"id"]],
    types: placeholder as Registry['administrator.lifecycle.testimonials.purge']['types'],
  },
  'administrator.lifecycle.users.archive': {
    methods: ["PATCH"],
    pattern: '/administrator/users/:id/archive',
    tokens: [[0,"administrator"],[0,"users"],[1,"id"],[0,"archive"]],
    types: placeholder as Registry['administrator.lifecycle.users.archive']['types'],
  },
  'administrator.lifecycle.users.unarchive': {
    methods: ["PATCH"],
    pattern: '/administrator/users/:id/unarchive',
    tokens: [[0,"administrator"],[0,"users"],[1,"id"],[0,"unarchive"]],
    types: placeholder as Registry['administrator.lifecycle.users.unarchive']['types'],
  },
  'administrator.lifecycle.users.purge': {
    methods: ["DELETE"],
    pattern: '/administrator/users/:id',
    tokens: [[0,"administrator"],[0,"users"],[1,"id"]],
    types: placeholder as Registry['administrator.lifecycle.users.purge']['types'],
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
