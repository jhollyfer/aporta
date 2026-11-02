import { m } from '#/paraglide/messages'
/**
 * The sending of a part to the signed URL.
 *
 * `XMLHttpRequest` and not `fetch`, which is what the rest of the app uses: `fetch` does not
 * emit **upload** progress. It resolves when the response arrives, and until then
 * there is no way to know how many bytes went out - a progress bar over `fetch`
 * can only jump from 0 to 100. For download there is `response.body` as a stream;
 * for upload, there is no equivalent with real browser support.
 *
 * The request does not go through `integrations/tanstack-query/http`'s `request()`
 * on purpose: the destination is the bucket, not the API. Sending the session cookie to
 * another origin would be leaking a credential, and the URL already carries its own
 * authorization in the signature.
 */

export type PutPartOptions = {
  onProgress?: (loaded: number, total: number) => void
  signal?: AbortSignal
  /** How many times to try in total, counting the first. */
  attempts?: number
  /** How long without any byte moving before giving up on the attempt, in ms. */
  stallTimeout?: number
}

/** Attempts per part. Three covers short flapping without insisting on a dead destination. */
const ATTEMPTS = 3

/**
 * Maximum silence tolerated within an attempt, in ms.
 *
 * It is the time with **no byte moving**, and not the request's total duration:
 * a 10 MiB part on a bad but alive link takes legitimate minutes, and a duration
 * ceiling would kill that upload instead of saving it. What matters is the connection
 * having stopped - and stopped is what the XHR `onerror` may take long to notice
 * when the other side simply vanishes.
 */
const STALL_TIMEOUT = 30_000

/** Wait before the first retry, in ms. It doubles on each one, with jitter. */
const BACKOFF = 500

/** What went wrong with a part's `PUT`, with the status the bucket returned. */
export class UploadPartError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'UploadPartError'
  }
}

/**
 * Whether it is worth sending again.
 *
 * Network down (`status: 0`), stalled connection (`408`) and a bucket-side error
 * (`5xx`) are transient - repeating is exactly what fixes them. `4xx` is not:
 * an expired or wrong signature does not get better with insistence, and whoever fixes
 * that is the next batch of `GET /storages/:id/parts`, which brings new URLs.
 */
function retriable(error: unknown): boolean {
  if (!(error instanceof UploadPartError)) return false

  return error.status === 0 || error.status === 408 || error.status >= 500
}

/** A wait that wakes up early if the upload is cancelled midway. */
function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException(m.upload_cancelled(), 'AbortError'))
      return
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)

    function onAbort() {
      clearTimeout(timer)
      reject(new DOMException(m.upload_cancelled(), 'AbortError'))
    }

    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

/** One attempt: opens the connection, sends the bytes, returns the `ETag`. */
function attempt(
  url: string,
  body: Blob,
  contentType: string,
  { onProgress, signal, stallTimeout = STALL_TIMEOUT }: PutPartOptions = {},
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException(m.upload_cancelled(), 'AbortError'))
      return
    }

    const request = new XMLHttpRequest()
    let stall: ReturnType<typeof setTimeout> | undefined

    function clearStall() {
      if (stall !== undefined) clearTimeout(stall)
      stall = undefined
    }

    // Rearmed on every byte that moves. If the silence passes the limit, the
    // attempt is abandoned as a network failure - and the retry envelope
    // decides whether to send again.
    function armStall() {
      clearStall()
      stall = setTimeout(() => {
        stalled = true
        request.abort()
      }, stallTimeout)
    }

    let stalled = false

    request.open('PUT', url, true)
    // The signed URL pins the `Content-Type` (`_standards/backend.md` §5.4): the bucket answers
    // `403` to any other value, and a `Blob` sliced from a file carries none of its own.
    request.setRequestHeader('Content-Type', contentType)

    request.upload.onprogress = (event) => {
      armStall()

      if (!event.lengthComputable) return
      onProgress?.(event.loaded, event.total)
    }

    request.onload = () => {
      clearStall()

      if (request.status < 200 || request.status >= 300) {
        reject(
          new UploadPartError(
            m.upload_part_rejected({ status: request.status }),
            request.status,
          ),
        )
        return
      }

      const etag = request.getResponseHeader('ETag')

      if (!etag) {
        reject(new UploadPartError(m.upload_part_no_etag(), request.status))
        return
      }

      resolve(etag)
    }

    request.onerror = () => {
      clearStall()
      reject(new UploadPartError(m.upload_part_network(), 0))
    }

    request.onabort = () => {
      clearStall()

      // The silence clock's `abort()` arrives here through the same path as the user's
      // cancellation. Only one of the two deserves a new attempt.
      if (stalled) {
        reject(new UploadPartError(m.upload_part_timeout(), 408))
        return
      }

      reject(new DOMException(m.upload_cancelled(), 'AbortError'))
    }

    signal?.addEventListener('abort', () => request.abort(), { once: true })

    armStall()

    request.send(body)
  })
}

/**
 * Sends a piece of the file and returns the `ETag` the bucket gave, insisting
 * when the failure is transient.
 *
 * The `ETag` is the only proof that the part arrived whole, and is what the
 * confirmation requires back. It is only readable if the bucket exposes `ETag` in
 * `Access-Control-Expose-Headers` - without that the browser hides the header and
 * no multipart upload can close.
 *
 * `contentType` is the exact value the URL was signed with: the file's mimetype for a
 * single-part upload, `MULTIPART_PART_CONTENT_TYPE` for a part of a multipart.
 *
 * The retry is what makes "resumable" hold for short flapping too.
 * Without it, the upload only survived what the user could fix by
 * hand: a ten-second drop brought down the in-flight part, marked the item as
 * an error and waited for a click.
 *
 * The whole part is resent, never what was missing from it - a part's `PUT`
 * is atomic on the bucket side, and half a part does not exist. What the resume
 * saves is the parts **already confirmed**, and whoever takes care of that is
 * `listParts`.
 */
export async function putPart(
  url: string,
  body: Blob,
  contentType: string,
  options: PutPartOptions = {},
): Promise<string> {
  const total = options.attempts ?? ATTEMPTS

  for (let round = 1; ; round += 1) {
    try {
      return await attempt(url, body, contentType, options)
    } catch (error) {
      if (round >= total) throw error
      if (!retriable(error)) throw error

      // The previous attempt left the byte counter where it stopped. Zeroing before
      // restarting keeps the bar from adding up what is about to be resent and exceeding
      // 100%.
      options.onProgress?.(0, body.size)

      // Jitter so that several parts brought down by the same drop do not all
      // come back at the same instant.
      await wait(
        BACKOFF * 2 ** (round - 1) * (1 + Math.random()),
        options.signal,
      )
    }
  }
}
