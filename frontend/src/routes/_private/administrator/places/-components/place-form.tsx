import * as React from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Controller, useForm, useWatch } from 'react-hook-form'
import type { UseFormReturn } from 'react-hook-form'

import {
  AdministratorPlaceWriteValidator,
  PLACE_CATEGORIES,
  PLACE_CATEGORY,
} from '@aporta/shared'
import type { AdministratorPlaceWritePayload } from '@aporta/shared'

import { ActionButton } from '#/components/common/action-button'
import { Field } from '#/components/common/field'
import { FormNotice } from '#/components/common/form-notice'
import { PillButton } from '#/components/common/pill-button'
import { Input } from '#/components/ui/input'
import { NativeSelect, NativeSelectOption } from '#/components/ui/native-select'
import { Textarea } from '#/components/ui/textarea'
import { useNeighborhoods } from '#/hooks/use-neighborhoods'
import { useInvalidate } from '#/integrations/tanstack-query/invalidate'
import {
  useAdministratorPlaceCreateMutation,
  useAdministratorPlaceUpdateMutation,
} from '#/integrations/tanstack-query/mutations/administrator'
import { administratorPlaceQueryOptions } from '#/integrations/tanstack-query/queries/administrator'
import { applyHTTPErrorToForm } from '#/lib/form-errors'
import { invalidProps } from '#/lib/form-a11y'
import { PLACE_CATEGORY_LABELS } from '#/lib/labels'
import { describePlaceFailure } from '#/lib/place-failure'
import {
  EMPTY_PLACE_FORM,
  PLACE_FORM_FIELDS,
  placeToForm,
  toPlacePayload,
} from '#/lib/place-form'
import { m } from '#/paraglide/messages'

type Values = AdministratorPlaceWritePayload

type ShellProps = {
  title: string
  defaultValues: Partial<Values>
  submitLabel: string
  pending: boolean
  /** Um aviso acima do formulário (o lugar está arquivado). */
  notice?: string
  /** Mensagem de sucesso que a tela mostra depois de salvar. */
  saved?: string
  onSubmit: (payload: Values, form: UseFormReturn<Values>) => void
}

/** Só dígitos: o teclado numérico do celular aparece com `inputMode`, e colar "(97) 9999" não entra como texto. */
function digits(raw: string): string {
  return raw.replace(/\D/g, '')
}

/**
 * O formulário do lugar, igual para cadastrar e editar. Valida com o validator do `shared/`, o
 * mesmo que a API usa (par VineJS), então tela e API não discordam do que é um lugar válido.
 * O dia só aparece na aba Eventos: só o evento tem dia, e a API recusa o dia em outra aba. A
 * regra "evento exige o dia" é da entidade; a tela a repete antes de enviar só para não gastar
 * uma ida ao servidor, e o `422` dele continua apontando para o campo.
 */
