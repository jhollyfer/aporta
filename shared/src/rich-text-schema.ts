import { getSchema } from '@tiptap/core'
import { MarkdownManager } from '@tiptap/markdown'
import StarterKit from '@tiptap/starter-kit'
import { renderToMarkdown } from '@tiptap/static-renderer/pm/markdown'
import * as z from 'zod'

import { RICH_TEXT_MAX_LENGTH, RichTextDocumentSchema } from './validator.js'
import type { RichTextDocument, RichTextNode } from './validator.js'

/**
 * The single list of extensions of the rich text (`_standards/architecture.md` §9, `_standards/DECISIONS.md`
 * #237): the editor, the reader (`renderToReactElement`), the server validation and the data
 * migration all take it from here, because the list **is** the schema. A node or mark outside it
 * is refused on write and would not be drawn on read; two copies would let a document written
 * by one side vanish on the other (_doc-lib/tiptap.md#api/utilities/html).
 *
 * `StarterKit` without underline: the `extension-underline` serializes `++text++`, which is not
 * GFM (`_standards/frontend.md` §8).
 */
export const RICH_TEXT_EXTENSIONS = [StarterKit.configure({ underline: false })]

/**
 * The heading levels the schema accepts (Tiptap's `Level`, 1 to 6). The reader parses
 * `node.attrs.level`, typed `any` by the renderer, through it (`typescript.md` §2.1).
 */
export const RichTextHeadingLevelSchema = z.literal([1, 2, 3, 4, 5, 6])

export type RichTextHeadingLevel = z.infer<typeof RichTextHeadingLevelSchema>

/** Why a document was refused: the rule that names the message (`RULE_MESSAGES`). */
export type RichTextViolation = 'required' | 'richText'

/**
 * Only `https:`, `http:` and `mailto:` become a link (`_standards/frontend.md` §8). React 19
 * blocks `javascript:` but not `data:`, and the link comes from the user.
 */
const SAFE_HREF = /^(https?:|mailto:)/i

/**
 * The conversions and checks of the rich text that depend on the Tiptap schema. A class because
 * it holds the manager and the ProseMirror schema built once from `RICH_TEXT_EXTENSIONS`
 * (`_standards/typescript.md` §6).
 */
export class RichText {
  static readonly #manager = new MarkdownManager({
    extensions: RICH_TEXT_EXTENSIONS,
  })

  static readonly #schema = getSchema(RICH_TEXT_EXTENSIONS)

  /**
   * Markdown (legacy content, or text that comes from outside) to the editor's JSON, without an
   * editor (_doc-lib/tiptap.md#markdown, https://tiptap.dev/docs/editor/markdown/api/markdown-manager).
   *
   * On the server `@tiptap/markdown` has no `DOMParser`, so embedded HTML stays as literal text:
   * nothing in the Markdown becomes a node that the extension list does not declare.
   */
  static fromMarkdown(markdown: string): RichTextDocument {
    return RichTextDocumentSchema.parse(RichText.#manager.parse(markdown))
  }

  /** A document of one paragraph: seeds, factories and fixtures that only need some text. */
  static fromText(text: string): RichTextDocument {
    return {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
    }
  }

  /** The document as Markdown, for the migration's way back and for export. */
  static toMarkdown(document: RichTextDocument): string {
    return renderToMarkdown({
      extensions: RICH_TEXT_EXTENSIONS,
      content: document,
    })
  }

  /**
   * What is wrong with a value that claims to be a document, or `null` when it is accepted.
   *
   * The Zod and VineJS validators call this, so the form and the API refuse the same things:
   * not a document, a node or mark that no extension declares, content that breaks the schema
   * (a `paragraph` inside a `paragraph`), a link that is not `http(s)`/`mailto`, more than the
   * ceiling, or no text at all.
   */
  static violation(value: unknown): RichTextViolation | null {
    const parsed = RichTextDocumentSchema.safeParse(value)

    if (!parsed.success) return 'richText'
    if (JSON.stringify(parsed.data).length > RICH_TEXT_MAX_LENGTH)
      return 'richText'
    if (!RichText.conforms(parsed.data)) return 'richText'
    if (!RichText.#linksAreSafe(parsed.data.content ?? [])) return 'richText'
    if (!RichText.#hasText(parsed.data.content ?? [])) return 'required'

    return null
  }

  /**
   * The ProseMirror check: the extension list declares every node and mark, and nests them well.
   * The reader asks it before drawing, because the static renderer throws on a node it does not know.
   */
  static conforms(document: RichTextDocument): boolean {
    try {
      RichText.#schema.nodeFromJSON(document).check()
    } catch {
      return false
    }

    return true
  }

  static #linksAreSafe(nodes: ReadonlyArray<RichTextNode>): boolean {
    return nodes.every((node) => {
      const marksAreSafe = (node.marks ?? []).every((mark) => {
        if (mark.type !== 'link') return true

        const href = mark.attrs?.href

        return typeof href === 'string' && SAFE_HREF.test(href)
      })

      return marksAreSafe && RichText.#linksAreSafe(node.content ?? [])
    })
  }

  static #hasText(nodes: ReadonlyArray<RichTextNode>): boolean {
    return nodes.some(
      (node) =>
        (node.text ?? '').trim().length > 0 ||
        RichText.#hasText(node.content ?? []),
    )
  }
}
