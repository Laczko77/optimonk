import { describe, it, expect } from 'vitest'
import {
  stepConversion,
  stepDropoffRate,
  stepDropoffAbs,
  overallConversion,
  worstStep,
  worstStepByAbsolute,
} from '../src/lib/funnel.js'
import dataset from '../src/data/campaigns.json'

// Iteration 7: campaigns.json is now the official `{ campaigns: [...] }` shape;
// the array lives under `.campaigns`. The pure math here is unchanged.
const campaigns = dataset.campaigns

// Helper: pull a campaign from the real dataset by id.
const byId = (id) => campaigns.find((c) => c.id === id)
const camp001 = byId('camp_001')
// camp_002 is an "agree" fixture: its rate-worst and absolute-worst steps are
// the SAME step (idx 0). It is the foil to camp_001, where they differ.
const camp002 = byId('camp_002')

describe('stepConversion', () => {
  it('returns proceeds / views for a normal step', () => {
    expect(stepConversion({ views: 8000, proceeds: 3220 })).toBeCloseTo(0.4025, 10)
  })

  it('returns 1 when everyone proceeds', () => {
    expect(stepConversion({ views: 500, proceeds: 500 })).toBe(1)
  })

  it('returns 0 when nobody proceeds', () => {
    expect(stepConversion({ views: 500, proceeds: 0 })).toBe(0)
  })

  it('zero-views guard: returns 0 (no divide-by-zero, no NaN)', () => {
    const r = stepConversion({ views: 0, proceeds: 0 })
    expect(r).toBe(0)
    expect(Number.isNaN(r)).toBe(false)
  })

  it('matches the published camp_001 email-step conversion (~0.27)', () => {
    // Email capture is index 1: 870 / 3220.
    expect(stepConversion(camp001.steps[1])).toBeCloseTo(0.27, 2)
  })
})

describe('stepDropoffRate', () => {
  it('returns 1 - proceeds / views for a normal step', () => {
    expect(stepDropoffRate({ views: 8000, proceeds: 3220 })).toBeCloseTo(0.5975, 10)
  })

  it('returns 0 when everyone proceeds (no drop-off)', () => {
    expect(stepDropoffRate({ views: 500, proceeds: 500 })).toBe(0)
  })

  it('returns 1 when nobody proceeds', () => {
    expect(stepDropoffRate({ views: 500, proceeds: 0 })).toBe(1)
  })

  it('zero-views guard: returns 0, NOT 1 (and never NaN)', () => {
    const r = stepDropoffRate({ views: 0, proceeds: 0 })
    expect(r).toBe(0)
    expect(Number.isNaN(r)).toBe(false)
  })

  it('matches the published camp_001 email-step drop-off rate (~0.73)', () => {
    expect(stepDropoffRate(camp001.steps[1])).toBeCloseTo(0.73, 2)
  })

  it('conversion + drop-off rate sum to 1 for a step with views', () => {
    const step = { views: 1234, proceeds: 567 }
    expect(stepConversion(step) + stepDropoffRate(step)).toBeCloseTo(1, 10)
  })
})

describe('stepDropoffAbs', () => {
  it('returns views - proceeds', () => {
    expect(stepDropoffAbs({ views: 8000, proceeds: 3220 })).toBe(4780)
  })

  it('returns 0 when everyone proceeds', () => {
    expect(stepDropoffAbs({ views: 500, proceeds: 500 })).toBe(0)
  })

  it('zero-views: returns 0', () => {
    expect(stepDropoffAbs({ views: 0, proceeds: 0 })).toBe(0)
  })

  it('matches camp_001 email-step absolute drop-off (2350)', () => {
    expect(stepDropoffAbs(camp001.steps[1])).toBe(2350)
  })

  it('matches camp_001 teaser-step absolute drop-off (6800)', () => {
    expect(stepDropoffAbs(camp001.steps[0])).toBe(6800)
  })
})

