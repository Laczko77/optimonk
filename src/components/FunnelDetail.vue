<script setup>
import { computed } from 'vue'
import { overallConversion, worstStep, worstStepByAbsolute } from '../lib/funnel.js'
import { formatPercent, formatCount } from '../lib/format.js'
import FunnelStep from './FunnelStep.vue'
import Insights from './Insights.vue'

const props = defineProps({
  // The already-selected campaign, passed in by App.vue. This component does
  // not look the campaign up itself.
  campaign: { type: Object, required: true },
})

const emit = defineEmits(['back'])

const steps = computed(() => props.campaign.steps ?? [])

const stepCount = computed(() => steps.value.length)
const stepCountLabel = computed(
  () => `${stepCount.value} ${stepCount.value === 1 ? 'step' : 'steps'}`,
)

// Display-only formatting; the math comes from funnel.js.
const conversionLabel = computed(() => formatPercent(overallConversion(props.campaign)))

const deviceLabel = computed(() => {
  const device = props.campaign.device ?? ''
  return device.charAt(0).toUpperCase() + device.slice(1)
})

// One bar denominator for the whole funnel = the largest views across the
// steps (in consistent data this is the first step). Used so every bar is
// comparable. Guard: no steps -> 0 -> every bar renders at width 0.
const barDenominator = computed(() =>
  steps.value.reduce((max, step) => Math.max(max, step.views), 0),
)

// --- Iteration 4: worst-step highlight (additive layer) ---
// Suppressed for single-step / empty funnels: a one-step funnel has no internal
// drop-off to diagnose, so the highlight is misleading noise.
const worst = computed(() => worstStep(props.campaign))
const worstAbs = computed(() => worstStepByAbsolute(props.campaign))
const highlightActive = computed(() => steps.value.length > 1 && worst.value !== null)

// Singular guard so "1 person" reads naturally (matches Iteration 3).
function peopleNoun(count) {
  return count === 1 ? 'person' : 'people'
}

const calloutPrimary = computed(() => {
  if (!highlightActive.value) return ''
  const w = worst.value
  return (
    `Biggest drop-off is at Step ${w.index + 1} — ${w.step.name}: ` +
    `${formatPercent(w.dropoffRate)} of people leave here ` +
    `(${formatCount(w.dropoffAbs)} ${peopleNoun(w.dropoffAbs)}), ` +
    `and only ${formatPercent(w.conversion)} continue.`
  )
})

// Secondary note only when the rate-worst and absolute-worst steps differ.
const showNote = computed(
  () => highlightActive.value && worst.value.index !== worstAbs.value.index,
)
const calloutNote = computed(() => {
  if (!showNote.value) return ''
  const a = worstAbs.value
  const w = worst.value
  return (
    `Heads up: Step ${a.index + 1} — ${a.step.name} loses the most people overall ` +
    `(${formatCount(a.dropoffAbs)}), but Step ${w.index + 1} loses the largest share.`
  )
})
</script>

<template>
  <section
    class="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6"
    data-testid="detail-view"
    :data-campaign-id="campaign.id"
  >
    <button
      type="button"
      class="inline-flex cursor-pointer items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 ring-1 ring-slate-200 transition hover:bg-white hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      data-testid="back-button"
      @click="emit('back')"
    >
      <span aria-hidden="true">&larr;</span>
      Back to campaigns
    </button>

    <header class="mt-6">
      <div class="flex items-start justify-between gap-3">
        <h1 class="min-w-0 break-words text-2xl font-semibold text-slate-900">
          {{ campaign.name }}
        </h1>
        <span
          class="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600"
          data-testid="detail-device"
        >
          {{ deviceLabel }}
        </span>
      </div>
      <p class="mt-1 text-sm text-slate-500" data-testid="detail-summary">
        {{ stepCountLabel }} · {{ conversionLabel }} overall conversion
      </p>
    </header>

    <!--
      Iteration 4 worst-step callout lives in this reserved slot, directly under
      the header. Rendered only when the highlight is active (multi-step funnel
      with a worst step); suppressed entirely otherwise.
    -->
    <div data-testid="callout-slot">
      <div
        v-if="highlightActive"
        class="mt-6 rounded-lg border-l-4 border-rose-500 bg-rose-50 p-4"
        data-testid="worst-step-callout"
        role="status"
      >
        <p class="text-sm font-medium text-rose-900">
          <span aria-hidden="true">⚠</span> {{ calloutPrimary }}
        </p>
        <p
          v-if="showNote"
          class="mt-2 text-sm text-rose-700"
          data-testid="worst-step-callout-note"
        >
          {{ calloutNote }}
        </p>
      </div>
    </div>

    <div class="mt-6 flex flex-col gap-6">
      <FunnelStep
        v-for="(step, index) in steps"
        :key="index"
        :step="step"
        :index="index"
        :is-last="index === steps.length - 1"
        :bar-denominator="barDenominator"
        :is-worst="highlightActive && index === worst.index"
      />
    </div>

    <!--
      Iteration 5: rule-based recommendations. Additive last region, below the
      funnel steps. Presentational only — all rules live in src/lib/insights.js.
    -->
    <Insights :campaign="campaign" />
  </section>
</template>
