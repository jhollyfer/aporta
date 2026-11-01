import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { DateTime } from 'luxon'

import TerminalText from '#core/terminal-text'

/** How many hours a `PENDING` can stay up before being considered abandoned. */
const DEFAULT_HOURS = 24

/**
 * Deletes the uploads that started and never finished.
 *
 * The upload has three steps and the binary does not pass through here:
 * `POST /storages` writes the `PENDING` row and signs the URLs, the client uploads the
 * parts straight to the bucket, and `POST /storages/:id/complete` confirms. Whoever closes
 * the tab midway never reaches the third step, and nothing else returns to that row -
 * `DELETE` is the explicit cancellation, and nobody calls it for an already
 * forgotten upload.
 *
 * What remains is not just a dead row. The parts already sent live under the
 * `uploadId`, do not show up in the bucket object listing, and keep being
 * billed - it is garbage that only the multipart abort reaches. Without this sweep the
 * state machine never closes: `PENDING` is the only state from which one does not leave.
 *
 * It reuses `StorageFileDeleteUseCase` instead of repeating the abort here: deleting a
 * `PENDING` is exactly what `DELETE` already does, and two implementations of the
 * same thing means one gets left behind. The reference rule is no obstacle -
 * `allUploaded` refuses to attach what is not `UPLOADED`, so a `PENDING`
 * cannot be in use.
 *
 * There is no scheduler inside the application: this is a command, and whoever repeats it is the
 * environment (host cron, Kubernetes `CronJob`). Running on two replicas at the
 * same time is harmless - the second finds the row already deleted and counts it
 * as absent.
 */
export default class StoragesPrune extends BaseCommand {
  static override commandName = 'storages:prune'
  static override description =
    'Deletes the abandoned PENDING uploads and aborts the multipart of each one'

  static override options: CommandOptions = { startApp: true }

  @flags.number({
    description: `Minimum age, in hours, to treat a PENDING as abandoned (default: ${DEFAULT_HOURS})`,
  })
  declare hours: number

  @flags.boolean({
    description: 'Lists what would be deleted without deleting anything',
  })
  declare dryRun: boolean

  override async run() {
    const { default: StorageFileDeleteUseCase } =
      await import('#features/storage/files/delete/delete.use-case')
    const { default: StorageRepository } =
      await import('#repositories/storage/storage.repository')

    const hours = this.hours ?? DEFAULT_HOURS
    const cutoff = DateTime.now().minus({ hours })

    const storages = await this.app.container.make(StorageRepository)
    const abandoned = await storages.findAbandoned(cutoff.toJSDate())

    if (abandoned.length === 0) {
      this.logger.info(`No PENDING upload older than ${hours}h.`)
      return
    }

    if (this.dryRun) {
      for (const { storage, createdAt } of abandoned) {
        const { id, originalName } = storage.snapshot()

        // `originalName` is the client's `fileName`: it never reaches the terminal raw.
        this.logger.info(
          `${id} ${TerminalText.plain(originalName)} (${createdAt?.toISOString()})`,
        )
      }

      this.logger.info(
        `${abandoned.length} upload(s) would be deleted. Nothing was touched.`,
      )
      return
    }

    const useCase = await this.app.container.make(StorageFileDeleteUseCase)

    let removed = 0
    let failed = 0

    for (const { storage } of abandoned) {
      const { id } = storage.snapshot()

      // An error on one row does not bring down the batch: the bucket may refuse the abort
      // of an `uploadId` it no longer knows, and the next sweep would
      // never get past the first row if that interrupted it.
      try {
        const result = await useCase.execute({ id })

        if (result.isLeft()) {
          failed += 1
          this.logger.warning(`${id}: ${result.value.message}`)
          continue
        }

        // `DELETE` leaves the cancelled `PENDING` marked, so its repetition
        // answers the same. Old like this one, nobody repeats it anymore: it goes for good.
        await storages.delete(storage)

        removed += 1
      } catch (error) {
        failed += 1
        this.logger.warning(`${id}: ${this.messageOf(error)}`)
      }
    }

    this.logger.success(`${removed} upload(s) deleted, ${failed} failed.`)

    if (failed > 0) this.exitCode = 1
  }

  /**
   * The message of any error, for logging. `catch` hands over `unknown`, and
   * interpolating it directly into the template would come out `[object Object]` when it is not an
   * `Error`.
   */
  private messageOf(error: unknown): string {
    if (error instanceof Error) return error.message

    return String(error)
  }
}