describe('overallConversion', () => {
  it('returns last.proceeds / first.views', () => {
    const campaign = {
      steps: [
        { views: 1000, proceeds: 500 },
        { views: 500, proceeds: 250 },
      ],
    }
    expect(overallConversion(campaign)).toBeCloseTo(0.25, 10)
  })

  it('single-step campaign: overall equals that step conversion', () => {
    const campaign = { steps: [{ views: 400, proceeds: 100 }] }
    // first === last, so last.proceeds / first.views === step conversion.
    expect(overallConversion(campaign)).toBe(stepConversion(campaign.steps[0]))
    expect(overallConversion(campaign)).toBe(0.25)
  })

  it('empty steps: returns 0', () => {
    expect(overallConversion({ steps: [] })).toBe(0)
  })

  it('missing steps property: returns 0 (handled gracefully)', () => {
    expect(overallConversion({})).toBe(0)
  })

  it('first.views === 0: returns 0, never NaN', () => {
    const r = overallConversion({
      steps: [
        { views: 0, proceeds: 0 },
        { views: 0, proceeds: 0 },
      ],
    })
    expect(r).toBe(0)
    expect(Number.isNaN(r)).toBe(false)
  })

  it('camp_001 overall conversion is the published 0.082 (656 / 8000)', () => {
    // Hardcoded published figure — NOT recomputed from JSON (that would be tautological).
    expect(overallConversion(camp001)).toBeCloseTo(0.082, 3)
  })
})

describe('worstStep', () => {
  it('returns null for empty steps', () => {
    expect(worstStep({ steps: [] })).toBeNull()
  })

  it('returns null when steps property is missing', () => {
    expect(worstStep({})).toBeNull()
  })

  it('single-step campaign: returns that one step at index 0', () => {
    const campaign = { steps: [{ views: 400, proceeds: 100 }] }
    const w = worstStep(campaign)
    expect(w).not.toBeNull()
    expect(w.index).toBe(0)
    expect(w.step).toBe(campaign.steps[0])
    expect(w.conversion).toBe(0.25)
    expect(w.dropoffRate).toBe(0.75)
    expect(w.dropoffAbs).toBe(300)
  })

  it('returns the full shape { index, step, conversion, dropoffRate, dropoffAbs }', () => {
    const w = worstStep(camp001)
    expect(Object.keys(w).sort()).toEqual(
      ['conversion', 'dropoffAbs', 'dropoffRate', 'index', 'step'].sort(),
    )
  })

  it('picks the step with the highest drop-off RATE (camp_001 -> email, index 1)', () => {
    const w = worstStep(camp001)
    expect(w.index).toBe(1)
    expect(w.step).toBe(camp001.steps[1])
    expect(w.dropoffRate).toBeCloseTo(0.73, 2)
    expect(w.dropoffAbs).toBe(2350)
    expect(w.conversion).toBeCloseTo(0.27, 2)
  })

  it('proves rate-worst differs from absolute-worst: absolute-worst is the Teaser (index 0, 6800)', () => {
    // Independently find the step that lost the most PEOPLE.
    let absWorstIndex = 0
    let absWorst = stepDropoffAbs(camp001.steps[0])
    camp001.steps.forEach((step, i) => {
      const abs = stepDropoffAbs(step)
      if (abs > absWorst) {
        absWorst = abs
        absWorstIndex = i
      }
    })
    expect(absWorstIndex).toBe(0)
    expect(absWorst).toBe(6800)

    // worstStep chooses by RATE, so it must NOT return the absolute-worst step here.
    const w = worstStep(camp001)
    expect(w.index).toBe(1)
    expect(w.index).not.toBe(absWorstIndex)
  })

  it('tie-break on equal drop-off rate: higher absolute drop-off wins', () => {
    // Both steps have a drop-off rate of 0.5, but step 1 loses more people.
    const campaign = {
      steps: [
        { views: 100, proceeds: 50 }, // rate 0.5, abs 50
        { views: 1000, proceeds: 500 }, // rate 0.5, abs 500
      ],
    }
    const w = worstStep(campaign)
    expect(w.dropoffRate).toBe(0.5)
    expect(w.index).toBe(1)
    expect(w.dropoffAbs).toBe(500)
  })

  it('tie-break on equal rate AND equal absolute: earliest index wins', () => {
    // Two identical steps -> same rate, same abs -> earliest index must win.
    const campaign = {
      steps: [
        { views: 200, proceeds: 100 }, // rate 0.5, abs 100
        { views: 200, proceeds: 100 }, // rate 0.5, abs 100
      ],
    }
    const w = worstStep(campaign)
    expect(w.dropoffRate).toBe(0.5)
    expect(w.dropoffAbs).toBe(100)
    expect(w.index).toBe(0)
  })

  it('zero-views step is not falsely flagged as worst (its rate is 0)', () => {
    const campaign = {
      steps: [
        { views: 0, proceeds: 0 }, // guarded rate 0
        { views: 1000, proceeds: 100 }, // rate 0.9
      ],
    }
    const w = worstStep(campaign)
    expect(w.index).toBe(1)
    expect(w.dropoffRate).toBeCloseTo(0.9, 10)
  })
})

