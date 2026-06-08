<script setup>
import { useCampaigns } from '../composables/useCampaigns.js'
import CampaignCard from './CampaignCard.vue'

const emit = defineEmits(['select'])

const { campaigns, loading, error, reload } = useCampaigns()
</script>

<template>
  <section class="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6" data-testid="campaign-list">
    <header class="mb-6">
      <h1 class="text-2xl font-semibold text-slate-900">Campaigns</h1>
      <p class="mt-1 text-sm text-slate-500">See how each popup campaign is converting.</p>
    </header>

    <!-- LOADING: shown while the fetch is in flight -->
    <div
      v-if="loading"
      class="py-16 text-center text-sm text-slate-500"
      data-testid="campaigns-loading"
    >
      Loading campaigns…
    </div>

    <!-- ERROR: shown only if the fetch fails; calm, with a one-click retry -->
    <div
      v-else-if="error"
      class="rounded-xl bg-white p-10 text-center ring-1 ring-slate-200"
      data-testid="campaigns-error"
    >
      <h2 class="text-base font-medium text-slate-900">We couldn't load your campaigns</h2>
      <p class="mx-auto mt-1 max-w-md text-sm text-slate-500">
        Something went wrong while loading your campaigns. Please check your connection and try
        again.
      </p>
      <button
        type="button"
        class="mt-4 inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
        data-testid="campaigns-retry"
        @click="reload"
      >
        Try again
      </button>
    </div>

    <!-- CARD LIST: successful fetch with at least one campaign -->
    <div v-else-if="campaigns.length" class="flex flex-col gap-4">
      <CampaignCard
        v-for="campaign in campaigns"
        :key="campaign.id"
        :campaign="campaign"
        @select="emit('select', $event)"
      />
    </div>

    <!-- EMPTY: successful fetch that returned zero campaigns -->
    <div
      v-else
      class="rounded-xl bg-white p-10 text-center ring-1 ring-slate-200"
      data-testid="empty-state"
    >
      <h2 class="text-base font-medium text-slate-900">No campaigns yet</h2>
      <p class="mt-1 text-sm text-slate-500">There are no campaigns to show right now.</p>
    </div>
  </section>
</template>
