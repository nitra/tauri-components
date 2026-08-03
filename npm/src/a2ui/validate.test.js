import { describe, expect, it } from 'vitest'
import { validateA2uiStream, SAMPLE_SIDEBAR_STREAM } from './validate.js'

describe('validateA2uiStream', () => {
  it('accepts sample sidebar', () => {
    const r = validateA2uiStream(SAMPLE_SIDEBAR_STREAM)
    expect(r.ok).toBe(true)
    expect(r.surfaces.has('sidebar.draft-helper')).toBe(true)
  })

  it('rejects unknown catalog', () => {
    const r = validateA2uiStream([
      {
        version: 'v1.0',
        createSurface: {
          surfaceId: 's',
          catalogId: 'evil',
          components: [{ id: 'root', component: 'Text', text: 'x' }]
        }
      }
    ])
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/unknown catalog/)
  })

  it('rejects unknown component so host never renders it', () => {
    const r = validateA2uiStream([
      {
        version: 'v1.0',
        createSurface: {
          surfaceId: 's',
          catalogId: 'nitra.core',
          components: [{ id: 'root', component: 'WebView', url: 'https://x' }]
        }
      }
    ])
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/unknown component/)
  })

  it('rejects unknown prop (no HTML fallback)', () => {
    const r = validateA2uiStream([
      {
        version: 'v1.0',
        createSurface: {
          surfaceId: 's',
          catalogId: 'nitra.core',
          components: [{ id: 'root', component: 'Text', text: 'hi', innerHTML: '<b>x</b>' }]
        }
      }
    ])
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/unknown prop/)
  })
})