describe('worstStepByAbsolute', () => {
  it('returns null for empty steps', () => {
    expect(worstStepByAbsolute({ steps: [] })).toBeNull()
  })

  it('returns null when steps property is missing', () => {
    expect(worstStepByAbsolute({})).toBeNull()
  })

  it('single-step campaign: returns that one step at index 0', () => {
    const campaign = { steps: [{ views: 400, proceeds: 100 }] }
    const a = worstStepByAbsolute(campaign)
    expect(a).not.toBeNull()
    expect(a.index).toBe(0)
    expect(a.step).toBe(campaign.steps[0])
    expect(a.dropoffAbs).toBe(300)
  })

  it('returns the same 5-key shape as worstStep', () => {
    const a = worstStepByAbsolute(camp001)
    expect(Object.keys(a).sort()).toEqual(
      ['conversion', 'dropoffAbs', 'dropoffRate', 'index', 'step'].sort(),
    )
    // shape parity: identical key set to worstStep
    expect(Object.keys(a).sort()).toEqual(Object.keys(worstStep(camp001)).sort())
  })

  it('picks the step that loses the MOST PEOPLE: camp_001 -> Teaser (index 0, 6,800)', () => {
    const a = worstStepByAbsolute(camp001)
    expect(a.index).toBe(0)
    expect(a.step).toBe(camp001.steps[0])
    expect(a.dropoffAbs).toBe(6800)
  })

  it('absolute-worst (idx 0) DIFFERS from rate-worst (idx 1) on camp_001', () => {
    // This is the load-bearing case: the headcount-worst step is NOT the
    // rate-worst step, so the two helpers must return different indices.
    expect(worstStepByAbsolute(camp001).index).toBe(0)
    expect(worstStep(camp001).index).toBe(1)
    expect(worstStepByAbsolute(camp001).index).not.toBe(worstStep(camp001).index)
  })

  it('camp_002 (agree fixture): rate-worst and absolute-worst are the SAME step (idx 0)', () => {
    // Foil to camp_001 — used as the "note absent" fixture in component tests.
    expect(worstStep(camp002).index).toBe(0)
    expect(worstStepByAbsolute(camp002).index).toBe(0)
    expect(worstStepByAbsolute(camp002).index).toBe(worstStep(camp002).index)
  })

  it('tie-break on equal absolute drop-off: higher drop-off RATE wins', () => {
    // Both steps lose exactly 50 people, but step 0 loses a far larger share.
    const campaign = {
      steps: [
        { views: 100, proceeds: 50 }, // abs 50, rate 0.5
        { views: 1000, proceeds: 950 }, // abs 50, rate 0.05
      ],
    }
    const a = worstStepByAbsolute(campaign)
    expect(a.dropoffAbs).toBe(50)
    expect(a.index).toBe(0)
    expect(a.dropoffRate).toBe(0.5)
  })

  it('tie-break on equal absolute AND equal rate: earliest index wins', () => {
    const campaign = {
      steps: [
        { views: 200, proceeds: 100 }, // abs 100, rate 0.5
        { views: 200, proceeds: 100 }, // abs 100, rate 0.5
      ],
    }
    const a = worstStepByAbsolute(campaign)
    expect(a.dropoffAbs).toBe(100)
    expect(a.dropoffRate).toBe(0.5)
    expect(a.index).toBe(0)
  })

  it('zero-views guards: numeric fields stay finite (no NaN/Infinity)', () => {
    const campaign = {
      steps: [
        { views: 0, proceeds: 0 }, // guarded rate/conversion 0, abs 0
        { views: 1000, proceeds: 100 }, // abs 900
      ],
    }
    const a = worstStepByAbsolute(campaign)
    expect(a.index).toBe(1)
    expect(a.dropoffAbs).toBe(900)
    expect(Number.isFinite(a.conversion)).toBe(true)
    expect(Number.isFinite(a.dropoffRate)).toBe(true)
    expect(Number.isFinite(a.dropoffAbs)).toBe(true)
  })
})

