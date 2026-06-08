// @vitest-environment jsdom
//
// Component tests for Insights.vue (Iteration 5).
//
// NOTE ON FILENAME: this should ideally be `tests/Insights.test.js`, but on a
// case-insensitive filesystem (Windows) that path collides with the unit suite
// `tests/insights.test.js` (lib is `insights.js`, component is `Insights.vue` —
// same basename, differing only in case). To keep both suites as distinct files
// it lives at `InsightsPanel.test.js`. See qa memory.
//
// Opts into jsdom per-file so the global Vitest env stays `node` (keeps the pure
// suites pure). Insights is a DUMB panel: it calls getInsights(campaign) once and
// lays out whatever comes back. So these tests import the real getInsights and
// assert the rendered (id, severity) sequence equals getInsights(fixture)
// element-for-element — proving the panel computes no rules of its own and never
// reorders. We do NOT assert Tailwind colour classes or pixels, and we do NOT
// re-test funnel/insight math here.
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Insights from '../src/components/Insights.vue'
import { getInsights } from '../src/lib/insights.js'
import dataset from '../src/data/campaigns.json'

// Iteration 7: official `{ campaigns: [...] }` dataset shape.
const campaigns = dataset.campaigns

const byId = (id) => campaigns.find((c) => c.id === id)
const camp001 = byId('camp_001') // 3 insights: crit, warn, positive
const camp003 = byId('camp_003') // 3 insights: crit, warn, warn (C-strong capped out)

// A campaign that fires no rule → empty state (closing conv 0.80, overall 8%).
const healthyCampaign = {
  id: 'healthy',
  name: 'Healthy Funnel',
  steps: [
    { name: 'Entry', type: 'engagement', views: 1000, proceeds: 100 },
    { name: 'Done', type: 'conversion', views: 100, proceeds: 80 },
  ],
}

const items = (wrapper) => wrapper.findAll('[data-testid="insight-item"]')

// Map the rendered items to their declared (id, severity) — the panel's contract.
const renderedSequence = (wrapper) =>
  items(wrapper).map((el) => ({
    id: el.attributes('data-insight-id'),
    severity: el.attributes('data-severity'),
  }))

describe('Insights.vue — panel + dumb-rendering contract', () => {
  it('always renders the insights-panel wrapper', () => {
    const wrapper = mount(Insights, { props: { campaign: camp001 } })
    expect(wrapper.find('[data-testid="insights-panel"]').exists()).toBe(true)
  })

  it('camp_001: renders exactly 3 insight-items matching getInsights element-for-element', () => {
    const wrapper = mount(Insights, { props: { campaign: camp001 } })
    const expected = getInsights(camp001).map((i) => ({ id: i.id, severity: i.severity }))
    expect(items(wrapper)).toHaveLength(3)
    expect(renderedSequence(wrapper)).toEqual(expected)
  })

  it('dumb-panel proof: rendered (id,severity) sequence === getInsights(fixture) mapped (camp_003)', () => {
    const wrapper = mount(Insights, { props: { campaign: camp003 } })
    const expected = getInsights(camp003).map((i) => ({ id: i.id, severity: i.severity }))
    expect(renderedSequence(wrapper)).toEqual(expected)
  })

  it('renders each insight title and text from the lib (no recomputed copy)', () => {
    const wrapper = mount(Insights, { props: { campaign: camp001 } })
    getInsights(camp001).forEach((insight, idx) => {
      expect(items(wrapper)[idx].text()).toContain(insight.title)
      expect(items(wrapper)[idx].text()).toContain(insight.text)
    })
  })
})

describe('Insights.vue — empty state', () => {
  it('healthy campaign → insights-empty with EXACT copy and zero insight-items', () => {
    const wrapper = mount(Insights, { props: { campaign: healthyCampaign } })
    expect(getInsights(healthyCampaign)).toEqual([]) // guard: fixture really is empty
    expect(items(wrapper)).toHaveLength(0)
    const empty = wrapper.find('[data-testid="insights-empty"]')
    expect(empty.exists()).toBe(true)
    expect(empty.text()).toContain('Nem találtunk komoly problémát')
    expect(empty.text()).toContain(
      'Ez a tölcsér minden lépésében egészségesnek tűnik — jelenleg semmi sem tűnik problémásnak.'
    )
  })

  it('single-step campaign → empty state, panel still present, no throw', () => {
    const single = {
      id: 's',
      name: 'Single',
      steps: [{ name: 'Only', type: 'teaser', views: 1000, proceeds: 100 }],
    }
    const wrapper = mount(Insights, { props: { campaign: single } })
    expect(wrapper.find('[data-testid="insights-panel"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="insights-empty"]').exists()).toBe(true)
    expect(items(wrapper)).toHaveLength(0)
  })
})

describe('Insights.vue — severity is distinguishable without colour', () => {
  it('positive insights show ✓, non-positive insights show 💡 (text content, not classes)', () => {
    const wrapper = mount(Insights, { props: { campaign: camp001 } })
    const rendered = getInsights(camp001)
    items(wrapper).forEach((el, idx) => {
      const expectedIcon = rendered[idx].severity === 'positive' ? '✓' : '💡'
      expect(el.text()).toContain(expectedIcon)
    })
    // Sanity: camp_001 has at least one of each so the assertion is meaningful.
    expect(rendered.some((i) => i.severity === 'positive')).toBe(true)
    expect(rendered.some((i) => i.severity !== 'positive')).toBe(true)
  })

  it('empty state uses the calm ✓ marker, not a 💡 alert', () => {
    const wrapper = mount(Insights, { props: { campaign: healthyCampaign } })
    const empty = wrapper.find('[data-testid="insights-empty"]')
    expect(empty.text()).toContain('✓')
    expect(empty.text()).not.toContain('💡')
  })
})

describe('Insights.vue — edge fixtures render without throwing or leaking NaN/Infinity', () => {
  const edge = [
    { id: 'empty-steps', name: 'Empty', steps: [] },
    {
      id: 'zero-views',
      name: 'Zero views',
      steps: [
        { name: 'a', type: 'teaser', views: 0, proceeds: 0 },
        { name: 'b', type: 'conversion', views: 0, proceeds: 0 },
      ],
    },
    {
      id: 'zero-capture',
      name: 'Zero capture',
      steps: [
        { name: 'a', type: 'teaser', views: 1000, proceeds: 900 },
        { name: 'b', type: 'email', views: 0, proceeds: 0 },
      ],
    },
  ]

  it.each(edge)('mounts $id without throwing and renders no NaN/Infinity text', (campaign) => {
    const wrapper = mount(Insights, { props: { campaign } })
    expect(wrapper.find('[data-testid="insights-panel"]').exists()).toBe(true)
    expect(wrapper.text()).not.toMatch(/NaN|Infinity/)
  })
})
