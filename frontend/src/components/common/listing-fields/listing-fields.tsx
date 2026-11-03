import * as React from 'react'
import { Controller } from 'react-hook-form'
import type { Control } from 'react-hook-form'

import { LISTING_PERIODS, LISTING_TYPES } from '@aporta/shared'
import type { OwnerListingCreate, ListingPeriod } from '@aporta/shared'

import { NativeSelect, NativeSelectOption } from '#/components/ui/native-select'
import { Textarea } from '#/components/ui/textarea'
import { Input } from '#/components/ui/input'
import { Field } from '#/components/common/field'
import { invalidProps } from '#/lib/form-a11y'
import { useNeighborhoods } from '#/hooks/use-neighborhoods'
import { LISTING_PERIOD_LABELS, LISTING_TYPE_LABELS } from '#/lib/labels'
import { m } from '#/paraglide/messages'

type StepProps = { control: Control<OwnerListingCreate> }

/** Só dígitos: o teclado numérico do celular aparece com `inputMode`, e colar "R$ 900,00" não entra como texto. */
function digits(raw: string): string {
  return raw.replace(/\D/g, '')
}

/**
 * O valor numérico do campo: vazio é `undefined` (campo ausente) e o resto é número.
 *
 * O validator do `shared/` espera `number`, e guardar o texto digitado ("900") fazia o
 * formulário acusar "Informe um número válido" ao sair do campo. A linha de erro entrava acima
 * dos checkboxes dos períodos e os empurrava entre o `mousedown` e o `mouseup`, e o clique se
 * perdia: o dono via o checkbox "não pegar".
 */
function toNumber(raw: string): number | undefined {
  const text = digits(raw)
  if (text === '') return undefined
  return Number(text)
}

export function TypeStep({ control }: StepProps): React.JSX.Element {
  return (
    <>
      <Controller
        control={control}
        name="type"
        render={({ field, fieldState }) => (
          <Field
            label={m.field_type()}
            htmlFor="type"
            error={fieldState.error?.message}
          >
            <NativeSelect
              id="type"
              {...field}
              {...invalidProps(fieldState.invalid, 'type')}
            >
              <NativeSelectOption value="">
                {m.field_select()}
              </NativeSelectOption>
              {LISTING_TYPES.map((value) => (
                <NativeSelectOption key={value} value={value}>
                  {LISTING_TYPE_LABELS[value]()}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        )}
      />
      <Controller
        control={control}
        name="furnished"
        render={({ field }) => (
          <label className="flex min-h-11 items-center gap-3 text-base font-bold text-ink">
            <input
              type="checkbox"
              checked={field.value}
              onChange={(event) => field.onChange(event.target.checked)}
              className="size-6 accent-[var(--moss)]"
            />
            {m.field_furnished()}
          </label>
        )}
      />
    </>
  )
}

export function PlaceStep({ control }: StepProps): React.JSX.Element {
  const neighborhoods = useNeighborhoods()

  return (
    <>
      <Controller
        control={control}
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
        control={control}
        name="address"
        render={({ field, fieldState }) => (
          <Field
            label={m.field_address()}
            hint={m.field_address_hint()}
            htmlFor="address"
            error={fieldState.error?.message}
          >
            <Input
              id="address"
              type="text"
              autoComplete="street-address"
              {...field}
              {...invalidProps(fieldState.invalid, 'address')}
            />
          </Field>
        )}
      />
    </>
  )
}

function NumberInput({
  control,
  name,
  label,
  hint,
}: StepProps & {
  name: 'monthly' | 'daily' | 'minimumStayMonths' | 'bedrooms' | 'bathrooms'
  label: string
  hint?: string
}): React.JSX.Element {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field
          label={label}
          hint={hint}
          htmlFor={name}
          error={fieldState.error?.message}
        >
          <Input
            id={name}
            type="text"
            inputMode="numeric"
            {...field}
            value={field.value ?? ''}
            onChange={(event) => field.onChange(toNumber(event.target.value))}
            {...invalidProps(fieldState.invalid, name)}
          />
        </Field>
      )}
    />
  )
}

function togglePeriod(
  current: ReadonlyArray<ListingPeriod>,
  period: ListingPeriod,
): Array<ListingPeriod> {
  if (current.includes(period)) return current.filter((p) => p !== period)
  return [...current, period]
}

const COST_LABELS: Record<'water' | 'electricity' | 'internet', () => string> =
  {
    water: () => m.cost_water_label(),
    electricity: () => m.cost_electricity_label(),
    internet: () => m.cost_internet_label(),
  }

