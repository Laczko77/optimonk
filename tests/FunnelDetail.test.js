// @vitest-environment jsdom
//
// Component tests for FunnelDetail + FunnelStep (Iteration 3). Opts into jsdom
// per-file so the global Vitest env stays `node` (keeps tests/funnel.test.js
// pure). FunnelDetail is presentational and takes a `campaign` prop, so these
// mount it directly with fixtures — no composable mocking needed.
//
// Result lines and counts are tied to the lib (stepConversion/stepDropoffRate/
// stepDropoffAbs + formatPercent/formatCount) rather than hardcoded literals,
// so toFixed-ambiguous values (step 0's 40.3%/59.7%) and host-locale count
// formatting can never silently drift between component and test.
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FunnelDetail from '../src/components/FunnelDetail.vue'
import {
  stepConversion,
  stepDropoffRate,
  stepDropoffAbs,
} from '../src/lib/funnel.js'
import { formatPercent, formatCount } from '../src/lib/format.js'
import campaigns from '../src/data/campaigns.json'

const byId = (id) => campaigns.find((c) => c.id === id)
const camp001 = byId('camp_001')

// ---- helpers -------------------------------------------------------------

const steps = (wrapper) => wrapper.findAll('[data-testid="funnel-step"]')

const stepEl = (wrapper, index) =>
  wrapper.get(`[data-testid="funnel-step"][data-step-index="${index}"]`)

const stepPart = (wrapper, index, testid) =>
  stepEl(wrapper, index).get(`[data-testid="${testid}"]`)

// Mirror FunnelStep's display logic exactly, but source every number from the
// lib so the assertion proves the component consumes the lib (never recomputes)
// and survives toFixed rounding without hardcoding the ambiguous literals.
function expectedResult(step, isLast) {
  const abs = stepDropoffAbs(step)
  const noun = abs === 1 ? 'person' : 'people'
  if (isLast) {
    return `${formatPercent(stepConversion(step))} complete · ${formatCount(abs)} ${noun} didn't complete`
  }
  return `${formatPercent(stepConversion(step))} continue · ${formatPercent(stepDropoffRate(step))} drop off (${formatCount(abs)} ${noun} lost)`
}

const expectedViews = (step) => `${formatCount(step.views)} people`

// ---- test-only fixtures (not in shipped campaigns.json) ------------------

const singleStep = {
  id: 'camp_single',
  name: 'One Step Wonder',
  device: 'mobile',
  steps: [{ name: 'Only step', type: 'teaser', views: 1000, proceeds: 250 }],
}

// A middle step with views:0, proceeds:0 — exercises the zero-views guard on a
// NON-last step (so "continue · drop off" wording applies). proceeds:0 keeps
// "0 people lost" true.
const zeroMiddle = {
  id: 'camp_zero_mid',
  name: 'Zero Middle',
  device: 'desktop',
  steps: [
    { name: 'Entry', type: 'teaser', views: 1000, proceeds: 500 },
    { name: 'Empty middle', type: 'email', views: 0, proceeds: 0 },
    { name: 'End', type: 'conversion', views: 200, proceeds: 100 },
  ],
}

// Every step has views:0, so the bar denominator (max views) is 0 — exercises
// the divide-by-zero guard so every bar renders at width 0 with no NaN.
const allZeroViews = {
  id: 'camp_all_zero',
  name: 'All Zero',
  device: 'tablet',
  steps: [
    { name: 'First', type: 'teaser', views: 0, proceeds: 0 },
    { name: 'Second', type: 'conversion', views: 0, proceeds: 0 },
  ],
}

// Non-last step whose absolute drop-off is exactly 1 (views 10 - proceeds 9).
const singularNonLast = {
  id: 'camp_sing_nl',
  name: 'Singular Non-Last',
  device: 'desktop',
  steps: [
    { name: 'Lose one', type: 'teaser', views: 10, proceeds: 9 },
    { name: 'End', type: 'conversion', views: 9, proceeds: 5 },
  ],
}

// Last step whose absolute drop-off is exactly 1 (views 5 - proceeds 4).
const singularLast = {
  id: 'camp_sing_last',
  name: 'Singular Last',
  device: 'desktop',
  steps: [
    { name: 'Entry', type: 'teaser', views: 100, proceeds: 50 },
    { name: 'Lose one', type: 'conversion', views: 5, proceeds: 4 },
  ],
}

