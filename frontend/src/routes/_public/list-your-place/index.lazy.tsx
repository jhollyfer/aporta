import * as React from 'react'
import { createLazyFileRoute } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'

import {
  EMPTY_LISTING_DRAFT,
  ClientListingDraftValidator,
  OwnerListingCreateValidator,
} from '@aporta/shared'
import type { OwnerListingCreate } from '@aporta/shared'

import { PillButton } from '#/components/common/pill-button'
import { Stepper } from '#/components/common/stepper'
import { useDraftStorage } from '#/hooks/use-draft-storage'
import { submitListingMutation } from '#/integrations/tanstack-query/mutations/listings'
import { m } from '#/paraglide/messages'

import {
  ContactStep,
  PhotosStep,
  PlaceStep,
  RulesStep,
  TypeStep,
  ValuesStep,
} from './-components/step-fields'
import { STEPS } from './-steps'

export const Route = createLazyFileRoute('/_public/list-your-place/')({
  component: RouteComponent,
})

/** Chave versionada: mudar a forma do rascunho é trocar o `v1`, e o antigo some sem migração. */
const DRAFT_KEY = 'aporta:listing-draft:v1'

/** Quanto esperar parado antes de gravar o rascunho: digitar não é gravar a cada tecla. */
const SAVE_DELAY_MS = 400

const TIPS: Record<string, () => ReadonlyArray<string>> = {
  photos: () => [
    m.tip_photo_facade(),
    m.tip_photo_bedroom(),
    m.tip_photo_bathroom(),
    m.tip_photo_kitchen(),
    m.tip_photo_light(),
  ],
  values: () => [m.tip_values_included(), m.tip_values_honest()],
}

/**
 * O cadastro do dono em etapas, com indicador de progresso e rascunho salvo no
 * aparelho. Cadastro longo numa tela só faz o dono desistir no meio, e o
 * rascunho faz quem sai para tirar foto voltar ao ponto em que estava.
 */
function RouteComponent(): React.JSX.Element {
  const [step, setStep] = React.useState(0)
  const [sent, setSent] = React.useState<string | null>(null)
  const draft = useDraftStorage(DRAFT_KEY, ClientListingDraftValidator)

  const form = useForm<OwnerListingCreate>({
    resolver: zodResolver(OwnerListingCreateValidator),
    defaultValues: EMPTY_LISTING_DRAFT,
    mode: 'onTouched',
  })

  const submit = useMutation(submitListingMutation)

  /* Restaura uma vez, quando o storage responde: `reset` troca os valores sem marcar campo como tocado. */
  React.useEffect(() => {
    if (draft.restored !== null) {
      form.reset({ ...EMPTY_LISTING_DRAFT, ...draft.restored })
    }
  }, [draft.restored, form])

  const values = useWatch({ control: form.control })

  React.useEffect(() => {
    if (!draft.ready) return
    const timer = setTimeout(() => {
      draft.save({ ...EMPTY_LISTING_DRAFT, ...values })
    }, SAVE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [values, draft])

  /** Valida só os campos da etapa atual: erro de etapa futura não bloqueia quem ainda não chegou lá. */
  async function validateStep(): Promise<boolean> {
    const spec = STEPS[step]
    if (spec === undefined || spec.fields.length === 0) return true
    return form.trigger([...spec.fields])
  }

  /**
   * O envio valida o formulário inteiro. Se alguma etapa anterior ficou
   * inválida (o dono voltou e apagou um campo), leva a pessoa até a primeira com
   * erro em vez de falhar calado no último passo.
   */
  function handleSubmit() {
    void form.handleSubmit(
      (data) => {
        submit.mutate(data, {
          onSuccess: (result) => {
            draft.clear()
            setSent(result.title)
          },
        })
      },
      (errors) => {
        const first = STEPS.findIndex((spec) =>
          spec.fields.some((field) => field in errors),
        )
        if (first >= 0) setStep(first)
      },
    )()
  }

  if (sent !== null) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-5 px-4 pt-12 pb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          {m.owner_sent_title()}
        </h1>
        <p className="text-lg text-ink-soft">
          {m.owner_sent_text({ title: sent })}
        </p>
        <div>
          <PillButton to="/" tone="moss" scale="lg">
            {m.not_found_home()}
          </PillButton>
        </div>
      </div>
    )
  }

  const tips = TIPS[STEPS[step]?.id ?? '']

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-4 pt-8">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-5xl">
          {m.owner_title()}
        </h1>
        <p className="text-lg text-ink-soft">{m.owner_lead()}</p>
      </header>

      <Stepper
        steps={STEPS.map((spec) => ({ id: spec.id, label: spec.label() }))}
        current={step}
        onCurrentChange={setStep}
      >
        <Stepper.Progress />
        <form
          noValidate
          onSubmit={(event) => event.preventDefault()}
          className="flex flex-col gap-6"
        >
          <Stepper.Step index={0}>
            <TypeStep control={form.control} />
          </Stepper.Step>
          <Stepper.Step index={1}>
            <PlaceStep control={form.control} />
          </Stepper.Step>
          <Stepper.Step index={2}>
            <ValuesStep control={form.control} />
          </Stepper.Step>
          <Stepper.Step index={3}>
            <PhotosStep />
          </Stepper.Step>
          <Stepper.Step index={4}>
            <RulesStep control={form.control} />
          </Stepper.Step>
          <Stepper.Step index={5}>
            <ContactStep control={form.control} />
          </Stepper.Step>
          {tips !== undefined && <Stepper.Tips items={tips()} />}
          <Stepper.Nav onBeforeNext={validateStep} onSubmit={handleSubmit} />
        </form>
      </Stepper>
    </div>
  )
}
