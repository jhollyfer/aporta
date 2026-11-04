import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'health_check': { paramsTuple?: []; params?: {} }
    'documentation.openapi': { paramsTuple?: []; params?: {} }
    'documentation.reference': { paramsTuple?: []; params?: {} }
    'storefront.listings.paginate': { paramsTuple?: []; params?: {} }
    'storefront.listings.pins': { paramsTuple?: []; params?: {} }
    'storefront.listings.show': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'storefront.neighborhoods.paginate': { paramsTuple?: []; params?: {} }
    'storefront.places.paginate': { paramsTuple?: []; params?: {} }
    'storefront.reports.create': { paramsTuple?: []; params?: {} }
    'authentication.sign_in': { paramsTuple?: []; params?: {} }
    'authentication.sign_up': { paramsTuple?: []; params?: {} }
    'authentication.sign_out': { paramsTuple?: []; params?: {} }
    'authentication.refresh': { paramsTuple?: []; params?: {} }
    'profile.show': { paramsTuple?: []; params?: {} }
    'profile.update': { paramsTuple?: []; params?: {} }
    'owner.listings.paginate': { paramsTuple?: []; params?: {} }
    'owner.listings.create': { paramsTuple?: []; params?: {} }
    'owner.listings.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'owner.listings.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'owner.listings.archive': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'owner.listings.photos': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'owner.listings.photos.order': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'owner.listings.photos.delete': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'photoId': ParamValue} }
    'administrator.listings.paginate': { paramsTuple?: []; params?: {} }
    'administrator.listings.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.listings.review': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.listings.archive': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.owners.verify': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.reports.paginate': { paramsTuple?: []; params?: {} }
    'administrator.reports.resolve': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'storages.paginate': { paramsTuple?: []; params?: {} }
    'storages.create': { paramsTuple?: []; params?: {} }
    'storages.complete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'storages.parts': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'storages.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'storages.delete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'storages.download': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  GET: {
    'health_check': { paramsTuple?: []; params?: {} }
    'documentation.openapi': { paramsTuple?: []; params?: {} }
    'documentation.reference': { paramsTuple?: []; params?: {} }
    'storefront.listings.paginate': { paramsTuple?: []; params?: {} }
    'storefront.listings.pins': { paramsTuple?: []; params?: {} }
    'storefront.listings.show': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'storefront.neighborhoods.paginate': { paramsTuple?: []; params?: {} }
    'storefront.places.paginate': { paramsTuple?: []; params?: {} }
    'profile.show': { paramsTuple?: []; params?: {} }
    'owner.listings.paginate': { paramsTuple?: []; params?: {} }
    'owner.listings.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.listings.paginate': { paramsTuple?: []; params?: {} }
    'administrator.listings.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.reports.paginate': { paramsTuple?: []; params?: {} }
    'storages.paginate': { paramsTuple?: []; params?: {} }
    'storages.parts': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'storages.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'storages.download': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  HEAD: {
    'health_check': { paramsTuple?: []; params?: {} }
    'documentation.openapi': { paramsTuple?: []; params?: {} }
    'documentation.reference': { paramsTuple?: []; params?: {} }
    'storefront.listings.paginate': { paramsTuple?: []; params?: {} }
    'storefront.listings.pins': { paramsTuple?: []; params?: {} }
    'storefront.listings.show': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'storefront.neighborhoods.paginate': { paramsTuple?: []; params?: {} }
    'storefront.places.paginate': { paramsTuple?: []; params?: {} }
    'profile.show': { paramsTuple?: []; params?: {} }
    'owner.listings.paginate': { paramsTuple?: []; params?: {} }
    'owner.listings.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.listings.paginate': { paramsTuple?: []; params?: {} }
    'administrator.listings.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.reports.paginate': { paramsTuple?: []; params?: {} }
    'storages.paginate': { paramsTuple?: []; params?: {} }
    'storages.parts': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'storages.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'storages.download': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  POST: {
    'storefront.reports.create': { paramsTuple?: []; params?: {} }
    'authentication.sign_in': { paramsTuple?: []; params?: {} }
    'authentication.sign_up': { paramsTuple?: []; params?: {} }
    'authentication.sign_out': { paramsTuple?: []; params?: {} }
    'authentication.refresh': { paramsTuple?: []; params?: {} }
    'owner.listings.create': { paramsTuple?: []; params?: {} }
    'owner.listings.photos': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'storages.create': { paramsTuple?: []; params?: {} }
    'storages.complete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  PUT: {
    'profile.update': { paramsTuple?: []; params?: {} }
    'owner.listings.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'owner.listings.photos.order': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.listings.review': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.owners.verify': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.reports.resolve': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  DELETE: {
    'owner.listings.archive': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'owner.listings.photos.delete': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'photoId': ParamValue} }
    'administrator.listings.archive': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'storages.delete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}