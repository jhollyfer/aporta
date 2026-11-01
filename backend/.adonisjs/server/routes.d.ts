import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'health_check': { paramsTuple?: []; params?: {} }
    'documentation.openapi': { paramsTuple?: []; params?: {} }
    'documentation.reference': { paramsTuple?: []; params?: {} }
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
  }
  GET: {
    'health_check': { paramsTuple?: []; params?: {} }
    'documentation.openapi': { paramsTuple?: []; params?: {} }
    'documentation.reference': { paramsTuple?: []; params?: {} }
    'profile.show': { paramsTuple?: []; params?: {} }
    'storages.paginate': { paramsTuple?: []; params?: {} }
    'storages.parts': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'storages.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'storages.download': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  HEAD: {
    'health_check': { paramsTuple?: []; params?: {} }
    'documentation.openapi': { paramsTuple?: []; params?: {} }
    'documentation.reference': { paramsTuple?: []; params?: {} }
    'profile.show': { paramsTuple?: []; params?: {} }
    'storages.paginate': { paramsTuple?: []; params?: {} }
    'storages.parts': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'storages.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'storages.download': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  POST: {
    'authentication.sign_in': { paramsTuple?: []; params?: {} }
    'authentication.sign_out': { paramsTuple?: []; params?: {} }
    'authentication.refresh': { paramsTuple?: []; params?: {} }
    'storages.create': { paramsTuple?: []; params?: {} }
    'storages.complete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  PUT: {
    'profile.update': { paramsTuple?: []; params?: {} }
  }
  DELETE: {
    'storages.delete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}