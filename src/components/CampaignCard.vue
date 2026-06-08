<script setup>
import { computed } from 'vue'
import { overallConversion } from '../lib/funnel.js'
import { formatPercent } from '../lib/format.js'

const props = defineProps({
  campaign: { type: Object, required: true },
})

const emit = defineEmits(['select'])

const stepCount = computed(() => props.campaign.steps.length)

const stepLabel = computed(
  () => `${stepCount.value} ${stepCount.value === 1 ? 'step' : 'steps'}`,
)

const deviceLabel = computed(() => {
  const device = props.campaign.device ?? ''
  return device.charAt(0).toUpperCase() + device.slice(1)
})

// Display-only formatting. The math itself comes from funnel.js and the
// percent string from format.js; the card never recomputes either. 0.082 -> "8.2%".
const conversionLabel = computed(() => formatPercent(overallConversion(props.campaign)))

const accessibleName = computed(
  () => `${props.campaign.name}, ${conversionLabel.value} overall conversion`,
)
</script>

<template>
  <button
    type="button"
    class="group w-full cursor-pointer rounded-xl bg-white p-5 text-left shadow-sm ring-1 ring-slate-200 transition hover:shadow-md hover:ring-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
    :aria-label="accessibleName"
    data-testid="campaign-card"
    :data-campaign-id="campaign.id"
    @click="emit('select', campaign.id)"
  >
    <div class="flex items-start justify-between gap-3">
      <h2 class="text-base font-medium text-slate-900" data-testid="campaign-card-name">
        {{ campaign.name }}
      </h2>
      <span
        class="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600"
        data-testid="campaign-card-device"
      >
        {{ deviceLabel }}
      </span>
    </div>

    <p class="mt-1 text-sm text-slate-500" data-testid="campaign-card-steps">
      {{ stepLabel }}
    </p>

    <div class="mt-4 flex items-end justify-between gap-3">
      <div>
        <p class="text-xs uppercase tracking-wide text-slate-400">Overall conversion</p>
        <p
          class="mt-0.5 text-3xl font-semibold text-slate-900"
          data-testid="campaign-card-conversion"
        >
          {{ conversionLabel }}
        </p>
      </div>
      <svg
        class="h-6 w-6 shrink-0 text-slate-300 transition group-hover:text-slate-400"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M9 18l6-6-6-6" />
      </svg>
    </div>
  </button>
</template>
