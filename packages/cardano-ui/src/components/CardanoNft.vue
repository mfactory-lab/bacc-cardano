<script setup lang="ts">
import { INft, NftComponent, NftDialog, generateImageLink } from '@bacc/ui'
import { cardanoExplorerLink, cardanoMarketplaceLink } from '../utils'
import { PropType, ref} from 'vue'
import cardanoscanIcon from '../assets/img/marketplace/cardanoscan.png'
import jspStoreIcon from '../assets/img/marketplace/jpg-store.png'
import { imageError } from '@bacc/ui'
import CardanoNftBody from './CardanoNftBody.vue'

defineProps({
  nft: {
    type: Object as PropType<INft>,
    required: true
  }
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
  <nft-component :nft="nft" @handle-modal="dialog = !dialog" :imgLoaded="imgLoaded">
    <template #icon>
      <img loading="lazy" @error="imageError" @load="handleImgLoaded" :src="originalImgLink ?? generateNFTLink(nft.metadata)" alt="nft icon" />
    </template>

    <template #name>
      <span>{{ nft.wallet.blockchain }}</span>
      <span data-name="nft-name" :title="nft.metadata?.name ?? nft.metadata?.symbol">
        {{ nft.metadata?.name ?? nft.metadata?.symbol }}</span>
    </template>
    <template #links>
      <a :href="cardanoExplorerLink(nft?.mint)" target="_blank">
        <img :src="cardanoscanIcon" alt="solscan icon" />
      </a>
      <a :href="cardanoMarketplaceLink(nft.metadata.policy_id)" target="_blank">
        <img :src="jspStoreIcon" alt="marketplace icon" /></a>
    </template>
  </nft-component>

  <nft-dialog :nft="nft" v-model="dialog">
    <template #body>
      <cardano-nft-body :nft="nft" />
    </template>
  </nft-dialog>
</template>
