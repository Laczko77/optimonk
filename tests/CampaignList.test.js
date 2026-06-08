// @vitest-environment jsdom
//
// Component tests for CampaignList. Opts into jsdom per-file (global env stays
// `node`). CampaignList sources data from the useCampaigns() composable with no
// props, so we mock that composable to inject fixtures (shipped data, empty,
// custom). The mock reads a mutable `mockState` so each test can set its own
// dataset before mounting.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import realCampaigns from '../src/data/campaigns.json'

const { mockState } = vi.hoisted(() => ({ mockState: { campaigns: [] } }))

vi.mock('../src/composables/useCampaigns.js', () => ({
  useCampaigns: () => ({
    campaigns: mockState.campaigns,
    getCampaignById: (id) => mockState.campaigns.find((c) => c.id === id) ?? null,
  }),
}))

// Imported after the mock is declared (vi.mock is hoisted above imports anyway).
import CampaignList from '../src/components/CampaignList.vue'

const cards = (wrapper) => wrapper.findAll('[data-testid="campaign-card"]')

beforeEach(() => {
  mockState.campaigns = []
})

describe('CampaignList — rendering with shipped data (A)', () => {
  beforeEach(() => {
    mockState.campaigns = realCampaigns
  })

  it('renders exactly one card per campaign (4 with shipped data)', () => {
    const wrapper = mount(CampaignList)
    expect(cards(wrapper)).toHaveLength(4)
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

describe('CampaignList — empty state (D)', () => {
  it('renders the empty state, no cards, and does not throw when there are no campaigns', () => {
    mockState.campaigns = []
    const wrapper = mount(CampaignList)

    expect(cards(wrapper)).toHaveLength(0)

    const empty = wrapper.get('[data-testid="empty-state"]')
    expect(empty.text()).toContain('No campaigns yet')
    expect(empty.text()).toContain('There are no campaigns to show right now.')
  })
})
