<script setup lang="ts">
import { INft } from '@bacc/ui';
import { PropType, computed } from 'vue';

const props = defineProps({
  nft: {
    type: Object as PropType<INft>,
    required: true
  }
})

const ignoredKeys = {
  icon: true,
  image: true,
  policy_id: true,
  symbol: true,
  isNft: true
}

const metadata = computed(() => props.nft.metadata)

const nftData = computed(() => {
  const res: { label: string, value: string | number }[] = []

  for (const key in metadata.value) {
    const data = metadata.value[key]
    if (ignoredKeys[key] || typeof data === 'object') {
      continue
    }
    res.push({
      label: key,
      value: data
    })
  }

  return res
})

</script>

<template>
  <div class="nft-description__info">
    <div>Policy ID:<br><span>{{ nft.mint }}</span></div>
  </div>
  <div class="nft-description__info">
    {{ $t('portfolio.dialog.nftInfo') }}:
    <ul>
      <li v-for="data in nftData" :key="data.label">
        {{ data.label }}: <span>{{ data.value }}</span></li>
    </ul>
  </div>
</template>
