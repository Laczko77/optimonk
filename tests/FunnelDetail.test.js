// @vitest-environment jsdom
//
// Component tests for FunnelDetail + FunnelStep (Iteration 3, re-anchored for the
// Iteration 7 official dataset). Opts into jsdom per-file so the global Vitest env
// stays `node` (keeps tests/funnel.test.js pure). FunnelDetail is presentational
// and takes a `campaign` prop, so these mount it directly with fixtures — no
// composable mocking needed.
//
// Result lines and counts are tied to the lib (stepConversion/stepDropoffRate/
// stepDropoffAbs + formatPercent/formatCount) rather than hardcoded literals, so
// rounding and host-locale count formatting can never silently drift between
// component and test.
//
// Official camp_001 is now 3 steps: Teaser – 10% off (10000→3200), Email capture
// (3200→850), Success & coupon (850→820). Rate-worst is the email step (idx 1);
// absolute-worst is the teaser (idx 0) — they DIFFER, so the secondary note shows.
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FunnelDetail from '../src/components/FunnelDetail.vue'
import {
  stepConversion,
  stepDropoffRate,
  stepDropoffAbs,
  worstStep,
  worstStepByAbsolute,
} from '../src/lib/funnel.js'
import { formatPercent, formatCount } from '../src/lib/format.js'
import dataset from '../src/data/campaigns.json'

const campaigns = dataset.campaigns
const byId = (id) => campaigns.find((c) => c.id === id)
const camp001 = byId('camp_001')
// camp_002 is the "agree" fixture: rate-worst === absolute-worst (idx 0), so the
// detail callout shows NO secondary note. Foil to camp_001 where they differ.
const camp002 = byId('camp_002')

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

// Iteration 4 callout copy, mirrored from FunnelDetail's templates but sourced
// entirely from the lib (worstStep / worstStepByAbsolute + formatPercent /
// formatCount) so the component can never silently diverge from the math.
// Uses the exact em-dash "—" (U+2014) the component renders as the separator.
const peopleNoun = (count) => (count === 1 ? 'person' : 'people')

function expectedPrimary(campaign) {
  const w = worstStep(campaign)
  return (
    `Biggest drop-off is at Step ${w.index + 1} — ${w.step.name}: ` +
    `${formatPercent(w.dropoffRate)} of people leave here ` +
    `(${formatCount(w.dropoffAbs)} ${peopleNoun(w.dropoffAbs)}), ` +
    `and only ${formatPercent(w.conversion)} continue.`
  )
}

function expectedSecondary(campaign) {
  const a = worstStepByAbsolute(campaign)
  const w = worstStep(campaign)
  return (
    `Heads up: Step ${a.index + 1} — ${a.step.name} loses the most people overall ` +
    `(${formatCount(a.dropoffAbs)}), but Step ${w.index + 1} loses the largest share.`
  )
}

const callout = (wrapper) => wrapper.find('[data-testid="worst-step-callout"]')
const calloutNote = (wrapper) =>
  wrapper.find('[data-testid="worst-step-callout-note"]')
const worstFlags = (wrapper) => wrapper.findAll('[data-is-worst="true"]')

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

