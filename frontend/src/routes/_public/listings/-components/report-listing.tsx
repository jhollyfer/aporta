import * as React from 'react'
import { CheckCircle, Flag } from '@phosphor-icons/react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'

import { REPORT_REASONS, StorefrontReportCreateValidator } from '@aporta/shared'

import { ActionButton } from '#/components/common/action-button'
import { Field } from '#/components/common/field'
import { invalidProps } from '#/lib/form-a11y'
import { FormNotice } from '#/components/common/form-notice'
import { ModalDialog } from '#/components/common/modal-dialog'
import { useStorefrontReportCreateMutation } from '#/integrations/tanstack-query/mutations/storefront-reports'
import { cn } from '#/lib/cn'
import { REPORT_REASON_LABELS } from '#/lib/labels'
import { describeReportFailure } from '#/lib/report-failure'
import { m } from '#/paraglide/messages'

import type { z } from '@aporta/shared'

/** O que o visitante preenche: o `slug` vem da página, não do formulário. */
const ReportFormValidator = StorefrontReportCreateValidator.omit({ slug: true })

type ReportForm = z.input<typeof ReportFormValidator>

const DETAILS_MAX = 500

const DEFAULTS = { details: '', website: '' } satisfies Partial<ReportForm>

type ReportListingProps = { slug: string; title: string }

/**
 * "Denunciar este anúncio": uma saída discreta no fim da página, não um botão ao lado do
 * WhatsApp. Quem quase caiu num golpe precisa achá-la; quem só está vendo imóvel não
 * precisa tropeçar nela. Funciona **sem conta** (o visitante não tem uma), e o freio é o
 * limite por IP da API, cuja espera o 429 informa.
 *
 * O campo `website` é a armadilha de robô (honeypot): fica fora da tela, escondido da
 * leitura por voz e fora da ordem do Tab, então uma pessoa nunca o preenche e um robô que
 * preenche todo campo se entrega. A API responde a ele como se fosse sucesso, e a tela
 * também: o robô não aprende que foi pego.
 *
 * Depois do envio o diálogo troca o formulário pelo agradecimento, que diz o que acontece
 * a seguir (a equipe olha) sem prometer prazo nem resposta.
 */
