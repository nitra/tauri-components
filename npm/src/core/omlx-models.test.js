import { describe, expect, it, vi } from 'vitest'
import { listOmlxModels, resolveModel } from './omlx-models.js'

const okFetch = body => vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(body) })

describe('listOmlxModels', () => {
  it('returns [] without a baseUrl (no fetch)', async () => {
    const fetchFn = vi.fn()
    expect(await listOmlxModels({ fetchFn })).toEqual([])
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('maps the OpenAI /models shape to ids and adds the bearer header', async () => {
    const fetchFn = okFetch({ data: [{ id: 'gemma' }, { id: 'qwen' }, {}] })
    expect(await listOmlxModels({ baseUrl: "https://x/v1", apiKey: 'k', fetchFn })).toEqual(['gemma', 'qwen'])
    expect(fetchFn).toHaveBeenCalledWith("https://x/v1/models", expect.objectContaining({
      headers: { authorization: 'Bearer k' },
    }))
  })

  it('returns [] on a non-ok response or a throw', async () => {
    expect(await listOmlxModels({ baseUrl: "https://x/v1", fetchFn: vi.fn().mockResolvedValue({ ok: false }) })).toEqual([])
    expect(await listOmlxModels({ baseUrl: "https://x/v1", fetchFn: vi.fn().mockRejectedValue(new Error('down')) })).toEqual([])
  })
})

describe('resolveModel', () => {
  it('keeps the preferred model when loaded', () => {
    expect(resolveModel(['a', 'b'], 'b')).toBe('b')
  })

  it('falls back to the first model, then to empty', () => {
    expect(resolveModel(['a', 'b'], 'missing')).toBe('a')
    expect(resolveModel([], 'missing')).toBe('')
  })
})