function PlaceFormShell({
  title,
  defaultValues,
  submitLabel,
  pending,
  notice,
  saved,
  onSubmit,
}: ShellProps): React.JSX.Element {
  const neighborhoods = useNeighborhoods()
  const form = useForm<Values>({
    resolver: zodResolver(AdministratorPlaceWriteValidator),
    defaultValues,
    mode: 'onTouched',
  })
  const category = useWatch({ control: form.control, name: 'category' })

  function submit(values: Values): void {
    form.clearErrors('root')

    if (values.category === PLACE_CATEGORY.EVENT && !values.date) {
      form.setError('date', {
        type: 'client',
        message: m.place_error_event_date_required(),
      })
      return
    }

    onSubmit(toPlacePayload(values), form)
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-3">
        <PillButton
          to="/administrator/places"
          tone="link"
          className="self-start"
        >
          {m.staff_place_back()}
        </PillButton>
        <h1 className="text-title font-extrabold tracking-tight break-words text-ink">
          {title}
        </h1>
        {notice !== undefined && (
          <p className="rounded-xl bg-clay-wash px-4 py-3 text-sm font-bold text-ink">
            {notice}
          </p>
        )}
      </header>

      <form
        noValidate
        onSubmit={form.handleSubmit(submit)}
        className="flex flex-col gap-5 rounded-card bg-surface p-5 sm:p-8"
      >
        <Controller
          control={form.control}
          name="category"
          render={({ field, fieldState }) => (
            <Field
              label={m.field_place_category()}
              htmlFor="category"
              error={fieldState.error?.message}
            >
              <NativeSelect
                id="category"
                {...field}
                {...invalidProps(fieldState.invalid, 'category')}
              >
                {PLACE_CATEGORIES.map((value) => (
                  <NativeSelectOption key={value} value={value}>
                    {PLACE_CATEGORY_LABELS[value]()}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <Field
              label={m.field_place_name()}
              htmlFor="name"
              error={fieldState.error?.message}
            >
              <Input
                id="name"
                type="text"
                maxLength={80}
                {...field}
                {...invalidProps(fieldState.invalid, 'name')}
              />
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="description"
          render={({ field, fieldState }) => (
            <Field
              label={m.field_description()}
              htmlFor="description"
              error={fieldState.error?.message}
            >
              <Textarea
                id="description"
                rows={4}
                maxLength={600}
                {...field}
                {...invalidProps(fieldState.invalid, 'description')}
              />
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="neighborhood"
          render={({ field, fieldState }) => (
            <Field
              label={m.field_neighborhood()}
              htmlFor="neighborhood"
              error={fieldState.error?.message}
            >
              <NativeSelect
                id="neighborhood"
                {...field}
                {...invalidProps(fieldState.invalid, 'neighborhood')}
              >
                <NativeSelectOption value="">
                  {m.field_select()}
                </NativeSelectOption>
                {neighborhoods.map((item) => (
                  <NativeSelectOption key={item.slug} value={item.slug}>
                    {item.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="address"
          render={({ field, fieldState }) => (
            <Field
              label={m.field_address()}
              htmlFor="address"
              error={fieldState.error?.message}
            >
              <Input
                id="address"
                type="text"
                maxLength={120}
                {...field}
                {...invalidProps(fieldState.invalid, 'address')}
              />
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="hours"
          render={({ field, fieldState }) => (
            <Field
              label={m.field_place_hours()}
              hint={m.field_place_hours_hint()}
              htmlFor="hours"
              error={fieldState.error?.message}
            >
              <Input
                id="hours"
                type="text"
                maxLength={80}
                {...field}
                {...invalidProps(fieldState.invalid, 'hours')}
              />
            </Field>
          )}
        />
        {category === PLACE_CATEGORY.EVENT && (
          <Controller
            control={form.control}
            name="date"
            render={({ field, fieldState }) => (
              <Field
                label={m.field_place_date()}
                hint={m.field_place_date_hint()}
                htmlFor="date"
                error={fieldState.error?.message}
              >
                <Input
                  id="date"
                  type="date"
                  {...field}
                  value={field.value ?? ''}
                  {...invalidProps(fieldState.invalid, 'date')}
                />
              </Field>
            )}
          />
        )}
        <Controller
          control={form.control}
          name="whatsapp"
          render={({ field, fieldState }) => (
            <Field
              label={m.field_whatsapp()}
              hint={m.field_place_whatsapp_hint()}
              htmlFor="whatsapp"
              error={fieldState.error?.message}
            >
              <Input
                id="whatsapp"
                type="tel"
                inputMode="tel"
                autoComplete="off"
                {...field}
                value={field.value ?? ''}
                onChange={(event) => field.onChange(digits(event.target.value))}
                {...invalidProps(fieldState.invalid, 'whatsapp')}
              />
            </Field>
          )}
        />
        <FormNotice>{form.formState.errors.root?.message}</FormNotice>
        {saved !== undefined && (
          <p
            role="status"
            className="rounded-xl bg-moss-wash px-4 py-3 text-sm font-bold text-moss-deep"
          >
            {saved}
          </p>
        )}
        <ActionButton
          type="submit"
          scale="lg"
          pending={pending}
          className="w-full sm:w-auto sm:self-start"
        >
          {submitLabel}
        </ActionButton>
      </form>
    </div>
  )
}

/** Cadastrar: ao salvar, volta para a lista do guia, onde o lugar novo já aparece. */
export function PlaceCreateForm(): React.JSX.Element {
  const invalidate = useInvalidate()
  const navigate = useNavigate()
  const create = useAdministratorPlaceCreateMutation()

  function onSubmit(payload: Values, form: UseFormReturn<Values>): void {
    create.mutate(payload, {
      async onSuccess() {
        await Promise.all([
          invalidate('administrator.places'),
          invalidate('storefront.places'),
        ])
        await navigate({ to: '/administrator/places' })
      },
      onError: (error) =>
        applyHTTPErrorToForm(
          form,
          PLACE_FORM_FIELDS,
          describePlaceFailure(error),
        ),
    })
  }

  return (
    <PlaceFormShell
      title={m.staff_place_new_title()}
      defaultValues={EMPTY_PLACE_FORM}
      submitLabel={m.staff_place_save_new()}
      pending={create.isPending}
      onSubmit={onSubmit}
    />
  )
}

/**
 * Editar: fica na tela e diz que salvou. Vale também para o lugar arquivado, que continua
 * arquivado (restaurar é da lista), e a tela avisa disso.
 */
export function PlaceEditForm({ id }: { id: string }): React.JSX.Element {
  const { data: place } = useSuspenseQuery(administratorPlaceQueryOptions(id))
  const invalidate = useInvalidate()
  const [saved, setSaved] = React.useState(false)
  const update = useAdministratorPlaceUpdateMutation()

  function onSubmit(payload: Values, form: UseFormReturn<Values>): void {
    setSaved(false)
    update.mutate(
      { id, ...payload },
      {
        async onSuccess(updated) {
          // O formulário passa a valer o que o servidor guardou (o `trim` do texto, por
          // exemplo), senão "alterado" continuaria verdadeiro logo depois de salvar.
          form.reset(placeToForm(updated))
          await Promise.all([
            invalidate('administrator.places'),
            invalidate('storefront.places'),
          ])
          setSaved(true)
        },
        onError: (error) =>
          applyHTTPErrorToForm(
            form,
            PLACE_FORM_FIELDS,
            describePlaceFailure(error),
          ),
      },
    )
  }

  let notice: string | undefined
  if (place.archivedAt !== null) notice = m.staff_place_archived_note()

  let message: string | undefined
  if (saved) message = m.staff_place_saved()

  return (
    <PlaceFormShell
      title={m.staff_place_edit_title()}
      defaultValues={placeToForm(place)}
      submitLabel={m.staff_place_save_edit()}
      pending={update.isPending}
      notice={notice}
      saved={message}
      onSubmit={onSubmit}
    />
  )
}
