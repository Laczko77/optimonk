<script setup>
import { useCampaigns } from '../composables/useCampaigns.js'
import CampaignCard from './CampaignCard.vue'

const emit = defineEmits(['select'])

const { campaigns } = useCampaigns()
</script>

<template>
  <section class="mx-auto w-full max-w-3xl px-4 py-10" data-testid="campaign-list">
    <header class="mb-6">
      <h1 class="text-2xl font-semibold text-slate-900">Campaigns</h1>
      <p class="mt-1 text-sm text-slate-500">See how each popup campaign is converting.</p>
    </header>

    <div v-if="campaigns.length" class="flex flex-col gap-4">
      <CampaignCard
        v-for="campaign in campaigns"
        :key="campaign.id"
        :campaign="campaign"
        @select="emit('select', $event)"
      />
    </div>

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
