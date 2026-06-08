// @vitest-environment jsdom
//
// Component tests for CampaignCard. Opts into jsdom per-file so the global
// Vitest env stays `node` (keeps tests/funnel.test.js pure). The card is a
// presentational component that takes a `campaign` prop, so these mount it
// directly with fixtures — no composable mocking needed.
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CampaignCard from '../src/components/CampaignCard.vue'
import { overallConversion } from '../src/lib/funnel.js'
import { formatPercent } from '../src/lib/format.js'
import dataset from '../src/data/campaigns.json'

// Iteration 7: official `{ campaigns: [...] }` dataset shape.
const campaigns = dataset.campaigns

const byId = (id) => campaigns.find((c) => c.id === id)
const text = (wrapper, testid) =>
  wrapper.get(`[data-testid="${testid}"]`).text()

// A single-step fixture to exercise the "1 step" singular label. This shape is
// not present in campaigns.json (test-only, per the design spec).
const singleStepCampaign = {
  id: 'camp_single',
  name: 'One Step Wonder',
  device: 'mobile',
  steps: [{ name: 'Only step', type: 'teaser', views: 1000, proceeds: 250 }],
}

describe('CampaignCard — content (A)', () => {
  it('renders the campaign name', () => {
    const wrapper = mount(CampaignCard, { props: { campaign: byId('camp_001') } })
    expect(text(wrapper, 'campaign-card-name')).toBe('Welcome Discount Popup')
  })

  it('renders the device label (Hungarian DEVICE_LABELS map)', () => {
    // Official dataset: camp_001/002 are desktop, camp_003 is mobile. The raw
    // JSON value stays "desktop"/"mobile"; the component maps it to Hungarian.
    expect(
      text(mount(CampaignCard, { props: { campaign: byId('camp_001') } }), 'campaign-card-device'),
    ).toBe('Asztali')
    expect(
      text(mount(CampaignCard, { props: { campaign: byId('camp_002') } }), 'campaign-card-device'),
    ).toBe('Asztali')
    expect(
      text(mount(CampaignCard, { props: { campaign: byId('camp_003') } }), 'campaign-card-device'),
    ).toBe('Mobil')
  })

  it('renders the step count for a 3-step campaign', () => {
    const wrapper = mount(CampaignCard, { props: { campaign: byId('camp_001') } })
    expect(text(wrapper, 'campaign-card-steps')).toBe('3 lépés')
  })

  it('renders the "1 lépés" label for a single-step campaign', () => {
    const wrapper = mount(CampaignCard, { props: { campaign: singleStepCampaign } })
    expect(text(wrapper, 'campaign-card-steps')).toBe('1 lépés')
  })
})

describe('CampaignCard — conversion is lib-tied (B)', () => {
  it('B1: camp_001 displays the hardcoded literal "8.2%"', () => {
    const wrapper = mount(CampaignCard, { props: { campaign: byId('camp_001') } })
    expect(text(wrapper, 'campaign-card-conversion')).toBe('8,2%')
  })

  it('B2: each card shows formatPercent(overallConversion(campaign)) — consumes the lib, never recomputes', () => {
    for (const campaign of campaigns) {
      const wrapper = mount(CampaignCard, { props: { campaign } })
      const expected = formatPercent(overallConversion(campaign))
      expect(text(wrapper, 'campaign-card-conversion')).toBe(expected)
    }
  })

  it('B3: camp_002 rounds to "14.7%" (1100/7500 = 14.66.. -> one decimal)', () => {
    const wrapper = mount(CampaignCard, { props: { campaign: byId('camp_002') } })
    expect(text(wrapper, 'campaign-card-conversion')).toBe('14,7%')
  })

  it('B4: camp_003 rounds to "2.2%" (260/12000 = 2.16.. -> one decimal)', () => {
    const wrapper = mount(CampaignCard, { props: { campaign: byId('camp_003') } })
    expect(text(wrapper, 'campaign-card-conversion')).toBe('2,2%')
  })
})

describe('CampaignCard — selection (C1)', () => {
  it('emits `select` with the campaign id when the card is clicked', async () => {
    const wrapper = mount(CampaignCard, { props: { campaign: byId('camp_002') } })
    await wrapper.get('[data-testid="campaign-card"]').trigger('click')

    expect(wrapper.emitted('select')).toBeTruthy()
    expect(wrapper.emitted('select')).toHaveLength(1)
    // Payload is the id string, not the whole campaign object.
    expect(wrapper.emitted('select')[0]).toEqual(['camp_002'])
  })
})

describe('CampaignCard — accessibility (E)', () => {
  it('E1: the card root is a native <button> element', () => {
    const wrapper = mount(CampaignCard, { props: { campaign: byId('camp_001') } })
    const card = wrapper.get('[data-testid="campaign-card"]')
    expect(card.element.tagName).toBe('BUTTON')
  })

  it('E2: the accessible name contains both the campaign name and its conversion', () => {
    const campaign = byId('camp_001')
    const wrapper = mount(CampaignCard, { props: { campaign } })
    const ariaLabel = wrapper.get('[data-testid="campaign-card"]').attributes('aria-label')
    expect(ariaLabel).toContain(campaign.name)
    expect(ariaLabel).toContain(formatPercent(overallConversion(campaign)))
  })
})
