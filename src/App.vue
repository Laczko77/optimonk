<script setup>
import { computed, ref } from 'vue'
import { useCampaigns } from './composables/useCampaigns.js'
import CampaignList from './components/CampaignList.vue'
import FunnelDetail from './components/FunnelDetail.vue'

const { getCampaignById } = useCampaigns()

// Selected-campaign state drives which view is shown. null = campaign list.
const selectedId = ref(null)

const selectedCampaign = computed(() =>
  selectedId.value ? getCampaignById(selectedId.value) : null,
)

function selectCampaign(id) {
  selectedId.value = id
}

function clearSelection() {
  selectedId.value = null
}
</script>

<template>
  <main class="min-h-screen bg-slate-50 text-slate-800">
    <CampaignList v-if="!selectedCampaign" @select="selectCampaign" />

    <FunnelDetail v-else :campaign="selectedCampaign" @back="clearSelection" />
  </main>
</template>
