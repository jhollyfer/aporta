import { defineConfig, services } from '@adonisjs/drive'
import type { InferDriveDisks } from '@adonisjs/drive/types'
import type { S3ClientConfig } from '@aws-sdk/client-s3'

import env from '#start/env'

/**
 * File storage: an S3-compatible bucket, the same in every environment.
 * MinIO in dev and in tests, and in production whatever the environment points to.
 *
 * A single destination because the upload is presigned multipart, and multipart is an S3 API
 * - the `fs` driver does not have it. A local disk in dev would exercise a code
 * path that production does not use, which is precisely what a single destination avoids.
 *
 * The credentials come from `STORAGE_*`, and not from a prefix per vendor: what
 * the code depends on is the protocol. R2, S3, Spaces, Linode and MinIO swap
 * places by changing `STORAGE_ENDPOINT`.
 */
export const bucket = env.get('STORAGE_BUCKET')

/** How long to wait for the TCP connection to the bucket, in milliseconds. */
export const CONNECTION_TIMEOUT = 5_000

/**
 * How long a request to the bucket may take, request and response together, in milliseconds.
 *
 * The binary never crosses this application, so what the calls carry is metadata,
 * `ListParts` and `CompleteMultipartUpload`; the last one reassembles the parts at the
 * bucket and, for a file at the 1 GiB ceiling, is the slowest, which is why the number is
 * not small.
 */
export const REQUEST_TIMEOUT = 120_000

/**
 * The connection to the bucket, exported because it has **two** consumers: the
 * FlyDrive below, and `MultipartService`, which talks to the AWS SDK
 * directly - FlyDrive does not expose multipart (`CreateMultipartUpload` and company).
 *
 * One constant and not two reads of `env`: two places reading the same
 * variables is where one of them gets forgotten the day the connection changes.
 */
export const clientConfig: S3ClientConfig = {
  credentials: {
    accessKeyId: env.get('STORAGE_KEY'),
    secretAccessKey: env.get('STORAGE_SECRET'),
  },
  region: 'auto',
  endpoint: env.get('STORAGE_ENDPOINT'),
  forcePathStyle: env.get('STORAGE_FORCE_PATH_STYLE') ?? false,

  // The SDK default is `WHEN_SUPPORTED`, and it breaks signed URLs: in the presign
  // there is no body, so the checksum that goes into the query is that of **zero bytes**
  // (`x-amz-checksum-crc32=AAAAAA==`). The browser sends the real file,
  // the bucket checks against that value and refuses the `PUT`. With `WHEN_REQUIRED`
  // the checksum only enters where the operation requires it, and none of ours does.
  requestChecksumCalculation: 'WHEN_REQUIRED',

  // Every call to the bucket has a ceiling of time (`_standards/backend.md` §5.3). The SDK
  // default is **no timeout** (`DEFAULT_REQUEST_TIMEOUT = 0` in `@smithy/node-http-handler`),
  // so a slow or hung bucket would hold the request and the connection pool until the process
  // fell over. The handler lives in the client config, and not in a `signal` per `send`,
  // because this one object is shared: FlyDrive (`metadata`, `discard`) takes no signal per
  // call, and the timeout must cover it too. A timeout rejects with `TimeoutError`, which the
  // services turn into `left(StorageFailure | MultipartFailure)`.
  // AWS SDK for JavaScript v3, supplemental-docs/CLIENTS.md, "Node.js `requestHandler`"
  // (`connectionTimeout`, `requestTimeout`); `_doc-lib/flydrive.md#services/s3` passes the same
  // config through to the `S3Client`. Not in `_doc-lib`: the SDK has no entry there.
  requestHandler: {
    connectionTimeout: CONNECTION_TIMEOUT,
    requestTimeout: REQUEST_TIMEOUT,
    // Without this the SDK only logs a warning when `requestTimeout` is exceeded
    // (`NodeHttpHandlerOptions.throwOnRequestTimeout`): the call would still hang.
    throwOnRequestTimeout: true,
  },
}

/**
 * For how long a read URL is valid.
 *
 * The disk is private, so there is no permanent address for an object: every
 * read comes out signed. Fifteen minutes covers the life of an open page without
 * leaving an address circulating - a copied link expires before serving whoever
 * should not see it.
 *
 * The cost is the cache: the URL changes on every read, and the CDN does not reuse it. On a
 * page with many images that weighs, and the way out, if it weighs, is to round the signing
 * date to the hour slice - the URL stays stable within the window and
 * becomes cacheable again, without changing the security model.
 *
 * **This value has a counterpart in the frontend, and nothing links the two.** The signed `url`
 * travels inside the response, so the client cache keeps it along with it: a query
 * with a `staleTime` above this deadline serves an avatar with an expired URL, and the failure
 * shows up as a broken image, with no error anywhere. Today the client ceiling
 * is five minutes (`profileQueryOptions`), with the global at one. Lowering this
 * TTL, or raising that one, requires touching both - and that is why the number is
 * written in both places instead of only here.
 */
export const URL_TTL = '15 mins'

const driveConfig = defineConfig({
  default: 'r2',

  services: {
    // `private`, and that is why there is no `cdnUrl`: with the private disk FlyDrive's `getUrl`
    // does not work, and every read is signed. Without this,
    // every object in the bucket is readable by whoever knows the address - including the
    // not yet confirmed upload and the file no row references.
    r2: services.s3({ ...clientConfig, bucket, visibility: 'private' }),
  },
})

export default driveConfig

declare module '@adonisjs/drive/types' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-empty-object-type -- declaration merging requires `interface`, which adds no members here
  export interface DriveDisks extends InferDriveDisks<typeof driveConfig> {}
}
