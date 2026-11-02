import { test } from '@japa/runner'

import Slug from '#domain/shared/slug.value-object'

test.group('domain > shared > slug', () => {
  test('when made from a title, it drops accents, lowercases and joins the words with hyphens, then the suffix', ({
    assert,
  }) => {
    assert.equal(
      Slug.of('Kitnet mobiliada na Colônia!', 'ab12cd34').value,
      'kitnet-mobiliada-na-colonia-ab12cd34',
    )
  })

  test('when the text has runs of symbols and edge hyphens, they collapse into one hyphen and none at the ends', ({
    assert,
  }) => {
    assert.equal(
      Slug.of('  --Casa // 2 quartos --  ', 'x1').value,
      'casa-2-quartos-x1',
    )
  })

  test('when the title has no letter or digit, it falls back to "anuncio" instead of an empty path segment', ({
    assert,
  }) => {
    assert.equal(Slug.of('!!! ???', 'x1').value, 'anuncio-x1')
  })

  test('when the title is long, the base is cut without a dangling hyphen and the whole slug fits the column', ({
    assert,
  }) => {
    const slug = Slug.of(`${'palavra '.repeat(40)}fim`, 'ab12cd34').value

    assert.isAtMost(slug.length, 100)
    assert.notInclude(slug, '--')
    assert.match(slug, /^[a-z0-9-]+-ab12cd34$/)
  })

  test('when compared, two slugs are equal by their text', ({ assert }) => {
    assert.isTrue(Slug.of('A', 'x').equals(Slug.of('a', 'x')))
    assert.isFalse(Slug.of('A', 'x').equals(Slug.of('A', 'y')))
  })
})
