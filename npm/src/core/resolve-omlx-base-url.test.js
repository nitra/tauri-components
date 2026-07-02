import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  __resetOmlxBaseUrlCache,
  DIRECT_OMLX_BASE_URL,
  isDirectOmlxUrl,
  PROXY_OMLX_BASE_URL,
  resolveOmlxBaseUrl,
  resolveOmlxBaseUrlCached,
} from './resolve-omlx-base-url.js'

const healthyFetch = () => vi.fn().mockResolvedValue({ ok: true })
const downFetch = () => vi.fn().mockRejectedValue(new Error('ECONNREFUSED'))

beforeEach(() => {
  __resetOmlxBaseUrlCache()
})

describe('isDirectOmlxUrl', () => {
  it('accepts the default local omlx hosts', () => {
    expect(isDirectOmlxUrl('http://127.0.0.1:8000/v1')).toBe(true)
    expect(isDirectOmlxUrl('http://localhost:8000/v1')).toBe(true)
  })

  it('rejects other hosts, the proxy itself and garbage', () => {
    expect(isDirectOmlxUrl('http://127.0.0.1:8088/v1')).toBe(false)
    expect(isDirectOmlxUrl("https://10.0.0.5:8000/v1")).toBe(false)
    expect(isDirectOmlxUrl('not a url')).toBe(false)
    expect(isDirectOmlxUrl('')).toBe(false)
  })
})

describe('resolveOmlxBaseUrl', () => {
  it('returns the proxy URL when /health is 2xx, probing the origin without /v1', async () => {
    const fetchFn = healthyFetch()
    expect(await resolveOmlxBaseUrl({ fetchFn })).toBe(PROXY_OMLX_BASE_URL)
    expect(fetchFn).toHaveBeenCalledWith('http://127.0.0.1:8088/health', expect.anything())
  })

  it('passes a timeout signal to the probe', async () => {
    const fetchFn = healthyFetch()
    await resolveOmlxBaseUrl({ fetchFn })
    const [, options] = fetchFn.mock.calls[0]
    expect(options.signal).toBeInstanceOf(AbortSignal)
  })

  it('returns the direct URL on a non-2xx response (proxy up, omlx down)', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: false, status: 502 })
    expect(await resolveOmlxBaseUrl({ fetchFn })).toBe(DIRECT_OMLX_BASE_URL)
  })

  it('returns the direct URL when the probe throws (proxy not running)', async () => {
    expect(await resolveOmlxBaseUrl({ fetchFn: downFetch() })).toBe(DIRECT_OMLX_BASE_URL)
  })

  it('returns the direct URL when the probe aborts', async () => {
    const abortError = Object.assign(new Error('aborted'), { name: 'AbortError' })
    expect(await resolveOmlxBaseUrl({ fetchFn: vi.fn().mockRejectedValue(abortError) })).toBe(DIRECT_OMLX_BASE_URL)
  })

  it('threads custom directUrl/proxyUrl through verbatim', async () => {
    const fetchFn = healthyFetch()
    const resolved = await resolveOmlxBaseUrl({
      directUrl: 'http://127.0.0.1:9000/v1',
      proxyUrl: 'http://127.0.0.1:9088/v1',
      fetchFn,
    })
    expect(resolved).toBe('http://127.0.0.1:9088/v1')
    expect(fetchFn).toHaveBeenCalledWith('http://127.0.0.1:9088/health', expect.anything())

    expect(await resolveOmlxBaseUrl({
      directUrl: 'http://127.0.0.1:9000/v1',
      proxyUrl: 'http://127.0.0.1:9088/v1',
      fetchFn: downFetch(),
    })).toBe('http://127.0.0.1:9000/v1')
  })
})

describe('resolveOmlxBaseUrlCached', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('probes once within the TTL window', async () => {
    const fetchFn = healthyFetch()
    expect(await resolveOmlxBaseUrlCached({ fetchFn })).toBe(PROXY_OMLX_BASE_URL)
    expect(await resolveOmlxBaseUrlCached({ fetchFn })).toBe(PROXY_OMLX_BASE_URL)
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('re-probes after the TTL expires and notices the proxy going down', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)

    const fetchFn = healthyFetch()
    expect(await resolveOmlxBaseUrlCached({ fetchFn, ttlMs: 1000 })).toBe(PROXY_OMLX_BASE_URL)

    vi.setSystemTime(2000)
    fetchFn.mockRejectedValue(new Error('ECONNREFUSED'))
    expect(await resolveOmlxBaseUrlCached({ fetchFn, ttlMs: 1000 })).toBe(DIRECT_OMLX_BASE_URL)
    expect(fetchFn).toHaveBeenCalledTimes(2)
  })

  it('dedupes concurrent probes into a single fetch', async () => {
    const fetchFn = healthyFetch()
    const [a, b] = await Promise.all([
      resolveOmlxBaseUrlCached({ fetchFn }),
      resolveOmlxBaseUrlCached({ fetchFn }),
    ])
    expect(a).toBe(PROXY_OMLX_BASE_URL)
    expect(b).toBe(PROXY_OMLX_BASE_URL)
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('caches per proxyUrl independently', async () => {
    const fetchFn = healthyFetch()
    await resolveOmlxBaseUrlCached({ fetchFn })
    await resolveOmlxBaseUrlCached({ fetchFn, proxyUrl: 'http://127.0.0.1:9088/v1' })
    expect(fetchFn).toHaveBeenCalledTimes(2)
  })
})