// ==========================================================================
// AC1 — steps render in order with correct indices and view counts
// ==========================================================================
describe('FunnelDetail — AC1: steps render in order (camp_001)', () => {
  it('renders one funnel-step per step, in order, indexed 0..3', () => {
    const wrapper = mount(FunnelDetail, { props: { campaign: camp001 } })
    const els = steps(wrapper)
    expect(els).toHaveLength(4)
    els.forEach((el, i) => {
      expect(el.attributes('data-step-index')).toBe(String(i))
    })
  })

  it('renders the view counts "8,000" / "3,220" / "870" / "720"', () => {
    const wrapper = mount(FunnelDetail, { props: { campaign: camp001 } })
    expect(stepPart(wrapper, 0, 'funnel-step-views').text()).toBe('8,000 people')
    expect(stepPart(wrapper, 1, 'funnel-step-views').text()).toBe('3,220 people')
    expect(stepPart(wrapper, 2, 'funnel-step-views').text()).toBe('870 people')
    expect(stepPart(wrapper, 3, 'funnel-step-views').text()).toBe('720 people')
  })

  it('view counts are lib-tied to formatCount(step.views)', () => {
    const wrapper = mount(FunnelDetail, { props: { campaign: camp001 } })
    camp001.steps.forEach((step, i) => {
      expect(stepPart(wrapper, i, 'funnel-step-views').text()).toBe(expectedViews(step))
    })
  })

  it('renders the step name and raw type pill', () => {
    const wrapper = mount(FunnelDetail, { props: { campaign: camp001 } })
    expect(stepPart(wrapper, 1, 'funnel-step-name').text()).toBe('Email capture')
    expect(stepPart(wrapper, 1, 'funnel-step-type').text()).toBe('email')
  })
})

// ==========================================================================
// AC2 — non-last result lines are lib-tied; email step anchors
// ==========================================================================
describe('FunnelDetail — AC2: non-last result lines (camp_001)', () => {
  it('each non-last result === the lib-built expected string', () => {
    const wrapper = mount(FunnelDetail, { props: { campaign: camp001 } })
    // steps 0,1,2 are non-last in a 4-step campaign
    for (const i of [0, 1, 2]) {
      expect(stepPart(wrapper, i, 'funnel-step-result').text()).toBe(
        expectedResult(camp001.steps[i], false),
      )
    }
  })

  it('the email step (idx 1) anchors at 27.0% continue / 73.0% drop off / 2,350 people lost', () => {
    const wrapper = mount(FunnelDetail, { props: { campaign: camp001 } })
    const result = stepPart(wrapper, 1, 'funnel-step-result').text()
    expect(result).toContain('27.0%')
    expect(result).toContain('73.0%')
    expect(result).toContain('2,350 people lost')
    // exact full line, lib-tied (proves the middle dot separator " · " too)
    expect(result).toBe('27.0% continue · 73.0% drop off (2,350 people lost)')
  })

  it('uses the middle-dot separator "·" with surrounding spaces', () => {
    const wrapper = mount(FunnelDetail, { props: { campaign: camp001 } })
    expect(stepPart(wrapper, 1, 'funnel-step-result').text()).toContain(' · ')
  })
})

// ==========================================================================
// AC3 — last vs non-last wording
// ==========================================================================
describe('FunnelDetail — AC3: last vs non-last wording (camp_001)', () => {
  it('the last step (idx 3) uses completion wording, not continue/drop-off', () => {
    const wrapper = mount(FunnelDetail, { props: { campaign: camp001 } })
    const result = stepPart(wrapper, 3, 'funnel-step-result').text()
    expect(result).toContain('complete')
    expect(result).toContain("64 people didn't complete")
    expect(result).not.toContain('continue')
    expect(result).not.toContain('drop off')
    expect(result).toBe(expectedResult(camp001.steps[3], true))
  })

  it('non-last steps use continue/drop-off wording, never "complete"', () => {
    const wrapper = mount(FunnelDetail, { props: { campaign: camp001 } })
    for (const i of [0, 1, 2]) {
      const result = stepPart(wrapper, i, 'funnel-step-result').text()
      expect(result).toContain('continue')
      expect(result).toContain('drop off')
      expect(result).not.toContain('complete')
    }
  })
})

// ==========================================================================
// AC4 — bar widths are the raw views/denominator proportion (inline style)
// ==========================================================================
describe('FunnelDetail — AC4: bar widths (camp_001, large steps)', () => {
  it('the entry step bar is full width (100%)', () => {
    const wrapper = mount(FunnelDetail, { props: { campaign: camp001 } })
    const bar = stepPart(wrapper, 0, 'funnel-step-bar')
    expect(bar.element.style.width).toBe('100%')
  })

  it('step idx 1 bar is the raw 3220/8000 proportion (40.25%)', () => {
    const wrapper = mount(FunnelDetail, { props: { campaign: camp001 } })
    const bar = stepPart(wrapper, 1, 'funnel-step-bar')
    // identical float expression to the component so rounding can't diverge
    expect(bar.element.style.width).toBe(`${(3220 / 8000) * 100}%`)
  })
})

