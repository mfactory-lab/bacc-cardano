<script setup lang="ts">
import type { INft } from '@bacc/ui'
import { NftComponent, NftDialog, generateImageLink, imageError } from '@bacc/ui'
import type { PropType } from 'vue'
import { ref } from 'vue'
import cardanoscanIcon from '../assets/img/marketplace/cardanoscan.png'
import jspStoreIcon from '../assets/img/marketplace/jpg-store.png'
import CardanoNftBody from './CardanoNftBody.vue'
import { cardanoExplorerLink, cardanoMarketplaceLink } from '@/utils'

defineProps({
  nft: {
    type: Object as PropType<INft>,
    required: true,
  },
})

const dialog = ref(false)

const originalImgLink = ref()

const imgLoaded = ref(false)

function handleImgLoaded() {
  imgLoaded.value = true
}

function generateNFTLink(metadata: { [key: string]: any }) {
  const mediaType = metadata?.mediaType?.replace('image/', '') ?? 'png'
  const imgLink = metadata?.image
  return generateImageLink(imgLink, { ext: mediaType, size: 512 })
}
</script>

<template>
  <NftComponent :nft="nft" :img-loaded="imgLoaded" @handle-modal="dialog = !dialog">
    <template #icon>
      <img loading="lazy" :src="originalImgLink ?? generateNFTLink(nft.metadata)" alt="nft icon" @error="imageError" @load="handleImgLoaded">
    </template>

    <template #name>
      <span>{{ nft.wallet.blockchain }}</span>
      <span data-name="nft-name" :title="nft.metadata?.name ?? nft.metadata?.symbol">
        {{ nft.metadata?.name ?? nft.metadata?.symbol }}</span>
    </template>
    <template #links>
      <a :href="cardanoExplorerLink(nft?.mint)" target="_blank">
        <img :src="cardanoscanIcon" alt="solscan icon">
      </a>
      <a :href="cardanoMarketplaceLink(nft.metadata.policy_id)" target="_blank">
        <img :src="jspStoreIcon" alt="marketplace icon"></a>
    </template>
  </NftComponent>

  <NftDialog v-model="dialog" :nft="nft">
    <template #body>
      <CardanoNftBody :nft="nft" />
    </template>
  </NftDialog>
</template>
