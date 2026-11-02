import * as React from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'

import { LISTING_PHOTOS_MAX, OwnerListingCreateValidator } from '@aporta/shared'
import type { OwnerListingCreate } from '@aporta/shared'

import { ActionButton } from '#/components/common/action-button'
import { FormNotice } from '#/components/common/form-notice'
import { ListingPhoto } from '#/components/common/listing-photo'
import {
  ContactStep,
  PlaceStep,
  RoomsFields,
  RulesStep,
  TypeStep,
  ValuesStep,
} from '#/components/common/listing-fields'
import { PhotoPicker } from '#/components/common/photo-picker'
import { PillButton } from '#/components/common/pill-button'
import { StatusChip } from '#/components/common/status-chip'
import { usePhotoDrafts } from '#/hooks/use-photo-drafts'
import { useSendPhotos } from '#/hooks/use-send-photos'
import { useInvalidate } from '#/integrations/tanstack-query/invalidate'
import { useOwnerListingUpdateMutation } from '#/integrations/tanstack-query/mutations/owner-listings'
import { ownerListingQueryOptions } from '#/integrations/tanstack-query/queries/owner-listings'
import { applyOwnerFailure } from '#/lib/apply-owner-failure'
import { PHOTO_ENVIRONMENT_LABELS } from '#/lib/labels'
import { OWNER_LISTING_FIELDS, listingToForm } from '#/lib/owner-listing-form'
import { m } from '#/paraglide/messages'

/** Um bloco do formulário com título: a edição é uma página só, e o título é o que separa os assuntos. */
function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <section className="flex flex-col gap-5 rounded-card bg-surface p-5 sm:p-8">
      <h2 className="text-xl font-extrabold text-ink">{title}</h2>
      {children}
    </section>
  )
}

/**
 * A edição do anúncio numa página só, com todas as seções à vista: quem volta para trocar o
 * preço não quer atravessar seis etapas. Valida com o validator de **criação** e não com o
 * de `Update`: o de `Update` é todo opcional e aprovaria um campo obrigatório apagado
 * (`_standards/frontend.md` §4).
 *
 * O `PUT` é parcial, então só o que o formulário preenche altera algo. Consequência
 * assumida: apagar a diária ou as regras não as remove, porque campo em branco conta como
 * "não mexer" na API.
 *
 * As fotos já enviadas aparecem só para leitura: a API permite adicionar (até
 * `LISTING_PHOTOS_MAX`) e não tem rota para remover ou reordenar.
 */
export function EditForm({ id }: { id: string }): React.JSX.Element {
  const { data: listing } = useSuspenseQuery(ownerListingQueryOptions(id))
  const invalidate = useInvalidate()
  const [saved, setSaved] = React.useState(false)
  const [photoMessage, setPhotoMessage] = React.useState('')

  const form = useForm<OwnerListingCreate>({
    resolver: zodResolver(OwnerListingCreateValidator),
    defaultValues: listingToForm(listing),
    mode: 'onTouched',
  })

  const update = useOwnerListingUpdateMutation()
  const drafts = usePhotoDrafts({
    max: Math.max(LISTING_PHOTOS_MAX - listing.photos.length, 0),
    taken: listing.photos.map((photo) => photo.environment),
  })
  const photos = useSendPhotos(drafts)

  function onSubmit(payload: OwnerListingCreate): void {
    setSaved(false)
    form.clearErrors('root')
    update.mutate(
      { id, ...payload },
      {
        async onSuccess(updated) {
          // O formulário passa a valer o que o servidor guardou (o `trim` do texto, por
          // exemplo), senão "alterado" continuaria verdadeiro logo depois de salvar.
          form.reset(listingToForm(updated))
          await Promise.all([
            invalidate('owner.listings'),
            invalidate('storefront.listings'),
          ])
          setSaved(true)
        },
        onError: (error) => {
          applyOwnerFailure(form, error, OWNER_LISTING_FIELDS)
        },
      },
    )
  }

  async function sendPhotos(): Promise<void> {
    setPhotoMessage('')
    const result = await photos.send(id)

    if (!result.ok) {
      setPhotoMessage(result.message)
      return
    }

    drafts.reset()
    await invalidate('owner.listings')
  }

  const full = listing.photos.length >= LISTING_PHOTOS_MAX

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-3">
        <PillButton to="/owner/listings" tone="outline" className="self-start">
          {m.owner_listings_back_to_list()}
        </PillButton>
        <StatusChip status={listing.status} className="self-start" />
        <h1 className="text-3xl leading-tight font-extrabold tracking-tight break-words text-ink sm:text-4xl">
          {m.owner_edit_title()}
        </h1>
        {listing.status === 'PUBLISHED' && (
          <Link
            to="/listings/$slug"
            params={{ slug: listing.slug }}
            className="inline-flex min-h-11 items-center self-start text-sm font-bold text-moss underline underline-offset-4"
          >
            {m.owner_listings_view()}
          </Link>
        )}
      </header>

      <form
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-6"
      >
        <Section title={m.step_type()}>
          <TypeStep control={form.control} />
          <RoomsFields control={form.control} />
        </Section>
        <Section title={m.step_place()}>
          <PlaceStep control={form.control} />
        </Section>
        <Section title={m.step_values()}>
          <ValuesStep control={form.control} />
        </Section>
        <Section title={m.owner_edit_section_text()}>
          <RulesStep control={form.control} />
        </Section>
        <Section title={m.step_contact()}>
          <ContactStep control={form.control} />
        </Section>
        <FormNotice>{form.formState.errors.root?.message}</FormNotice>
        {saved && (
          <p
            role="status"
            className="rounded-xl bg-moss-wash px-4 py-3 text-sm font-bold text-moss-deep"
          >
            {m.owner_edit_saved()}
          </p>
        )}
        <ActionButton
          type="submit"
          scale="lg"
          pending={update.isPending}
          className="w-full sm:w-auto sm:self-start"
        >
          {m.owner_edit_save()}
        </ActionButton>
      </form>

      <Section title={m.step_photos()}>
        {listing.photos.length > 0 && (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {listing.photos.map((photo) => (
              <li key={photo.id} className="flex flex-col gap-1.5">
                <div className="aspect-[4/3] overflow-hidden rounded-xl">
                  <ListingPhoto
                    photo={photo}
                    listingType={listing.type}
                    title={listing.title}
                  />
                </div>
                <p className="text-xs font-bold text-ink-soft">
                  {PHOTO_ENVIRONMENT_LABELS[photo.environment]()}
                </p>
              </li>
            ))}
          </ul>
        )}
        <p className="text-sm text-ink-soft">
          {m.owner_edit_photos_note({
            count: listing.photos.length,
            max: LISTING_PHOTOS_MAX,
          })}
        </p>
        {!full && (
          <>
            <PhotoPicker drafts={drafts} disabled={photos.sending} />
            <FormNotice>{photoMessage}</FormNotice>
            <ActionButton
              type="button"
              tone="outline"
              scale="lg"
              pending={photos.sending}
              disabled={drafts.items.length === 0}
              onClick={() => void sendPhotos()}
              className="w-full sm:w-auto sm:self-start"
            >
              {m.owner_edit_photos_send()}
            </ActionButton>
          </>
        )}
      </Section>
    </div>
  )
}
