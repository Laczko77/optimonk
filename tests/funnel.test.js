import { describe, it, expect } from 'vitest'
import {
  stepConversion,
  stepDropoffRate,
  stepDropoffAbs,
  overallConversion,
  worstStep,
} from '../src/lib/funnel.js'
import campaigns from '../src/data/campaigns.json'

// Helper: pull a campaign from the real dataset by id.
const byId = (id) => campaigns.find((c) => c.id === id)
const camp001 = byId('camp_001')

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

  it('matches camp_001 teaser-step absolute drop-off (4780)', () => {
    expect(stepDropoffAbs(camp001.steps[0])).toBe(4780)
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

  it('proves rate-worst differs from absolute-worst: absolute-worst is the Teaser (index 0, 4780)', () => {
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
    expect(absWorst).toBe(4780)

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

  it('every real dataset campaign yields finite overall conversion', () => {
    campaigns.forEach((c) => {
      expect(Number.isFinite(overallConversion(c))).toBe(true)
    })
  })
})