export function ReportListing({
  slug,
  title,
}: ReportListingProps): React.JSX.Element {
  const [sent, setSent] = React.useState(false)
  const form = useForm<ReportForm>({
    resolver: zodResolver(ReportFormValidator),
    defaultValues: DEFAULTS,
    mode: 'onTouched',
  })
  const send = useStorefrontReportCreateMutation()
  const detailsLength = form.watch('details')?.length ?? 0

  function reset(): void {
    form.reset(DEFAULTS)
    send.reset()
    setSent(false)
  }

  function submit(values: ReportForm): void {
    form.clearErrors('root')
    send.mutate(
      {
        slug,
        reason: values.reason,
        details: values.details,
        // Só vai quando preenchido: o robô se entrega, a pessoa não manda o campo.
        website: values.website,
      },
      {
        onSuccess: () => setSent(true),
        onError: (error) => {
          const described = describeReportFailure(error)

          if (described.details !== undefined) {
            form.setError('details', {
              type: 'server',
              message: described.details,
            })
          }
          if (described.general !== '') {
            form.setError('root', {
              type: 'server',
              message: described.general,
            })
          }
        },
      },
    )
  }

  return (
    <ModalDialog
      title={m.report_title()}
      description={m.report_text({ title })}
      pending={send.isPending}
      onClose={reset}
      renderTrigger={(open) => (
        <button
          type="button"
          onClick={() => {
            reset()
            open()
          }}
          className="inline-flex min-h-11 items-center gap-2 self-start rounded-full px-3 text-sm font-bold text-ink-soft underline underline-offset-4 hover:bg-moss-wash hover:text-ink"
        >
          <Flag aria-hidden weight="bold" className="size-4" />
          {m.report_open()}
        </button>
      )}
    >
      {(close) => (
        <>
          {sent && (
            <div role="status" className="flex flex-col gap-4">
              <p className="inline-flex items-center gap-2 text-base font-extrabold text-moss-deep">
                <CheckCircle aria-hidden weight="fill" className="size-6" />
                {m.report_thanks_title()}
              </p>
              <p className="text-base text-ink-soft">
                {m.report_thanks_text()}
              </p>
              <ActionButton
                tone="outline"
                onClick={close}
                className="self-start"
              >
                {m.report_close()}
              </ActionButton>
            </div>
          )}

          {!sent && (
            <form
              noValidate
              method="post"
              onSubmit={form.handleSubmit(submit)}
              className="relative flex flex-col gap-5"
            >
              <Controller
                control={form.control}
                name="reason"
                render={({ field, fieldState }) => (
                  <fieldset
                    aria-describedby={
                      (fieldState.invalid && 'reason-error') || undefined
                    }
                    className="flex min-w-0 flex-col gap-1.5"
                  >
                    <legend className="mb-1.5 text-sm font-bold text-ink">
                      {m.report_reason_label()}
                    </legend>
                    {REPORT_REASONS.map((reason) => (
                      <label
                        key={reason}
                        className={cn(
                          'flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-4 py-2 text-base text-ink',
                          field.value === reason && 'border-moss bg-moss-wash',
                          field.value !== reason && 'border-line bg-surface',
                        )}
                      >
                        <input
                          type="radio"
                          name={field.name}
                          value={reason}
                          checked={field.value === reason}
                          onChange={() => field.onChange(reason)}
                          onBlur={field.onBlur}
                          className="size-5 shrink-0 accent-moss"
                        />
                        {REPORT_REASON_LABELS[reason]()}
                      </label>
                    ))}
                    {fieldState.invalid && (
                      <p
                        id="reason-error"
                        role="alert"
                        className="text-sm font-bold text-danger"
                      >
                        {m.report_reason_required()}
                      </p>
                    )}
                  </fieldset>
                )}
              />

              <Controller
                control={form.control}
                name="details"
                render={({ field, fieldState }) => (
                  <Field
                    label={m.report_details_label()}
                    hint={m.report_details_hint()}
                    htmlFor="details"
                    error={fieldState.error?.message}
                  >
                    <textarea
                      id="details"
                      rows={3}
                      {...field}
                      value={field.value ?? ''}
                      {...invalidProps(fieldState.invalid, 'details')}
                      aria-describedby={[
                        'details-hint',
                        fieldState.invalid && 'details-error',
                      ]
                        .filter((id) => typeof id === 'string')
                        .join(' ')}
                      className="w-full rounded-xl border border-line bg-surface p-4 text-base text-ink"
                    />
                    <p
                      className={cn(
                        'self-end text-xs font-bold text-ink-soft',
                        detailsLength > DETAILS_MAX && 'text-danger',
                      )}
                    >
                      {m.note_counter({
                        count: detailsLength,
                        max: DETAILS_MAX,
                      })}
                    </p>
                  </Field>
                )}
              />

              {/* A armadilha: fora da tela, fora da leitura por voz e fora do Tab. */}
              <div
                aria-hidden
                className="pointer-events-none absolute -left-[9999px] size-px overflow-hidden"
              >
                <Controller
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <>
                      <label htmlFor="website">
                        {m.report_honeypot_label()}
                      </label>
                      <input
                        id="website"
                        type="text"
                        tabIndex={-1}
                        autoComplete="off"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </>
                  )}
                />
              </div>

              <FormNotice>{form.formState.errors.root?.message}</FormNotice>
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={close}
                  disabled={send.isPending}
                  className="h-12 rounded-full border-2 border-ink px-6 text-sm font-extrabold text-ink hover:bg-ink hover:text-paper disabled:opacity-60"
                >
                  {m.note_cancel()}
                </button>
                <ActionButton
                  type="submit"
                  className="h-12"
                  pending={send.isPending}
                >
                  {m.report_submit()}
                </ActionButton>
              </div>
            </form>
          )}
        </>
      )}
    </ModalDialog>
  )
}
