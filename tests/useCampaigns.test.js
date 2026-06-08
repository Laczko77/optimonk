// Unit tests for the async data-access composable src/composables/useCampaigns.js
// (Iteration 7). Runs under the default `node` env — no DOM is needed; we drive
// the composable directly and stub global.fetch.
//
// GOTCHA: useCampaigns is a MODULE-LEVEL SINGLETON. The reactive refs (campaigns/
// loading/error) and the `started` flag live at module scope and are shared across
// every caller, and the fetch is fired exactly once on first use. To test each
// behaviour from a clean slate we vi.resetModules() and re-import the module per
// case (via freshUseCampaigns), and reset the fetch stub in beforeEach so state
// never leaks between tests.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Re-import the module fresh so the singleton's refs + `started` flag reset.
async function freshUseCampaigns() {
  vi.resetModules()
  const mod = await import('../src/composables/useCampaigns.js')
  return mod.useCampaigns
}

// Flush pending micro/macrotasks so the load() chain (await fetch → await json →
// finally) fully settles before we assert.
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

// Stub global.fetch with a given implementation.
const stubFetch = (impl) => vi.stubGlobal('fetch', vi.fn(impl))

// A fetch that resolves to an ok JSON response carrying `payload`.
const okJson = (payload) => async () => ({ ok: true, json: async () => payload })

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useCampaigns — loading lifecycle', () => {
  it('loading is true while the fetch is in flight, then false after success', async () => {
    let resolveFetch
    const pending = new Promise((r) => {
      resolveFetch = r
    })
    stubFetch(() => pending)

    const useCampaigns = await freshUseCampaigns()
    const { loading, error, campaigns } = useCampaigns()

    // load() sets loading=true synchronously before its first await.
    expect(loading.value).toBe(true)
    expect(error.value).toBe(false)

    resolveFetch({ ok: true, json: async () => ({ campaigns: [{ id: 'a' }] }) })
    await flush()

    expect(loading.value).toBe(false)
    expect(error.value).toBe(false)
    expect(campaigns.value).toEqual([{ id: 'a' }])
  })

  it('fetches GET /api/campaigns', async () => {
    stubFetch(okJson({ campaigns: [] }))
    const useCampaigns = await freshUseCampaigns()
    useCampaigns()
    await flush()
    expect(fetch).toHaveBeenCalledWith('/api/campaigns')
  })

  it('is a singleton: calling useCampaigns twice triggers only ONE fetch', async () => {
    const fetchMock = vi.fn(okJson({ campaigns: [] }))
    vi.stubGlobal('fetch', fetchMock)

    const useCampaigns = await freshUseCampaigns()
    useCampaigns()
    useCampaigns()
    await flush()

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('useCampaigns — response normalization', () => {
  // Accept the canonical { campaigns: [...] } and a bare [...]; anything else → [].
  const cases = [
    ['canonical { campaigns: [...] }', { campaigns: [{ id: 'x' }] }, [{ id: 'x' }]],
    ['bare top-level array', [{ id: 'y' }], [{ id: 'y' }]],
    ['object without a campaigns array → []', { nope: true }, []],
    ['campaigns not an array → []', { campaigns: 'oops' }, []],
    ['null payload → []', null, []],
    ['number payload → []', 42, []],
    ['string payload → []', 'oops', []],
  ]

  it.each(cases)('normalizes %s', async (_label, payload, expected) => {
    stubFetch(okJson(payload))
    const useCampaigns = await freshUseCampaigns()
    const { campaigns, error } = useCampaigns()
    await flush()

    expect(campaigns.value).toEqual(expected)
    // A well-formed (ok) response is not an error, even if it normalizes to [].
    expect(error.value).toBe(false)
  })
})

describe('useCampaigns — getCampaignById', () => {
  it('resolves a loaded campaign by id, and returns null when missing', async () => {
    stubFetch(okJson({ campaigns: [{ id: 'a' }, { id: 'b' }] }))
    const useCampaigns = await freshUseCampaigns()
    const { getCampaignById } = useCampaigns()
    await flush()

    expect(getCampaignById('b')).toEqual({ id: 'b' })
    expect(getCampaignById('missing')).toBeNull()
  })
})

describe('useCampaigns — error handling', () => {
  it('non-ok response → error true, campaigns [], loading false', async () => {
    stubFetch(async () => ({ ok: false, status: 500, json: async () => ({}) }))
    const useCampaigns = await freshUseCampaigns()
    const { error, campaigns, loading } = useCampaigns()
    await flush()

    expect(error.value).toBe(true)
    expect(campaigns.value).toEqual([])
    expect(loading.value).toBe(false)
  })

  it('a thrown fetch (network failure) → error true, campaigns []', async () => {
    stubFetch(async () => {
      throw new Error('network down')
    })
    const useCampaigns = await freshUseCampaigns()
    const { error, campaigns, loading } = useCampaigns()
    await flush()

    expect(error.value).toBe(true)
    expect(campaigns.value).toEqual([])
    expect(loading.value).toBe(false)
  })
})

describe('useCampaigns — reload', () => {
  it('reload() re-fetches: an initial error recovers to success on retry', async () => {
    // First attempt fails.
    stubFetch(async () => {
      throw new Error('boom')
    })
    const useCampaigns = await freshUseCampaigns()
    const { error, campaigns, loading, reload } = useCampaigns()
    await flush()
    expect(error.value).toBe(true)
    expect(campaigns.value).toEqual([])

    // Swap in a succeeding fetch and retry.
    vi.stubGlobal('fetch', vi.fn(okJson({ campaigns: [{ id: 'z' }] })))
    const p = reload()

    // reload re-enters LOADING synchronously and clears the prior error.
    expect(loading.value).toBe(true)
    expect(error.value).toBe(false)

    await p
    await flush()

    expect(loading.value).toBe(false)
    expect(error.value).toBe(false)
    expect(campaigns.value).toEqual([{ id: 'z' }])
  })

  it('reload() after success can transition success → error', async () => {
    stubFetch(okJson({ campaigns: [{ id: 'a' }] }))
    const useCampaigns = await freshUseCampaigns()
    const { error, campaigns, reload } = useCampaigns()
    await flush()
    expect(campaigns.value).toEqual([{ id: 'a' }])

    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) })))
    await reload()
    await flush()

    expect(error.value).toBe(true)
    expect(campaigns.value).toEqual([])
  })
})
