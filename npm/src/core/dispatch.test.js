import { describe, expect, it } from 'vitest'
import { createDispatch, validateInput } from './dispatch.js'

const catalog = [
  { tier: 'read', name: 'ping', summary: 'ping', input: {}, tauri: 'ping_cmd' },
  { tier: 'read', name: 'echo', summary: 'echo', input: { msg: { type: 'string', required: true } }, tauri: 'echo_cmd' }
]

describe('createDispatch', () => {
  it('returns an ok envelope from the transport output', async () => {
    const dispatch = createDispatch(catalog, () => 'pong')
    expect(await dispatch('ping', {})).toEqual({ ok: true, output: 'pong' })
  })

  it('rejects unknown tools and invalid input before the transport', async () => {
    const dispatch = createDispatch(catalog, () => 'x')
    expect((await dispatch('nope', {})).error.code).toBe('not_found')
    expect((await dispatch('echo', {})).error.code).toBe('validation')
  })

  it('wraps a thrown error as an io envelope', async () => {
    const dispatch = createDispatch(catalog, () => {
      throw new Error('boom')
    })
    expect(await dispatch('ping', {})).toEqual({ ok: false, error: { code: 'io', message: 'boom' } })
  })

  it('preserves a backend error kind on the envelope', async () => {
    const dispatch = createDispatch(catalog, () => {
      const error = new Error('re-auth')
      error.kind = 'ReauthRequired'
      throw error
    })
    const res = await dispatch('ping', {})
    expect(res.ok).toBe(false)
    expect(res.error.code).toBe('io')
    expect(res.error.kind).toBe('ReauthRequired')
  })
})

describe('validateInput', () => {
  it('flags missing required and wrong types', () => {
    expect(validateInput(catalog[1], {})).toBe('Missing required field: msg')
    expect(validateInput(catalog[1], { msg: 5 })).toBe('Field "msg" must be a string')
    expect(validateInput(catalog[1], { msg: 'ok' })).toBeNull()
  })
})
