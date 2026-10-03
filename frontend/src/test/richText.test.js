import { describe, it, expect } from 'vitest'
import { htmlToPlainText, isRichTextEmpty, toPreview } from '../utils/richText'

// These rules exist in two places on purpose — here, so the character counter
// and the form's Zod schema can work without a round trip, and in
// backend/src/utils/richText.js, which is the authority. The pair below marked
// "parity" are the ones that must not drift: if the client counts a
// description differently from the server, the user watches a counter that
// says 1,998 while the API rejects the submit for being over 2,000.

describe('htmlToPlainText', () => {
  it('strips tags and keeps the words', () => {
    expect(htmlToPlainText('<p>Please approve <strong>this</strong>.</p>')).toBe(
      'Please approve this.',
    )
  })

  it('separates block elements so words do not run together', () => {
    expect(htmlToPlainText('<p>one</p><p>two</p>')).toBe('one\ntwo')
    expect(htmlToPlainText('<ul><li>a</li><li>b</li></ul>')).toBe('a\nb')
  })

  it('parity: one newline per block boundary, not two', () => {
    // The block regex matches both the opening and the closing tag, so an
    // uncollapsed projection would charge two characters per paragraph break.
    expect(htmlToPlainText('<p>a</p><p>b</p><p>c</p>')).toBe('a\nb\nc')
  })

  it('decodes entities', () => {
    expect(htmlToPlainText('<p>Tom &amp; Jerry</p>')).toBe('Tom & Jerry')
    expect(htmlToPlainText('<p>R&amp;D &quot;budget&quot;</p>')).toBe('R&D "budget"')
  })

  it('passes plain text through unchanged', () => {
    // Every request created before the editor shipped holds plain text.
    expect(htmlToPlainText('just words')).toBe('just words')
  })

  it('parity: counts typed characters, not markup', () => {
    const heavy = `<p>${'<strong>a</strong>'.repeat(300)}</p>`
    expect(heavy.length).toBeGreaterThan(5000)
    expect(htmlToPlainText(heavy)).toHaveLength(300)
  })

  it('does not execute or fetch anything while parsing', () => {
    // DOMParser builds a detached, inert document — the script contributes no
    // text and never runs.
    expect(htmlToPlainText('<p>safe</p><script>window.pwned = 1</script>')).toBe('safe')
    expect(window.pwned).toBeUndefined()
  })

  it('handles nullish and non-string input', () => {
    expect(htmlToPlainText(null)).toBe('')
    expect(htmlToPlainText(undefined)).toBe('')
    expect(htmlToPlainText('')).toBe('')
  })
})

describe('isRichTextEmpty', () => {
  it('treats an opened-and-cleared editor as empty', () => {
    // TipTap serialises an empty document to "<p></p>", which is a truthy
    // string and would sail past a plain `required` check.
    expect(isRichTextEmpty('<p></p>')).toBe(true)
    expect(isRichTextEmpty('<p>   </p>')).toBe(true)
    expect(isRichTextEmpty('<p><br></p>')).toBe(true)
  })

  it('treats a single word as non-empty', () => {
    expect(isRichTextEmpty('<p>x</p>')).toBe(false)
  })
})

describe('toPreview', () => {
  it('prefers the stored plain-text projection', () => {
    expect(toPreview('stored text', '<p>ignored</p>')).toBe('stored text')
  })

  it('derives a preview when descriptionText is missing', () => {
    // Rows created before descriptionText existed have it empty; a preview
    // column that goes blank on every historical row reads as data loss.
    expect(toPreview('', '<p>one</p><p>two</p>')).toBe('one two')
    expect(toPreview(undefined, '<ul><li>a</li><li>b</li></ul>')).toBe('a b')
  })

  it('never leaks markup into the preview', () => {
    expect(toPreview('', '<p>Approve <strong>now</strong></p>')).toBe('Approve now')
  })
})
