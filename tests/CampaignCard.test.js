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
import campaigns from '../src/data/campaigns.json'

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

  it('renders the device capitalized', () => {
    // desktop -> Desktop, mobile -> Mobile, tablet -> Tablet
    expect(
      text(mount(CampaignCard, { props: { campaign: byId('camp_001') } }), 'campaign-card-device'),
    ).toBe('Desktop')
    expect(
      text(mount(CampaignCard, { props: { campaign: byId('camp_002') } }), 'campaign-card-device'),
    ).toBe('Mobile')
    expect(
      text(mount(CampaignCard, { props: { campaign: byId('camp_003') } }), 'campaign-card-device'),
    ).toBe('Tablet')
  })

  it('renders the plural step count for a 4-step campaign', () => {
    const wrapper = mount(CampaignCard, { props: { campaign: byId('camp_001') } })
    expect(text(wrapper, 'campaign-card-steps')).toBe('4 steps')
  })

  it('renders the singular "1 step" label for a single-step campaign', () => {
    const wrapper = mount(CampaignCard, { props: { campaign: singleStepCampaign } })
    expect(text(wrapper, 'campaign-card-steps')).toBe('1 step')
  })
})

describe('CampaignCard — conversion is lib-tied (B)', () => {
  it('B1: camp_001 displays the hardcoded literal "8.2%"', () => {
    const wrapper = mount(CampaignCard, { props: { campaign: byId('camp_001') } })
    expect(text(wrapper, 'campaign-card-conversion')).toBe('8.2%')
  })

  it('B2: each card shows formatPercent(overallConversion(campaign)) — consumes the lib, never recomputes', () => {
    for (const campaign of campaigns) {
      const wrapper = mount(CampaignCard, { props: { campaign } })
      const expected = formatPercent(overallConversion(campaign))
      expect(text(wrapper, 'campaign-card-conversion')).toBe(expected)
    }
  })

  it('B3: camp_004 rounds to "6.2%" (400/6500 = 6.15.. -> one decimal)', () => {
    const wrapper = mount(CampaignCard, { props: { campaign: byId('camp_004') } })
    expect(text(wrapper, 'campaign-card-conversion')).toBe('6.2%')
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