export function ValuesStep({ control }: StepProps): React.JSX.Element {
  return (
    <>
      <NumberInput
        control={control}
        name="monthly"
        label={m.field_monthly()}
        hint={m.field_monthly_hint()}
      />
      <NumberInput
        control={control}
        name="daily"
        label={m.field_daily()}
        hint={m.field_daily_hint()}
      />
      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-bold text-ink">
          {m.field_included()}
        </legend>
        {(['water', 'electricity', 'internet'] as const).map((name) => (
          <Controller
            key={name}
            control={control}
            name={name}
            render={({ field }) => (
              <label className="flex min-h-11 items-center gap-3 text-base text-ink">
                <input
                  type="checkbox"
                  checked={field.value}
                  onChange={(event) => field.onChange(event.target.checked)}
                  className="size-6 accent-[var(--moss)]"
                />
                {COST_LABELS[name]()}
              </label>
            )}
          />
        ))}
      </fieldset>
      <Controller
        control={control}
        name="periods"
        render={({ field, fieldState }) => (
          <fieldset className="flex flex-col gap-3">
            <legend className="text-sm font-bold text-ink">
              {m.field_periods()}
            </legend>
            {LISTING_PERIODS.map((period) => (
              <label
                key={period}
                className="flex min-h-11 items-center gap-3 text-base text-ink"
              >
                <input
                  type="checkbox"
                  checked={field.value.includes(period)}
                  onChange={() =>
                    field.onChange(togglePeriod(field.value, period))
                  }
                  className="size-6 accent-[var(--moss)]"
                />
                {LISTING_PERIOD_LABELS[period]()}
              </label>
            ))}
            {fieldState.error !== undefined && (
              <p role="alert" className="text-sm font-bold text-danger">
                {fieldState.error.message}
              </p>
            )}
          </fieldset>
        )}
      />
      <NumberInput
        control={control}
        name="minimumStayMonths"
        label={m.field_minimum()}
        hint={m.field_minimum_hint()}
      />
    </>
  )
}

export function RulesStep({ control }: StepProps): React.JSX.Element {
  return (
    <>
      <Controller
        control={control}
        name="title"
        render={({ field, fieldState }) => (
          <Field
            label={m.field_title()}
            htmlFor="title"
            error={fieldState.error?.message}
          >
            <Input
              id="title"
              type="text"
              {...field}
              {...invalidProps(fieldState.invalid, 'title')}
            />
          </Field>
        )}
      />
      <Controller
        control={control}
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
              {...field}
              {...invalidProps(fieldState.invalid, 'description')}
            />
          </Field>
        )}
      />
      <Controller
        control={control}
        name="rules"
        render={({ field, fieldState }) => (
          <Field
            label={m.field_rules()}
            hint={m.field_rules_hint()}
            htmlFor="rules"
            error={fieldState.error?.message}
          >
            <Textarea
              id="rules"
              rows={4}
              {...field}
              {...invalidProps(fieldState.invalid, 'rules')}
            />
          </Field>
        )}
      />
    </>
  )
}

export function ContactStep({ control }: StepProps): React.JSX.Element {
  return (
    <>
      <Controller
        control={control}
        name="ownerName"
        render={({ field, fieldState }) => (
          <Field
            label={m.field_owner_name()}
            htmlFor="ownerName"
            error={fieldState.error?.message}
          >
            <Input
              id="ownerName"
              type="text"
              autoComplete="name"
              {...field}
              {...invalidProps(fieldState.invalid, 'ownerName')}
            />
          </Field>
        )}
      />
      <Controller
        control={control}
        name="whatsapp"
        render={({ field, fieldState }) => (
          <Field
            label={m.field_whatsapp()}
            hint={m.field_whatsapp_hint()}
            htmlFor="whatsapp"
            error={fieldState.error?.message}
          >
            <Input
              id="whatsapp"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              {...field}
              onChange={(event) => field.onChange(digits(event.target.value))}
              {...invalidProps(fieldState.invalid, 'whatsapp')}
            />
          </Field>
        )}
      />
    </>
  )
}

/**
 * Quartos e banheiros: só a edição pede. O cadastro em etapas não os tem (o servidor
 * assume um de cada), e o dono corrige aqui o que for diferente.
 */
export function RoomsFields({ control }: StepProps): React.JSX.Element {
  return (
    <>
      <NumberInput
        control={control}
        name="bedrooms"
        label={m.field_bedrooms()}
      />
      <NumberInput
        control={control}
        name="bathrooms"
        label={m.field_bathrooms()}
      />
    </>
  )
}
