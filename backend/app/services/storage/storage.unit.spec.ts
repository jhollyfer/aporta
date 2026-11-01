import { STORAGE_EXTENSIONS, STORAGE_MIMETYPE } from '@aporta/shared'
import { test } from '@japa/runner'

import StorageService from '#services/storage/storage.service'
import { storageFile } from '#tests/repository-fixtures'

/**
 * What `StorageService` decides without talking to the bucket: the object key, the
 * download header and the local URL signing (the presigner does no network).
 */
test.group('services > storage (unit)', () => {
  test('when it builds a key, uses a uuid plus the extension of the declared type', ({
    assert,
  }) => {
    const service = new StorageService()

    const key = service.key(STORAGE_MIMETYPE.PNG)

    assert.match(
      key,
      new RegExp(
        `^[0-9a-f-]{36}\\.${STORAGE_EXTENSIONS[STORAGE_MIMETYPE.PNG]}$`,
      ),
    )
    assert.notEqual(key, service.key(STORAGE_MIMETYPE.PNG))
  })

  test('when the name has accents, keeps them in the UTF-8 form and drops them in the ASCII one', ({
    assert,
  }) => {
    const header = new StorageService().contentDisposition(
      'Relatório Anual.pdf',
    )

    assert.include(header, 'filename="Relatorio Anual.pdf"')
    assert.include(header, "filename*=UTF-8''Relat%C3%B3rio%20Anual.pdf")
  })

  test('when the name has quotes, neutralizes them because they would escape the header', ({
    assert,
  }) => {
    const header = new StorageService().contentDisposition('nota "final".pdf')

    assert.include(header, 'filename="nota _final_.pdf"')
  })

  test('when signing a file, keeps its fields and adds a signed url for its path', async ({
    assert,
  }) => {
    const file = storageFile()

    const signed = await new StorageService().signFile(file)

    assert.equal(signed.id, file.id)
    assert.include(signed.url, file.path)
    assert.include(signed.url, 'X-Amz-Signature')
  })

  test('when signing no file, answers null', async ({ assert }) => {
    assert.isNull(await new StorageService().signFile(null))
  })
})
