import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { USER_ROLE, z } from '@aporta/shared'

import TerminalText from '#core/terminal-text'
import { errors } from '#core/validator'
import type { StaffRole } from '#features/administrator/staff/create/create.use-case'

/** What `--role` accepts. A lookup and not a chain of `if`: a third staff role is one line. */
const STAFF_ROLES = {
  ADMINISTRATOR: USER_ROLE.ADMINISTRATOR,
  MODERATOR: USER_ROLE.MODERATOR,
} as const satisfies Record<string, StaffRole>

/**
 * Creates a staff account: the way to get the first administrator of a production database.
 *
 * The seeder does not run in production (it would leave a known credential with administrator
 * power), and no endpoint creates an account with power without a session, so a new environment
 * has nowhere to start. This command is the path: run by whoever operates, in the container's
 * terminal, once.
 *
 * Where each input comes from, so a secret never has to sit in the shell history or in `ps`:
 * `--email` and `--name` are flags (or a prompt); the password has **no flag and no environment
 * variable**: it always comes from a hidden prompt, asked twice. There is no default for any of
 * them, and the password is never printed, not even on failure. The catalog of environment keys
 * has no `STAFF_*` (`_standards/backend.md` §6.2, `DECISIONS.md` #271), so this command reads none.
 *
 * It reuses the sign-up validator, so the password policy is the project's single one, and the
 * `AdministratorStaffCreateUseCase`, so the Lucid model is not touched from here. An email that
 * already exists - live or archived - is refused: promoting an account is a different act.
 */
export default class StaffCreate extends BaseCommand {
  static override commandName = 'staff:create'
  static override description =
    'Creates an ADMINISTRATOR or MODERATOR account (the first administrator of a production database)'

  static override options: CommandOptions = { startApp: true }

  @flags.string({
    description: 'Email of the new account (asked if missing)',
  })
  declare email: string

  @flags.string({
    description: 'Name of the new account (asked if missing)',
  })
  declare name: string

  @flags.string({
    description: 'ADMINISTRATOR (default) or MODERATOR',
  })
  declare role: string

  override async run() {
    const role = this.roleOf()

    if (!role) {
      this.logger.error(
        `Unknown role. Use one of: ${Object.keys(STAFF_ROLES).join(', ')}.`,
      )
      this.exitCode = 1
      return
    }

    const email = this.filled(this.email) ?? (await this.askEmail())
    const name = this.filled(this.name) ?? (await this.askName())
    const password = await this.askPassword()

    if (!password) {
      this.logger.error('A password is required.')
      this.exitCode = 1
      return
    }

    const payload = await this.validated({ name, email, password })

    if (!payload) return

    const { default: AdministratorStaffCreateUseCase } =
      await import('#features/administrator/staff/create/create.use-case')

    const useCase = await this.app.container.make(
      AdministratorStaffCreateUseCase,
    )
    const result = await useCase.execute({ ...payload, role })

    if (result.isLeft()) {
      this.logger.error(result.value.message)
      this.exitCode = 1
      return
    }

    this.logger.success(
      `${result.value.role} created: ${result.value.id} ${TerminalText.plain(result.value.email)}`,
    )
  }

  /** The flag value, unless blank: `--email=` counts as missing, so the command asks instead of trying an empty account. */
  private filled(value: string | undefined): string | undefined {
    if (value === undefined || value.trim() === '') return undefined

    return value
  }

  private roleOf(): StaffRole | undefined {
    const requested = (this.role ?? USER_ROLE.ADMINISTRATOR).toUpperCase()

    return Object.entries(STAFF_ROLES).find(([key]) => key === requested)?.[1]
  }

  /**
   * The sign-up validator, with the confirmation the operator already gave (the prompt asks it
   * twice and refuses a mismatch). It prints the rule that failed, never
   * the value: a rejected password would otherwise end up in the terminal scrollback.
   */
  private async validated(input: {
    name: string
    email: string
    password: string
  }) {
    const { AuthenticationSessionSignUpValidator } =
      await import('#validators/authentication/session.validator')

    try {
      return await AuthenticationSessionSignUpValidator.validate({
        ...input,
        passwordConfirmation: input.password,
      })
    } catch (error) {
      if (!(error instanceof errors.E_VALIDATION_ERROR)) throw error

      // `messages` is `any` in VineJS; the handler depends on this same `{ field, message }` shape.
      const issues = z
        .array(z.object({ field: z.string(), message: z.string() }))
        .parse(error.messages)

      for (const issue of issues) {
        this.logger.error(
          `${issue.field}: ${TerminalText.plain(issue.message)}`,
        )
      }

      this.exitCode = 1
      return undefined
    }
  }

  private askEmail(): Promise<string> {
    return this.prompt.ask('Email of the new account')
  }

  private askName(): Promise<string> {
    return this.prompt.ask('Name of the new account')
  }

  /** Hidden, and twice: a typo in the only administrator's password would lock everyone out. */
  private async askPassword(): Promise<string | undefined> {
    const password = await this.prompt.secure('Password')
    const again = await this.prompt.secure('Repeat the password')

    if (password !== again) {
      this.logger.error('The passwords do not match.')
      return undefined
    }

    return password
  }
}
