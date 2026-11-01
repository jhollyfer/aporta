import { z } from '../../validator.js'

/**
 * The entry that the frontend keeps in `localStorage` to resume an upload after a reload
 * (`frontend/src/lib/upload-resume.ts`). Not a request body: it is the validator of outside
 * data that the client keeps, under `validators/client/` (`architecture.md` §9), so what
 * lacks the expected shape is proven wrong instead of reaching the upload.
 *
 * `uploadId` is `null` on a single-part upload; `savedAt` is the write time in ms, which the
 * frontend compares with its own deadline.
 */
export const ClientUploadResumeValidator = z.object({
  storageId: z.string().min(1),
  uploadId: z.string().min(1).nullable(),
  partSize: z.number().int().positive(),
  savedAt: z.number().int().nonnegative(),
})

export type ClientUploadResume = z.infer<typeof ClientUploadResumeValidator>
