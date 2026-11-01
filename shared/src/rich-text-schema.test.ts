import { describe, expect, it } from 'vitest'

import { RichText } from './rich-text-schema.js'
import type { RichTextDocument } from './validator.js'

function paragraph(text: string): RichTextDocument {
  return {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
  }
}

function link(href: unknown): RichTextDocument {
  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'site',
            marks: [{ type: 'link', attrs: { href } }],
          },
        ],
      },
    ],
  }
}

describe('RichText.fromMarkdown', () => {
  it('when the Markdown has heading, bold and list, it becomes the matching nodes and marks', () => {
    const document = RichText.fromMarkdown(
      '# Title\n\nSome **bold** text\n\n- one\n- two',
    )

    expect(document.type).toBe('doc')
    expect(document.content?.map((node) => node.type)).toEqual([
      'heading',
      'paragraph',
      'bulletList',
    ])
    expect(JSON.stringify(document)).toContain('"type":"bold"')
  })

  it('when the Markdown embeds HTML, it stays as literal text and no script node exists', () => {
    const document = RichText.fromMarkdown(
      'Hi <script>alert(1)</script>\n\n<img src=x onerror=alert(1)>',
    )
    const serialized = JSON.stringify(document)

    expect(serialized).not.toContain('"type":"script"')
    expect(serialized).not.toContain('"type":"image"')
    expect(RichText.violation(document)).toBeNull()
  })

  it('when the result is written back, the Markdown keeps its meaning (round trip)', () => {
    const source =
      '## Title\n\nSome **bold** and *italic* text\n\n1. first\n2. second'
    const back = RichText.toMarkdown(RichText.fromMarkdown(source))

    expect(RichText.fromMarkdown(back)).toEqual(RichText.fromMarkdown(source))
  })
})

describe('RichText.violation', () => {
  it('when the document is valid, it accepts', () => {
    expect(RichText.violation(paragraph('Hello'))).toBeNull()
  })

  it('when the value is not a document, it refuses', () => {
    expect(RichText.violation('plain string')).toBe('richText')
    expect(RichText.violation({ type: 'paragraph' })).toBe('richText')
    expect(RichText.violation(null)).toBe('richText')
  })

  it('when a node is outside the extension list, it refuses', () => {
    const document: RichTextDocument = {
      type: 'doc',
      content: [{ type: 'iframe', attrs: { src: 'https://x.test' } }],
    }

    expect(RichText.violation(document)).toBe('richText')
  })

  it('when a mark is outside the extension list, it refuses', () => {
    const document: RichTextDocument = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'x', marks: [{ type: 'underline' }] },
          ],
        },
      ],
    }

    expect(RichText.violation(document)).toBe('richText')
  })

  it('when nodes nest against the schema, it refuses', () => {
    const document: RichTextDocument = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: 'x' }] },
          ],
        },
      ],
    }

    expect(RichText.violation(document)).toBe('richText')
  })

  it.each(['https://example.com', 'http://example.com', 'mailto:a@b.co'])(
    'when the link is %s, it accepts',
    (href) => {
      expect(RichText.violation(link(href))).toBeNull()
    },
  )

  it.each([
    'javascript:alert(1)',
    'data:text/html,<b>x</b>',
    'JaVaScRiPt:alert(1)',
    42,
    undefined,
  ])('when the link is %s, it refuses', (href) => {
    expect(RichText.violation(link(href))).toBe('richText')
  })

  it('when there is no text, it asks for the content', () => {
    expect(
      RichText.violation({ type: 'doc', content: [{ type: 'paragraph' }] }),
    ).toBe('required')
    expect(RichText.violation(paragraph('   '))).toBe('required')
  })

  it('when the serialized JSON passes the ceiling, it refuses', () => {
    expect(RichText.violation(paragraph('a'.repeat(200_001)))).toBe('richText')
  })
})
