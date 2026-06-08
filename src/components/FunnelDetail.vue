<script setup>
import { computed } from 'vue'
import { overallConversion } from '../lib/funnel.js'
import { formatPercent } from '../lib/format.js'
import FunnelStep from './FunnelStep.vue'

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
</script>

<template>
  <section
    class="mx-auto w-full max-w-3xl px-4 py-10"
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
        <h1 class="text-2xl font-semibold text-slate-900">{{ campaign.name }}</h1>
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
      Reserved slot for Iteration 4's plain-language worst-step callout.
      Intentionally empty in Iteration 3 so the highlight can be layered on
      top without restructuring this view.
    -->
    <div data-testid="callout-slot" />

    <div class="mt-6 flex flex-col gap-6">
      <FunnelStep
        v-for="(step, index) in steps"
        :key="index"
        :step="step"
        :index="index"
        :is-last="index === steps.length - 1"
        :bar-denominator="barDenominator"
      />
    </div>
  </section>
</template>
