import * as React from 'react'
import { createLazyFileRoute, useRouter } from '@tanstack/react-router'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'

import {
  EMPTY_LISTING_DRAFT,
  ClientListingDraftValidator,
  LISTING_PHOTOS_MAX,
  OwnerListingCreateValidator,
} from '@aporta/shared'
import type {
  OwnerListingCreate,
  OwnerListingShowResponse,
} from '@aporta/shared'

import { FormNotice } from '#/components/common/form-notice'
import {
  ContactStep,
  PlaceStep,
  RulesStep,
  TypeStep,
  ValuesStep,
} from '#/components/common/listing-fields'
import { Stepper } from '#/components/common/stepper'
import { useDraftStorage } from '#/hooks/use-draft-storage'
import { usePhotoDrafts } from '#/hooks/use-photo-drafts'
import { useSendPhotos } from '#/hooks/use-send-photos'
import { HTTPError } from '#/integrations/tanstack-query/http'
import { useInvalidate } from '#/integrations/tanstack-query/invalidate'
import { useOwnerListingCreateMutation } from '#/integrations/tanstack-query/mutations/owner-listings'
import { applyHTTPErrorToForm } from '#/lib/form-errors'
import { describeOwnerFailure } from '#/lib/owner-failure'
import { readSession } from '#/lib/read-session'
import { m } from '#/paraglide/messages'

import { ListingSubmitted } from './-components/listing-submitted'
import { PhotosPending } from './-components/photos-pending'
import { PhotosStep } from './-components/photos-step'
import { STEPS } from './-steps'

export const Route = createLazyFileRoute('/_public/list-your-place/')({
  component: RouteComponent,
})

/** Chave versionada: mudar a forma do rascunho é trocar o `v1`, e o antigo some sem migração. */
const DRAFT_KEY = 'aporta:listing-draft:v1'

/** Quanto esperar parado antes de gravar o rascunho: digitar não é gravar a cada tecla. */
const SAVE_DELAY_MS = 400

/** Os campos que a API pode acusar: as chaves do `OwnerListingCreate` que as etapas validam. */
const FIELDS = STEPS.flatMap((spec) => spec.fields)

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
 *
 * O último passo **envia de verdade** e exige sessão. Sem ela, o rascunho é gravado e a
 * pessoa vai à entrada com `?redirect=/list-your-place`: ao voltar, o formulário já está
 * como ela deixou. Com sessão, a ordem é: cria o anúncio (nasce `PENDING`, em análise),
 * apaga o rascunho (o anúncio já existe no servidor; guardá-lo faria um F5 criar outro),
 * sobe as fotos e as liga. Falha nas fotos não refaz o anúncio: a tela passa a só repetir
 * as fotos (`PhotosPending`).
 */
function RouteComponent(): React.JSX.Element {
  const router = useRouter()
  const queryClient = useQueryClient()
  const invalidate = useInvalidate()
  const [step, setStep] = React.useState(0)
  const [created, setCreated] = React.useState<OwnerListingShowResponse | null>(
    null,
  )
  const [done, setDone] = React.useState<OwnerListingShowResponse | null>(null)
  const [photoMessage, setPhotoMessage] = React.useState('')
  const [checking, setChecking] = React.useState(false)
  const draft = useDraftStorage(DRAFT_KEY, ClientListingDraftValidator)
  const drafts = usePhotoDrafts({ max: LISTING_PHOTOS_MAX })
  const photos = useSendPhotos(drafts)
  const create = useOwnerListingCreateMutation()
  // O rascunho some quando o anúncio é criado; sem esta trava o salvamento atrasado do
  // formulário o gravaria de novo, e o próximo F5 ofereceria o cadastro já enviado.
  const finished = React.useRef(false)

  const form = useForm<OwnerListingCreate>({
    resolver: zodResolver(OwnerListingCreateValidator),
    defaultValues: EMPTY_LISTING_DRAFT,
    mode: 'onTouched',
  })

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
      if (finished.current) return
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

  /** Leva a pessoa à primeira etapa que tem um dos campos acusados. */
  function goToFirstStepWith(fields: ReadonlyArray<string>): void {
    const first = STEPS.findIndex((spec) =>
      spec.fields.some((field) => fields.includes(field)),
    )
    if (first >= 0) setStep(first)
  }

  /**
   * Liga as fotos ao anúncio que já existe. Sem fotos escolhidas não há o que enviar, e o
   * anúncio está pronto; com elas, o resultado decide entre a tela final e a de nova
   * tentativa.
   */
  async function finish(listing: OwnerListingShowResponse): Promise<void> {
    let result = listing

    if (drafts.items.length > 0) {
      setPhotoMessage('')
      const sent = await photos.send(listing.id)

      if (!sent.ok) {
        setPhotoMessage(sent.message)
        await invalidate('owner.listings')
        return
      }

      result = sent.listing
      drafts.reset()
    }

    await invalidate('owner.listings')
    setDone(result)
  }

  /**
   * O envio: valida o formulário inteiro (se uma etapa anterior ficou inválida, leva a
   * pessoa até ela em vez de falhar calada no último passo), confere a sessão e cria o
   * anúncio.
   */
  async function submit(data: OwnerListingCreate): Promise<void> {
    form.clearErrors('root')
    // Grava na hora: o salvamento comum espera 400 ms parado, e quem finaliza logo depois de
    // digitar perderia o último campo do rascunho.
    draft.save({ ...EMPTY_LISTING_DRAFT, ...data })
    setChecking(true)

    try {
      let account
      try {
        account = await readSession(queryClient)
      } catch {
        form.setError('root', {
          type: 'server',
          message: m.owner_error_unavailable(),
        })
        return
      }

      if (account === undefined) {
        await router.navigate({
          to: '/sign-in',
          search: { redirect: '/list-your-place' },
        })
        return
      }

      try {
        const listing = await create.mutateAsync(data)
        finished.current = true
        draft.clear()
        setCreated(listing)
        await finish(listing)
      } catch (error) {
        if (!(error instanceof HTTPError)) throw error
        goToFirstStepWith(
          applyHTTPErrorToForm(form, FIELDS, describeOwnerFailure(error)),
        )
      }
    } finally {
      setChecking(false)
    }
  }

  function handleSubmit() {
    void form.handleSubmit(
      (data) => submit(data),
      (errors) => goToFirstStepWith(Object.keys(errors)),
    )()
  }

  if (done !== null) return <ListingSubmitted listing={done} />

  if (created !== null) {
    return (
      <PhotosPending
        drafts={drafts}
        sending={photos.sending}
        message={photoMessage}
        onRetry={() => void finish(created)}
      />
    )
  }

  const tips = TIPS[STEPS[step]?.id ?? '']
  const sending = checking || create.isPending

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-4 pt-8 lg:grid lg:max-w-6xl lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-16">
      <header className="flex flex-col gap-3 lg:sticky lg:top-24">
        <h1 className="text-headline font-extrabold tracking-tight text-ink">
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
            <PhotosStep drafts={drafts} />
          </Stepper.Step>
          <Stepper.Step index={4}>
            <RulesStep control={form.control} />
          </Stepper.Step>
          <Stepper.Step index={5}>
            <ContactStep control={form.control} />
          </Stepper.Step>
          {tips !== undefined && <Stepper.Tips items={tips()} />}
          <FormNotice>{form.formState.errors.root?.message}</FormNotice>
          <Stepper.Nav
            onBeforeNext={validateStep}
            onSubmit={handleSubmit}
            pending={sending}
          />
        </form>
      </Stepper>
    </div>
  )
}