// Empty funnel — no steps at all. worstStep -> null, so highlightActive is
// false: no callout, no worst flag, and (Iteration 3) no steps render either.
const emptySteps = {
  id: 'camp_empty',
  name: 'No Steps',
  device: 'mobile',
  steps: [],
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
  it('renders one funnel-step per step, in order, indexed 0..2', () => {
    const wrapper = mount(FunnelDetail, { props: { campaign: camp001 } })
    const els = steps(wrapper)
    expect(els).toHaveLength(3)
    els.forEach((el, i) => {
      expect(el.attributes('data-step-index')).toBe(String(i))
    })
  })

  it('renders the view counts "10,000" / "3,200" / "850"', () => {
    const wrapper = mount(FunnelDetail, { props: { campaign: camp001 } })
    expect(stepPart(wrapper, 0, 'funnel-step-views').text()).toBe('10,000 people')
    expect(stepPart(wrapper, 1, 'funnel-step-views').text()).toBe('3,200 people')
    expect(stepPart(wrapper, 2, 'funnel-step-views').text()).toBe('850 people')
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
    // steps 0,1 are non-last in a 3-step campaign
    for (const i of [0, 1]) {
      expect(stepPart(wrapper, i, 'funnel-step-result').text()).toBe(
        expectedResult(camp001.steps[i], false),
      )
    }
  })

  it('the email step (idx 1) anchors at 26.6% continue / 73.4% drop off / 2,350 people lost', () => {
    const wrapper = mount(FunnelDetail, { props: { campaign: camp001 } })
    const result = stepPart(wrapper, 1, 'funnel-step-result').text()
    expect(result).toContain('26.6%')
    expect(result).toContain('73.4%')
    expect(result).toContain('2,350 people lost')
    // exact full line, lib-tied (proves the middle dot separator " · " too)
    expect(result).toBe('26.6% continue · 73.4% drop off (2,350 people lost)')
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
  it('the last step (idx 2, Success & coupon) uses completion wording, not continue/drop-off', () => {
    const wrapper = mount(FunnelDetail, { props: { campaign: camp001 } })
    const result = stepPart(wrapper, 2, 'funnel-step-result').text()
    expect(result).toContain('complete')
    expect(result).toContain("30 people didn't complete")
    expect(result).not.toContain('continue')
    expect(result).not.toContain('drop off')
    expect(result).toBe(expectedResult(camp001.steps[2], true))
  })

  it('non-last steps use continue/drop-off wording, never "complete"', () => {
    const wrapper = mount(FunnelDetail, { props: { campaign: camp001 } })
    for (const i of [0, 1]) {
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

  it('step idx 1 bar is the raw 3200/10000 proportion (32%)', () => {
    const wrapper = mount(FunnelDetail, { props: { campaign: camp001 } })
    const bar = stepPart(wrapper, 1, 'funnel-step-bar')
    // identical float expression to the component so rounding can't diverge
    expect(bar.element.style.width).toBe(`${(3200 / 10000) * 100}%`)
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
// Iteration 4 — worst-step highlight: the badge marks exactly one step
// ==========================================================================
describe('FunnelDetail — Iter4: worst-step badge marks exactly one step (camp_001)', () => {
  it('exactly one element carries data-is-worst="true", at the rate-worst index (1)', () => {
    const wrapper = mount(FunnelDetail, { props: { campaign: camp001 } })
    const flagged = worstFlags(wrapper)
    expect(flagged).toHaveLength(1)
    expect(flagged[0].attributes('data-step-index')).toBe(
      String(worstStep(camp001).index),
    )
    expect(flagged[0].attributes('data-step-index')).toBe('1')
  })

  it('the worst-step badge lives inside the worst step only (idx 1), absent on the others', () => {
    const wrapper = mount(FunnelDetail, { props: { campaign: camp001 } })
    // present on the worst step
    expect(stepEl(wrapper, 1).find('[data-testid="worst-step-badge"]').exists()).toBe(true)
    // absent on every other step
    for (const i of [0, 2]) {
      expect(stepEl(wrapper, i).find('[data-testid="worst-step-badge"]').exists()).toBe(false)
    }
    // and exactly one badge in the whole view
    expect(wrapper.findAll('[data-testid="worst-step-badge"]')).toHaveLength(1)
  })
})

// ==========================================================================
// Iteration 4 — callout copy (primary + secondary note), lib-tied
// ==========================================================================
describe('FunnelDetail — Iter4: worst-step callout (camp_001, note present)', () => {
  it('renders the callout inside callout-slot, with role="status"', () => {
    const wrapper = mount(FunnelDetail, { props: { campaign: camp001 } })
    const slot = wrapper.get('[data-testid="callout-slot"]')
    expect(slot.find('[data-testid="worst-step-callout"]').exists()).toBe(true)
    expect(callout(wrapper).attributes('role')).toBe('status')
  })

  it('primary copy contains the lib-built worst-step sentence (Step 2 — Email capture, 73.4%, 2,350, 26.6%)', () => {
    const wrapper = mount(FunnelDetail, { props: { campaign: camp001 } })
    const text = callout(wrapper).text()
    // toContain (not ===): the container also holds the decorative aria-hidden ⚠
    // glyph and the sibling note <p>, neither of which belong to the primary copy.
    expect(text).toContain(expectedPrimary(camp001))
    // anchor the load-bearing numbers explicitly
    expect(text).toContain('Step 2 — Email capture')
    expect(text).toContain('73.4%')
    expect(text).toContain('2,350')
    expect(text).toContain('26.6%')
  })

  it('secondary note is present and equals the lib-built abs-worst sentence (Step 1 — Teaser, 6,800)', () => {
    const wrapper = mount(FunnelDetail, { props: { campaign: camp001 } })
    const note = calloutNote(wrapper)
    expect(note.exists()).toBe(true)
    // the note element holds clean copy (no glyph) -> strict equality is correct
    expect(note.text()).toBe(expectedSecondary(camp001))
    // name sourced from data (its en-dash differs from the em-dash separator)
    expect(note.text()).toContain(`Step 1 — ${camp001.steps[0].name}`)
    expect(note.text()).toContain('6,800')
  })
})

describe('FunnelDetail — Iter4: agree fixture (camp_002, note absent)', () => {
  it('renders the callout but NO secondary note (rate-worst === absolute-worst)', () => {
    const wrapper = mount(FunnelDetail, { props: { campaign: camp002 } })
    expect(callout(wrapper).exists()).toBe(true)
    expect(callout(wrapper).text()).toContain(expectedPrimary(camp002))
    // note absent because worstStep.index === worstStepByAbsolute.index
    expect(calloutNote(wrapper).exists()).toBe(false)
  })

  it('the badge still marks exactly one step, at the (shared) worst index 0', () => {
    const wrapper = mount(FunnelDetail, { props: { campaign: camp002 } })
    const flagged = worstFlags(wrapper)
    expect(flagged).toHaveLength(1)
    expect(flagged[0].attributes('data-step-index')).toBe(String(worstStep(camp002).index))
    expect(flagged[0].attributes('data-step-index')).toBe('0')
    expect(wrapper.findAll('[data-testid="worst-step-badge"]')).toHaveLength(1)
  })
})

// ==========================================================================
// Iteration 4 — suppression: single-step funnel gets no highlight at all.
// This is where the formerly-reserved (now active) callout-slot must be EMPTY.
// ==========================================================================
describe('FunnelDetail — Iter4: highlight suppressed for single-step funnel', () => {
  it('no callout, no note, no worst flag, no badge; callout-slot is empty', () => {
    const wrapper = mount(FunnelDetail, { props: { campaign: singleStep } })
    // callout-slot persists as a wrapper but renders nothing inside
    expect(wrapper.get('[data-testid="callout-slot"]').text()).toBe('')
    expect(callout(wrapper).exists()).toBe(false)
    expect(calloutNote(wrapper).exists()).toBe(false)
    expect(worstFlags(wrapper)).toHaveLength(0)
    expect(wrapper.find('[data-testid="worst-step-badge"]').exists()).toBe(false)
  })

  it('the plain Iteration-3 view still renders the step (suppression is additive-only)', () => {
    const wrapper = mount(FunnelDetail, { props: { campaign: singleStep } })
    expect(steps(wrapper)).toHaveLength(1)
    expect(stepPart(wrapper, 0, 'funnel-step-result').text()).toBe(
      expectedResult(singleStep.steps[0], true),
    )
  })
})

// ==========================================================================
// Iteration 4 — edge fixtures
// ==========================================================================
describe('FunnelDetail — Iter4: edge fixtures', () => {
  it('2-step all-zero-views funnel renders the callout with no NaN/Infinity and no throw', () => {
    // highlightActive = steps.length > 1 && worstStep !== null -> true here.
    const wrapper = mount(FunnelDetail, { props: { campaign: allZeroViews } })
    expect(callout(wrapper).exists()).toBe(true)
    const text = wrapper.get('[data-testid="detail-view"]').text()
    expect(text).not.toContain('NaN')
    expect(text).not.toContain('Infinity')
    // both steps drop 0 people at rate 0 -> worst is idx 0, abs-worst also idx 0
    expect(worstFlags(wrapper)).toHaveLength(1)
    expect(worstFlags(wrapper)[0].attributes('data-step-index')).toBe('0')
    expect(calloutNote(wrapper).exists()).toBe(false)
  })

  it('empty-steps funnel renders no callout and no worst flag (worstStep null)', () => {
    const wrapper = mount(FunnelDetail, { props: { campaign: emptySteps } })
    expect(callout(wrapper).exists()).toBe(false)
    expect(calloutNote(wrapper).exists()).toBe(false)
    expect(worstFlags(wrapper)).toHaveLength(0)
    expect(wrapper.get('[data-testid="callout-slot"]').text()).toBe('')
    expect(steps(wrapper)).toHaveLength(0)
  })
})

// ==========================================================================
// Iteration 4 — regression: Iteration-3 behaviour is unchanged on non-worst
// steps and the existing bar-width math still holds with the highlight active.
// ==========================================================================
describe('FunnelDetail — Iter4 regression: Iteration-3 lines & bars intact (camp_001)', () => {
  it('non-worst steps (idx 0, 2) still show their lib-tied Iteration-3 result lines', () => {
    const wrapper = mount(FunnelDetail, { props: { campaign: camp001 } })
    expect(stepPart(wrapper, 0, 'funnel-step-result').text()).toBe(
      expectedResult(camp001.steps[0], false),
    )
    expect(stepPart(wrapper, 2, 'funnel-step-result').text()).toBe(
      expectedResult(camp001.steps[2], true),
    )
  })

  it('bar widths are unchanged by the highlight (entry 100%, idx 1 raw 3200/10000)', () => {
    const wrapper = mount(FunnelDetail, { props: { campaign: camp001 } })
    expect(stepPart(wrapper, 0, 'funnel-step-bar').element.style.width).toBe('100%')
    expect(stepPart(wrapper, 1, 'funnel-step-bar').element.style.width).toBe(
      `${(3200 / 10000) * 100}%`,
    )
  })
})
