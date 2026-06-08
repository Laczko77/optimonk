<script setup>
import { computed } from 'vue'
import { overallConversion } from '../lib/funnel.js'
import { formatPercent } from '../lib/format.js'

const props = defineProps({
  campaign: { type: Object, required: true },
})

const emit = defineEmits(['select'])

const stepCount = computed(() => props.campaign.steps.length)

const stepLabel = computed(() => `${stepCount.value} lépés`)

// Hungarian device labels for the known dataset values. Unknown values fall
// back to the raw value capitalised (the dataset itself stays untranslated).
const DEVICE_LABELS = { desktop: 'Asztali', mobile: 'Mobil' }
const deviceLabel = computed(() => {
  const device = props.campaign.device ?? ''
  return DEVICE_LABELS[device] ?? device.charAt(0).toUpperCase() + device.slice(1)
})

// Display-only formatting. The math itself comes from funnel.js and the
// percent string from format.js; the card never recomputes either. 0.082 -> "8.2%".
const conversionLabel = computed(() => formatPercent(overallConversion(props.campaign)))

const accessibleName = computed(
  () => `${props.campaign.name}, ${conversionLabel.value} összesített konverzió`,
)
</script>

<template>
  <button
    type="button"
    class="group w-full cursor-pointer rounded-2xl border border-border bg-bg p-5 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:p-6"
    :aria-label="accessibleName"
    data-testid="campaign-card"
    :data-campaign-id="campaign.id"
    @click="emit('select', campaign.id)"
  >
    <div class="flex items-start justify-between gap-3">
      <h2
        class="min-w-0 break-words text-lg font-bold text-ink"
        data-testid="campaign-card-name"
      >
        {{ campaign.name }}
      </h2>
      <span
        class="shrink-0 rounded-full bg-bg-soft px-2.5 py-0.5 text-xs font-semibold text-ink-muted ring-1 ring-border"
        data-testid="campaign-card-device"
      >
        {{ deviceLabel }}
      </span>
    </div>

    <p class="mt-1 text-sm text-ink-muted" data-testid="campaign-card-steps">
      {{ stepLabel }}
    </p>

    <div class="mt-5 flex items-end justify-between gap-3">
      <div>
        <p class="text-xs font-semibold uppercase tracking-wide text-ink-muted">Összesített konverzió</p>
        <p
          class="mt-0.5 whitespace-nowrap text-3xl font-extrabold tabular-nums text-ink"
          data-testid="campaign-card-conversion"
        >
          {{ conversionLabel }}
        </p>
      </div>
      <svg
        class="h-6 w-6 shrink-0 text-border transition group-hover:translate-x-0.5 group-hover:text-primary"
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