// ==========================================================================
// AC5 — edge fixtures
// ==========================================================================
describe('FunnelDetail — AC5: single-step campaign', () => {
  it('renders one step, treated as last (completion wording), full-width bar, "1 step" header', () => {
    const wrapper = mount(FunnelDetail, { props: { campaign: singleStep } })

    expect(steps(wrapper)).toHaveLength(1)
    expect(wrapper.get('[data-testid="detail-summary"]').text()).toContain('1 step')
    expect(wrapper.get('[data-testid="detail-summary"]').text()).not.toContain('1 steps')

    // single step is the last step -> completion wording
    const result = stepPart(wrapper, 0, 'funnel-step-result').text()
    expect(result).toBe(expectedResult(singleStep.steps[0], true))
    expect(result).toContain('complete')
    expect(result).not.toContain('continue')

    // the lone step is the denominator -> full-width bar
    expect(stepPart(wrapper, 0, 'funnel-step-bar').element.style.width).toBe('100%')
  })
})

describe('FunnelDetail — AC5: zero-views middle step', () => {
  it('shows 0 people, 0% bar, "0.0% continue · 0.0% drop off (0 people lost)", no NaN, no throw', () => {
    const wrapper = mount(FunnelDetail, { props: { campaign: zeroMiddle } })

    expect(stepPart(wrapper, 1, 'funnel-step-views').text()).toBe('0 people')
    expect(stepPart(wrapper, 1, 'funnel-step-bar').element.style.width).toBe('0%')

    const result = stepPart(wrapper, 1, 'funnel-step-result').text()
    expect(result).toBe('0.0% continue · 0.0% drop off (0 people lost)')
    expect(result).toBe(expectedResult(zeroMiddle.steps[1], false))

    expect(wrapper.get('[data-testid="detail-view"]').text()).not.toContain('NaN')
  })
})

describe('FunnelDetail — AC5: first-step (denominator) zero views', () => {
  it('renders every bar at 0% with no divide-by-zero and no NaN', () => {
    const wrapper = mount(FunnelDetail, { props: { campaign: allZeroViews } })

    for (const el of steps(wrapper)) {
      const idx = el.attributes('data-step-index')
      expect(stepPart(wrapper, idx, 'funnel-step-bar').element.style.width).toBe('0%')
    }
    expect(wrapper.get('[data-testid="detail-view"]').text()).not.toContain('NaN')
  })
})

// ==========================================================================
// AC6 — singular guard
// ==========================================================================
describe('FunnelDetail — AC6: singular "1 person" guard', () => {
  it('non-last step with abs===1 reads "1 person lost"', () => {
    const wrapper = mount(FunnelDetail, { props: { campaign: singularNonLast } })
    const result = stepPart(wrapper, 0, 'funnel-step-result').text()
    expect(result).toContain('1 person lost')
    expect(result).not.toContain('1 people')
  })

  it('last step with abs===1 reads "1 person didn\'t complete"', () => {
    const wrapper = mount(FunnelDetail, { props: { campaign: singularLast } })
    const result = stepPart(wrapper, 1, 'funnel-step-result').text()
    expect(result).toContain("1 person didn't complete")
    expect(result).not.toContain('1 people')
  })
})

// ==========================================================================
// AC7 — back button emits `back` once, no payload (FunnelDetail level)
// ==========================================================================
describe('FunnelDetail — AC7: back control', () => {
  it('emits `back` once with no payload when clicked', async () => {
    const wrapper = mount(FunnelDetail, { props: { campaign: camp001 } })
    await wrapper.get('[data-testid="back-button"]').trigger('click')

    expect(wrapper.emitted('back')).toBeTruthy()
    expect(wrapper.emitted('back')).toHaveLength(1)
    // no payload
    expect(wrapper.emitted('back')[0]).toEqual([])
  })

  it('the back control is a native <button> (keyboard activation is free; not synthesized under jsdom)', () => {
    const wrapper = mount(FunnelDetail, { props: { campaign: camp001 } })
    expect(wrapper.get('[data-testid="back-button"]').element.tagName).toBe('BUTTON')
  })
})

// ==========================================================================
// Scope boundary — Iteration 3 ships uniform styling; no worst-step highlight
// ==========================================================================
describe('FunnelDetail — scope boundary (no Iteration 4 highlight leaks in)', () => {
  it('the Iteration 4 callout slot is reserved but empty, and no worst-step badge is rendered', () => {
    const wrapper = mount(FunnelDetail, { props: { campaign: camp001 } })
    expect(wrapper.get('[data-testid="callout-slot"]').text()).toBe('')
    expect(wrapper.find('[data-testid="worst-step"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="worst-step-callout"]').exists()).toBe(false)
  })
})
