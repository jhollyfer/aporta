/* eslint-disable prettier/prettier */
/// <reference path="../manifest.d.ts" />

import type { ExtractBody, ExtractErrorResponse, ExtractQuery, ExtractQueryForGet, ExtractRawResponse, ExtractResponse, Method, PathWithRegistry, PatternsByMethod, RouteWithRegistry } from '@tuyau/core/types'
import type { InferInput, SimpleError } from '@vinejs/vine/types'
import type { routes } from './index.ts'

export type ParamValue = string | number | bigint | boolean

export interface Registry {
  'health_check': {
    methods: ["GET","HEAD"]
    pattern: '/health-check'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#features/health-check.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/health-check.controller').default['handle']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#features/health-check.controller').default['handle']>>>
    }
  }
  'documentation.openapi': {
    methods: ["GET","HEAD"]
    pattern: '/openapi.json'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#features/documentation/openapi/show/show.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/documentation/openapi/show/show.controller').default['handle']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#features/documentation/openapi/show/show.controller').default['handle']>>>
    }
  }
  'documentation.reference': {
    methods: ["GET","HEAD"]
    pattern: '/documentation'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#features/documentation/reference/show/show.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/documentation/reference/show/show.controller').default['handle']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#features/documentation/reference/show/show.controller').default['handle']>>>
    }
  }
  'storefront.listings.paginate': {
    methods: ["GET","HEAD"]
    pattern: '/storefront/listings'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/storefront/listings.validator').StorefrontListingPaginateValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/storefront/listings/paginate/paginate.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/storefront/listings/paginate/paginate.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#features/storefront/listings/paginate/paginate.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'storefront.listings.show': {
    methods: ["GET","HEAD"]
    pattern: '/storefront/listings/:slug'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { slug: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/storefront/listings.validator').StorefrontListingShowValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/storefront/listings/show/show.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/storefront/listings/show/show.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#features/storefront/listings/show/show.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'storefront.neighborhoods.paginate': {
    methods: ["GET","HEAD"]
    pattern: '/storefront/neighborhoods'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/storefront/neighborhoods.validator').StorefrontNeighborhoodPaginateValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/storefront/neighborhoods/paginate/paginate.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/storefront/neighborhoods/paginate/paginate.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#features/storefront/neighborhoods/paginate/paginate.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'storefront.places.paginate': {
    methods: ["GET","HEAD"]
    pattern: '/storefront/places'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/storefront/places.validator').StorefrontPlacePaginateValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/storefront/places/paginate/paginate.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/storefront/places/paginate/paginate.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#features/storefront/places/paginate/paginate.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'authentication.sign_in': {
    methods: ["POST"]
    pattern: '/authentication/sign-in'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/authentication/session.validator').AuthenticationSessionSignInValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/authentication/session.validator').AuthenticationSessionSignInValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/authentication/session/sign-in/sign-in.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/authentication/session/sign-in/sign-in.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#features/authentication/session/sign-in/sign-in.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'authentication.sign_out': {
    methods: ["POST"]
    pattern: '/authentication/sign-out'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#features/authentication/session/sign-out/sign-out.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/authentication/session/sign-out/sign-out.controller').default['handle']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#features/authentication/session/sign-out/sign-out.controller').default['handle']>>>
    }
  }
  'authentication.refresh': {
    methods: ["POST"]
    pattern: '/authentication/refresh'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#features/authentication/session/refresh/refresh.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/authentication/session/refresh/refresh.controller').default['handle']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#features/authentication/session/refresh/refresh.controller').default['handle']>>>
    }
  }
  'profile.show': {
    methods: ["GET","HEAD"]
    pattern: '/account'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#features/account/profile/show/show.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/account/profile/show/show.controller').default['handle']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#features/account/profile/show/show.controller').default['handle']>>>
    }
  }
  'profile.update': {
    methods: ["PUT"]
    pattern: '/account'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/account/profile.validator').AccountProfileUpdateValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/account/profile.validator').AccountProfileUpdateValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/account/profile/update/update.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/account/profile/update/update.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#features/account/profile/update/update.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'storages.paginate': {
    methods: ["GET","HEAD"]
    pattern: '/storages'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/storage/files.validator').StorageFilePaginateValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/storage/files/paginate/paginate.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/storage/files/paginate/paginate.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#features/storage/files/paginate/paginate.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'storages.create': {
    methods: ["POST"]
    pattern: '/storages'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/storage/files.validator').StorageFileCreateValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/storage/files.validator').StorageFileCreateValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/storage/files/create/create.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/storage/files/create/create.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#features/storage/files/create/create.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'storages.complete': {
    methods: ["POST"]
    pattern: '/storages/:id/complete'
    types: {
      body: ExtractBody<InferInput<(typeof import('#core/validator').IdentifierValidator)>|InferInput<(typeof import('#validators/storage/files.validator').StorageFileCompleteValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#core/validator').IdentifierValidator)>|InferInput<(typeof import('#validators/storage/files.validator').StorageFileCompleteValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/storage/files/complete/complete.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/storage/files/complete/complete.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#features/storage/files/complete/complete.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'storages.parts': {
    methods: ["GET","HEAD"]
    pattern: '/storages/:id/parts'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#core/validator').IdentifierValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/storage/files/parts/parts.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/storage/files/parts/parts.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#features/storage/files/parts/parts.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'storages.show': {
    methods: ["GET","HEAD"]
    pattern: '/storages/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#core/validator').IdentifierValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/storage/files/show/show.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/storage/files/show/show.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#features/storage/files/show/show.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'storages.delete': {
    methods: ["DELETE"]
    pattern: '/storages/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#core/validator').IdentifierValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#core/validator').IdentifierValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/storage/files/delete/delete.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/storage/files/delete/delete.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#features/storage/files/delete/delete.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'storages.download': {
    methods: ["GET","HEAD"]
    pattern: '/storages/:id/download'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#core/validator').IdentifierValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/storage/files/download/download.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/storage/files/download/download.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#features/storage/files/download/download.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
}

export namespace Route {
  export type Request<Name extends keyof typeof routes> = RouteWithRegistry.Request<typeof routes, Name>
  export type Response<Name extends keyof typeof routes> = RouteWithRegistry.Response<typeof routes, Name>
  export type Params<Name extends keyof typeof routes> = RouteWithRegistry.Params<typeof routes, Name>
  export type Body<Name extends keyof typeof routes> = RouteWithRegistry.Body<typeof routes, Name>
  export type Query<Name extends keyof typeof routes> = RouteWithRegistry.Query<typeof routes, Name>
  export type Error<Name extends keyof typeof routes> = RouteWithRegistry.Error<typeof routes, Name>
}

export namespace Path {
  export type Request<M extends Method, P extends PatternsByMethod<typeof routes, M>> =
    PathWithRegistry.Request<typeof routes, M, P>
  export type Response<M extends Method, P extends PatternsByMethod<typeof routes, M>> =
    PathWithRegistry.Response<typeof routes, M, P>
  export type Params<M extends Method, P extends PatternsByMethod<typeof routes, M>> =
    PathWithRegistry.Params<typeof routes, M, P>
  export type Body<M extends Method, P extends PatternsByMethod<typeof routes, M>> =
    PathWithRegistry.Body<typeof routes, M, P>
  export type Query<M extends Method, P extends PatternsByMethod<typeof routes, M>> =
    PathWithRegistry.Query<typeof routes, M, P>
  export type Error<M extends Method, P extends PatternsByMethod<typeof routes, M>> =
    PathWithRegistry.Error<typeof routes, M, P>
}
