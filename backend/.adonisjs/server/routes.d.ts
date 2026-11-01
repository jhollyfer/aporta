import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'health_check': { paramsTuple?: []; params?: {} }
    'documentation.openapi': { paramsTuple?: []; params?: {} }
    'documentation.reference': { paramsTuple?: []; params?: {} }
    'storefront.notices.paginate': { paramsTuple?: []; params?: {} }
    'storefront.notices.show': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'storefront.events.paginate': { paramsTuple?: []; params?: {} }
    'storefront.events.show': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'storefront.podcasts.paginate': { paramsTuple?: []; params?: {} }
    'storefront.podcasts.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'storefront.videos.paginate': { paramsTuple?: []; params?: {} }
    'storefront.videos.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'storefront.albums.paginate': { paramsTuple?: []; params?: {} }
    'storefront.albums.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'storefront.testimonials.paginate': { paramsTuple?: []; params?: {} }
    'storefront.testimonials.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'authentication.sign_in': { paramsTuple?: []; params?: {} }
    'authentication.sign_out': { paramsTuple?: []; params?: {} }
    'authentication.refresh': { paramsTuple?: []; params?: {} }
    'profile.show': { paramsTuple?: []; params?: {} }
    'profile.update': { paramsTuple?: []; params?: {} }
    'storages.paginate': { paramsTuple?: []; params?: {} }
    'storages.create': { paramsTuple?: []; params?: {} }
    'storages.complete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'storages.parts': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'storages.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'storages.delete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'storages.download': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.dashboard': { paramsTuple?: []; params?: {} }
    'administrator.notices.paginate': { paramsTuple?: []; params?: {} }
    'administrator.notices.create': { paramsTuple?: []; params?: {} }
    'administrator.notices.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.notices.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.events.paginate': { paramsTuple?: []; params?: {} }
    'administrator.events.create': { paramsTuple?: []; params?: {} }
    'administrator.events.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.events.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.podcasts.paginate': { paramsTuple?: []; params?: {} }
    'administrator.podcasts.create': { paramsTuple?: []; params?: {} }
    'administrator.podcasts.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.podcasts.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.videos.paginate': { paramsTuple?: []; params?: {} }
    'administrator.videos.create': { paramsTuple?: []; params?: {} }
    'administrator.videos.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.videos.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.albums.paginate': { paramsTuple?: []; params?: {} }
    'administrator.albums.create': { paramsTuple?: []; params?: {} }
    'administrator.albums.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.albums.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.testimonials.paginate': { paramsTuple?: []; params?: {} }
    'administrator.testimonials.create': { paramsTuple?: []; params?: {} }
    'administrator.testimonials.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.testimonials.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.users.paginate': { paramsTuple?: []; params?: {} }
    'administrator.users.create': { paramsTuple?: []; params?: {} }
    'administrator.users.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.users.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.lifecycle.notices.archive': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.lifecycle.notices.unarchive': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.lifecycle.notices.purge': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.lifecycle.events.archive': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.lifecycle.events.unarchive': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.lifecycle.events.purge': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.lifecycle.podcasts.archive': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.lifecycle.podcasts.unarchive': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.lifecycle.podcasts.purge': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.lifecycle.videos.archive': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.lifecycle.videos.unarchive': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.lifecycle.videos.purge': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.lifecycle.albums.archive': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.lifecycle.albums.unarchive': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.lifecycle.albums.purge': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.lifecycle.testimonials.archive': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.lifecycle.testimonials.unarchive': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.lifecycle.testimonials.purge': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.lifecycle.users.archive': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.lifecycle.users.unarchive': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.lifecycle.users.purge': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  GET: {
    'health_check': { paramsTuple?: []; params?: {} }
    'documentation.openapi': { paramsTuple?: []; params?: {} }
    'documentation.reference': { paramsTuple?: []; params?: {} }
    'storefront.notices.paginate': { paramsTuple?: []; params?: {} }
    'storefront.notices.show': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'storefront.events.paginate': { paramsTuple?: []; params?: {} }
    'storefront.events.show': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'storefront.podcasts.paginate': { paramsTuple?: []; params?: {} }
    'storefront.podcasts.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'storefront.videos.paginate': { paramsTuple?: []; params?: {} }
    'storefront.videos.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'storefront.albums.paginate': { paramsTuple?: []; params?: {} }
    'storefront.albums.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'storefront.testimonials.paginate': { paramsTuple?: []; params?: {} }
    'storefront.testimonials.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'profile.show': { paramsTuple?: []; params?: {} }
    'storages.paginate': { paramsTuple?: []; params?: {} }
    'storages.parts': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'storages.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'storages.download': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.dashboard': { paramsTuple?: []; params?: {} }
    'administrator.notices.paginate': { paramsTuple?: []; params?: {} }
    'administrator.notices.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.events.paginate': { paramsTuple?: []; params?: {} }
    'administrator.events.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.podcasts.paginate': { paramsTuple?: []; params?: {} }
    'administrator.podcasts.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.videos.paginate': { paramsTuple?: []; params?: {} }
    'administrator.videos.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.albums.paginate': { paramsTuple?: []; params?: {} }
    'administrator.albums.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.testimonials.paginate': { paramsTuple?: []; params?: {} }
    'administrator.testimonials.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.users.paginate': { paramsTuple?: []; params?: {} }
    'administrator.users.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  HEAD: {
    'health_check': { paramsTuple?: []; params?: {} }
    'documentation.openapi': { paramsTuple?: []; params?: {} }
    'documentation.reference': { paramsTuple?: []; params?: {} }
    'storefront.notices.paginate': { paramsTuple?: []; params?: {} }
    'storefront.notices.show': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'storefront.events.paginate': { paramsTuple?: []; params?: {} }
    'storefront.events.show': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'storefront.podcasts.paginate': { paramsTuple?: []; params?: {} }
    'storefront.podcasts.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'storefront.videos.paginate': { paramsTuple?: []; params?: {} }
    'storefront.videos.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'storefront.albums.paginate': { paramsTuple?: []; params?: {} }
    'storefront.albums.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'storefront.testimonials.paginate': { paramsTuple?: []; params?: {} }
    'storefront.testimonials.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'profile.show': { paramsTuple?: []; params?: {} }
    'storages.paginate': { paramsTuple?: []; params?: {} }
    'storages.parts': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'storages.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'storages.download': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.dashboard': { paramsTuple?: []; params?: {} }
    'administrator.notices.paginate': { paramsTuple?: []; params?: {} }
    'administrator.notices.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.events.paginate': { paramsTuple?: []; params?: {} }
    'administrator.events.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.podcasts.paginate': { paramsTuple?: []; params?: {} }
    'administrator.podcasts.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.videos.paginate': { paramsTuple?: []; params?: {} }
    'administrator.videos.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.albums.paginate': { paramsTuple?: []; params?: {} }
    'administrator.albums.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.testimonials.paginate': { paramsTuple?: []; params?: {} }
    'administrator.testimonials.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.users.paginate': { paramsTuple?: []; params?: {} }
    'administrator.users.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  POST: {
    'authentication.sign_in': { paramsTuple?: []; params?: {} }
    'authentication.sign_out': { paramsTuple?: []; params?: {} }
    'authentication.refresh': { paramsTuple?: []; params?: {} }
    'storages.create': { paramsTuple?: []; params?: {} }
    'storages.complete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.notices.create': { paramsTuple?: []; params?: {} }
    'administrator.events.create': { paramsTuple?: []; params?: {} }
    'administrator.podcasts.create': { paramsTuple?: []; params?: {} }
    'administrator.videos.create': { paramsTuple?: []; params?: {} }
    'administrator.albums.create': { paramsTuple?: []; params?: {} }
    'administrator.testimonials.create': { paramsTuple?: []; params?: {} }
    'administrator.users.create': { paramsTuple?: []; params?: {} }
  }
  PUT: {
    'profile.update': { paramsTuple?: []; params?: {} }
    'administrator.notices.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.events.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.podcasts.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.videos.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.albums.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.testimonials.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.users.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  DELETE: {
    'storages.delete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.lifecycle.notices.purge': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.lifecycle.events.purge': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.lifecycle.podcasts.purge': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.lifecycle.videos.purge': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.lifecycle.albums.purge': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.lifecycle.testimonials.purge': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.lifecycle.users.purge': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  PATCH: {
    'administrator.lifecycle.notices.archive': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.lifecycle.notices.unarchive': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.lifecycle.events.archive': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.lifecycle.events.unarchive': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.lifecycle.podcasts.archive': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.lifecycle.podcasts.unarchive': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.lifecycle.videos.archive': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.lifecycle.videos.unarchive': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.lifecycle.albums.archive': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.lifecycle.albums.unarchive': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.lifecycle.testimonials.archive': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.lifecycle.testimonials.unarchive': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.lifecycle.users.archive': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.lifecycle.users.unarchive': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}