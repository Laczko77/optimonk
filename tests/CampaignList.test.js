// @vitest-environment jsdom
//
// Component tests for CampaignList. Opts into jsdom per-file (global env stays
// `node`). CampaignList sources data from the useCampaigns() composable with no
// props, so we mock that composable to inject fixtures and drive the async state
// machine. The mock reads a mutable `mockState` so each test sets its own
// { campaigns, loading, error } before mounting.
//
// Iteration 7: the list is now fetched from GET /api/campaigns, so CampaignList
// renders one of four MUTUALLY EXCLUSIVE states: loading / error / cards / empty.
// The real fetch lifecycle (loading→success, reload re-fetch, normalization) is
// covered in tests/useCampaigns.test.js; here we verify the UI the composable's
// state drives, including that exactly one state shows at a time.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import dataset from '../src/data/campaigns.json'

const realCampaigns = dataset.campaigns

// mockState must not reference the JSON import inside vi.hoisted (it is hoisted
// above the import and would throw). Seed primitives here; assign data per test.
const { mockState } = vi.hoisted(() => ({
  mockState: { campaigns: [], loading: false, error: false, reload: null },
}))

vi.mock('../src/composables/useCampaigns.js', () => ({
  useCampaigns: () => ({
    campaigns: mockState.campaigns,
    loading: mockState.loading,
    error: mockState.error,
    reload: mockState.reload,
    getCampaignById: (id) => mockState.campaigns.find((c) => c.id === id) ?? null,
  }),
}))

// Imported after the mock is declared (vi.mock is hoisted above imports anyway).
import CampaignList from '../src/components/CampaignList.vue'

const cards = (wrapper) => wrapper.findAll('[data-testid="campaign-card"]')
const has = (wrapper, testid) => wrapper.find(`[data-testid="${testid}"]`).exists()
// Normalize internal whitespace (the error body wraps across template lines).
const squish = (s) => s.replace(/\s+/g, ' ').trim()

// The four mutually-exclusive states, by their container test-id.
const STATE_IDS = ['campaigns-loading', 'campaigns-error', 'empty-state']

// Assert the named state is the ONLY one of the four showing.
function expectOnlyState(wrapper, present) {
  for (const id of STATE_IDS) {
    expect(has(wrapper, id)).toBe(id === present)
  }
  // cards count: present only in the "cards" state (none of the STATE_IDS)
  if (present === null) {
    expect(cards(wrapper).length).toBeGreaterThan(0)
  } else {
    expect(cards(wrapper)).toHaveLength(0)
  }
}

beforeEach(() => {
  mockState.campaigns = []
  mockState.loading = false
  mockState.error = false
  mockState.reload = vi.fn()
})

// ==========================================================================
// State machine — exactly one of loading / error / cards / empty at a time
// ==========================================================================
describe('CampaignList — async state machine (mutually exclusive)', () => {
  it('LOADING: shows the loading placeholder only, with the exact copy', () => {
    mockState.loading = true
    // even if data were present, loading takes precedence
    mockState.campaigns = realCampaigns
    const wrapper = mount(CampaignList)

    const loading = wrapper.get('[data-testid="campaigns-loading"]')
    expect(loading.text()).toBe('Loading campaigns…')
    // no cards, no error, no empty behind the loading message
    expect(cards(wrapper)).toHaveLength(0)
    expect(has(wrapper, 'campaigns-error')).toBe(false)
    expect(has(wrapper, 'empty-state')).toBe(false)
  })

  it('CARDS: success with data shows the card list only (no loading/error/empty)', () => {
    mockState.campaigns = realCampaigns
    const wrapper = mount(CampaignList)

    expect(cards(wrapper)).toHaveLength(3)
    expectOnlyState(wrapper, null)
  })

  it('EMPTY: success with zero campaigns shows the empty state only', () => {
    mockState.campaigns = []
    const wrapper = mount(CampaignList)

    const empty = wrapper.get('[data-testid="empty-state"]')
    expect(empty.text()).toContain('No campaigns yet')
    expect(empty.text()).toContain('There are no campaigns to show right now.')
    expectOnlyState(wrapper, 'empty-state')
  })

  it('ERROR: failed fetch shows the error block only, with exact title + body + retry', () => {
    mockState.error = true
    const wrapper = mount(CampaignList)

    const error = wrapper.get('[data-testid="campaigns-error"]')
    expect(error.text()).toContain("We couldn't load your campaigns")
    expect(squish(error.text())).toContain(
      'Something went wrong while loading your campaigns. Please check your connection and try again.',
    )
    const retry = wrapper.get('[data-testid="campaigns-retry"]')
    expect(retry.text()).toContain('Try again')
    expect(retry.element.tagName).toBe('BUTTON')

    expectOnlyState(wrapper, 'campaigns-error')
  })

  it('ERROR takes precedence over data: error true + data present still shows error only', () => {
    mockState.error = true
    mockState.campaigns = realCampaigns
    const wrapper = mount(CampaignList)
    expectOnlyState(wrapper, 'campaigns-error')
  })
})

// ==========================================================================
// Retry — clicking "Try again" re-runs the fetch via reload()
// ==========================================================================
describe('CampaignList — error retry', () => {
  it('clicking "Try again" calls reload() (which re-enters LOADING in the composable)', async () => {
    mockState.error = true
    const wrapper = mount(CampaignList)

    await wrapper.get('[data-testid="campaigns-retry"]').trigger('click')
    expect(mockState.reload).toHaveBeenCalledTimes(1)
    // The loading re-entry itself is the composable's job and is covered in
    // tests/useCampaigns.test.js (reload sets loading=true synchronously).
  })
})

// ==========================================================================
// Rendering with loaded data (re-anchored to the 3 official campaigns)
// ==========================================================================
describe('CampaignList — rendering with loaded data (A)', () => {
  beforeEach(() => {
    mockState.campaigns = realCampaigns
  })

  it('renders exactly one card per campaign (3 with the official dataset)', () => {
    const wrapper = mount(CampaignList)
    expect(cards(wrapper)).toHaveLength(3)
  })

  it('renders the page header copy', () => {
    const wrapper = mount(CampaignList)
    const header = wrapper.get('header').text()
    expect(header).toContain('Campaigns')
    expect(header).toContain('See how each popup campaign is converting.')
  })

  it('renders each campaign name on its own card', () => {
    const wrapper = mount(CampaignList)
    const names = wrapper
      .findAll('[data-testid="campaign-card-name"]')
      .map((n) => n.text())
    expect(names).toEqual(realCampaigns.map((c) => c.name))
  })
})

describe('CampaignList — selection re-emit (C2)', () => {
  it('re-emits `select` with the clicked campaign id unchanged', async () => {
    mockState.campaigns = realCampaigns
    const wrapper = mount(CampaignList)

    // Click the card for camp_003 specifically and assert the id flows through.
    const target = wrapper.get('[data-testid="campaign-card"][data-campaign-id="camp_003"]')
    await target.trigger('click')

    expect(wrapper.emitted('select')).toBeTruthy()
    expect(wrapper.emitted('select')).toHaveLength(1)
    expect(wrapper.emitted('select')[0]).toEqual(['camp_003'])
  })
})