describe('cross-cutting: numeric returns are always finite for awkward inputs', () => {
  const awkwardSteps = [
    { label: 'zero views & zero proceeds', step: { views: 0, proceeds: 0 } },
    { label: 'zero proceeds, positive views', step: { views: 1000, proceeds: 0 } },
    { label: 'proceeds equals views', step: { views: 1000, proceeds: 1000 } },
  ]

  it.each(awkwardSteps)('step functions stay finite for $label', ({ step }) => {
    expect(Number.isFinite(stepConversion(step))).toBe(true)
    expect(Number.isFinite(stepDropoffRate(step))).toBe(true)
    expect(Number.isFinite(stepDropoffAbs(step))).toBe(true)
  })

  const awkwardCampaigns = [
    { label: 'empty steps', campaign: { steps: [] } },
    { label: 'missing steps', campaign: {} },
    {
      label: 'all zero-views steps',
      campaign: { steps: [{ views: 0, proceeds: 0 }, { views: 0, proceeds: 0 }] },
    },
    { label: 'single zero-views step', campaign: { steps: [{ views: 0, proceeds: 0 }] } },
  ]

  it.each(awkwardCampaigns)('overallConversion stays finite for $label', ({ campaign }) => {
    expect(Number.isFinite(overallConversion(campaign))).toBe(true)
  })

  it.each(awkwardCampaigns)('worstStep numeric fields stay finite (or null) for $label', ({ campaign }) => {
    const w = worstStep(campaign)
    if (w === null) {
      expect(w).toBeNull()
    } else {
      expect(Number.isFinite(w.conversion)).toBe(true)
      expect(Number.isFinite(w.dropoffRate)).toBe(true)
      expect(Number.isFinite(w.dropoffAbs)).toBe(true)
      expect(Number.isInteger(w.index)).toBe(true)
    }
  })

  it.each(awkwardCampaigns)('worstStepByAbsolute numeric fields stay finite (or null) for $label', ({ campaign }) => {
    const a = worstStepByAbsolute(campaign)
    if (a === null) {
      expect(a).toBeNull()
    } else {
      expect(Number.isFinite(a.conversion)).toBe(true)
      expect(Number.isFinite(a.dropoffRate)).toBe(true)
      expect(Number.isFinite(a.dropoffAbs)).toBe(true)
      expect(Number.isInteger(a.index)).toBe(true)
    }
  })

  it('every real dataset campaign yields finite overall conversion', () => {
    campaigns.forEach((c) => {
      expect(Number.isFinite(overallConversion(c))).toBe(true)
    })
  })
})
