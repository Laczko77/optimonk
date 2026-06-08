// @vitest-environment jsdom
//
// App-level selection/navigation tests (C3). Opts into jsdom per-file. App and
// CampaignList both source data from useCampaigns(); mocking it once here feeds
// the loaded dataset to both so getCampaignById resolves the selected card.
//
// Iteration 7: useCampaigns is now async (loading/error/reload). We mock it in
// its SETTLED-success state (loading false, error false, data present) so this
// suite proves the navigation contract against async-loaded data without coupling
// to fetch timing. The real loading→success lifecycle is covered in
// tests/useCampaigns.test.js; the loading/error/empty UI in tests/CampaignList.test.js.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import dataset from '../src/data/campaigns.json'

// mockState must not reference the JSON import here: vi.hoisted runs before the
// imports above are initialized. Seed it in beforeEach instead.
const { mockState } = vi.hoisted(() => ({ mockState: { campaigns: [] } }))

vi.mock('../src/composables/useCampaigns.js', () => ({
  useCampaigns: () => ({
    campaigns: mockState.campaigns,
    loading: false,
    error: false,
    reload: () => {},
    getCampaignById: (id) => mockState.campaigns.find((c) => c.id === id) ?? null,
  }),
}))

import App from '../src/App.vue'

const realCampaigns = dataset.campaigns

beforeEach(() => {
  mockState.campaigns = realCampaigns
})

describe('App — selection/navigation (C3)', () => {
  it('shows the list initially, opens the matching detail-view on card click, and returns on back', async () => {
    const wrapper = mount(App)

    // Initial state: list visible, no detail view.
    expect(wrapper.find('[data-testid="campaign-list"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="detail-view"]').exists()).toBe(false)

    // Click a specific card.
    const card = wrapper.get('[data-testid="campaign-card"][data-campaign-id="camp_002"]')
    await card.trigger('click')

    // Detail view for that exact id is shown; the list is hidden.
    const detail = wrapper.get('[data-testid="detail-view"]')
    expect(detail.attributes('data-campaign-id')).toBe('camp_002')
    expect(wrapper.find('[data-testid="campaign-list"]').exists()).toBe(false)

    // Back returns to the list and clears the detail view.
    await wrapper.get('[data-testid="back-button"]').trigger('click')
    expect(wrapper.find('[data-testid="campaign-list"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="detail-view"]').exists()).toBe(false)
  })

  it('opens a different campaign by id, proving selection is not hardcoded', async () => {
    const wrapper = mount(App)

    const card = wrapper.get('[data-testid="campaign-card"][data-campaign-id="camp_003"]')
    await card.trigger('click')

    expect(wrapper.get('[data-testid="detail-view"]').attributes('data-campaign-id')).toBe('camp_003')
  })
})
