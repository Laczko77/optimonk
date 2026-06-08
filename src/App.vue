<script setup>
import { computed, nextTick, ref } from 'vue'
import { useCampaigns } from './composables/useCampaigns.js'
import CampaignList from './components/CampaignList.vue'
import FunnelDetail from './components/FunnelDetail.vue'

const { getCampaignById } = useCampaigns()

// Selected-campaign state drives which view is shown. null = campaign list.
const selectedId = ref(null)

const selectedCampaign = computed(() =>
  selectedId.value ? getCampaignById(selectedId.value) : null,
)

// Template refs to the two views so we can restore keyboard focus after a
// view switch (the outgoing view unmounts, which would otherwise drop focus
// onto <body>). Each view exposes a focus() method via defineExpose.
const listRef = ref(null)
const detailRef = ref(null)

// Guarded so the jsdom test environment (and any non-browser context) does not
// crash when window.scrollTo is unavailable.
function scrollToTop() {
  if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
    window.scrollTo({ top: 0 })
  }
}

async function selectCampaign(id) {
  selectedId.value = id
  scrollToTop()
  // Wait for the detail view to mount before moving focus into it.
  await nextTick()
  detailRef.value?.focus()
}

async function clearSelection() {
  selectedId.value = null
  scrollToTop()
  // Wait for the list view to mount before moving focus to its heading.
  await nextTick()
  listRef.value?.focus()
}
</script>

<template>
  <main class="min-h-screen bg-bg-soft text-ink">
    <CampaignList v-if="!selectedCampaign" ref="listRef" @select="selectCampaign" />

    <FunnelDetail
      v-else
      ref="detailRef"
      :campaign="selectedCampaign"
      @back="clearSelection"
    />
  </main>
</template>
