<script lang="ts" setup>
import { CARDANO_WALLETS } from '../config/cardano-wallets'
import { useCardanoWallet } from '../store/cardanoWalletAdapter'
import { ConnectWallet } from '@bacc/ui'
import { onMounted, ref } from 'vue'
import { cardanoInfo } from '../config/blockchain'

const storageWallet = useStorage('cardanoWallet', '')

const cardanoWallet = useCardanoWallet()

const walletData = ref()

async function select(w) {
  walletData.value = await cardanoWallet.initCardanoWallet(w.adapter.name)
}

function disconnect() {
  cardanoWallet.disconnect()
}

onMounted(async () => {
  if (storageWallet.value.length !== 0) {
     walletData.value = await cardanoWallet.initCardanoWallet(storageWallet.value)
  }
})
</script>

<template>
  <connect-wallet :blockchain="cardanoInfo" :wallets="CARDANO_WALLETS" :wallet-data="walletData" @select="select"
    @disconnect="disconnect" />
</template>
