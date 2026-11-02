import { describe, expect, it } from 'vitest'

import { OwnerListingPhotoCreateValidator } from './listing-photos.validator.js'
import {
  LISTING_PHOTOS_MAX,
  PHOTO_ENVIRONMENT,
} from '../../enums/photo-environment.js'
import { ValidationFixture } from '../../validation-fixtures.js'

const STORAGE_ID = '00000000-0000-4000-8000-000000000001'

describe('OwnerListingPhotoCreateValidator', () => {
  it('aceita arquivos já enviados, cada um com o seu ambiente', () => {
    const result = OwnerListingPhotoCreateValidator.safeParse({
      photos: [
        { storageId: STORAGE_ID, environment: PHOTO_ENVIRONMENT.FACADE },
        { storageId: STORAGE_ID, environment: PHOTO_ENVIRONMENT.KITCHEN },
      ],
    })

    expect(result.success).toBe(true)
  })

  it('exige ao menos uma foto', () => {
    const result = OwnerListingPhotoCreateValidator.safeParse({ photos: [] })

    expect(ValidationFixture.fields(result)).toEqual(['photos'])
  })

  it('recusa mais fotos que o teto do anúncio', () => {
    const photos = Array.from({ length: LISTING_PHOTOS_MAX + 1 }, () => ({
      storageId: STORAGE_ID,
      environment: PHOTO_ENVIRONMENT.BEDROOM,
    }))

    expect(OwnerListingPhotoCreateValidator.safeParse({ photos }).success).toBe(
      false,
    )
  })

  it('recusa chave que não é uuid e ambiente fora da lista', () => {
    const result = OwnerListingPhotoCreateValidator.safeParse({
      photos: [{ storageId: 'nao-e-uuid', environment: 'GARAGE' }],
    })

    expect(ValidationFixture.fields(result)).toEqual([
      'photos.0.environment',
      'photos.0.storageId',
    ])
  })
})
