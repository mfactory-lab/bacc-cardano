import { defineStore } from 'pinia'
import { Address, BaseAddress, RewardAddress } from '@emurgo/cardano-serialization-lib-asmjs/cardano_serialization_lib.js'
import { CARDANO_WALLETS } from '../config/cardano-wallets'
import type { IWalletData } from '@bacc/core'
import { useStorage } from '@vueuse/core'

export const useCardanoWallet = defineStore('cardano-adapter-store', () => {
  const storageWallet = useStorage('cardanoWallet', '')

  // @ts-expect-error...
  const cardano = window?.cardano

  const initCardanoWallet = async (adapter: string): Promise<IWalletData | undefined> => {
    const installWallet = cardano?.[adapter.toLowerCase()]
    try {
      if (installWallet) {
        const wallet = await installWallet.enable()
        const address = await wallet.getUsedAddresses()
        storageWallet.value = adapter
        return {
          isConnected: await installWallet.isEnabled(),
          pubkey: address[0],
          wallet,
          rawPublicKey: address[0],
        }
      } else {
        const wallet = CARDANO_WALLETS.find(w => w.adapter.name === adapter)
        const link = document.createElement('a')
        link.setAttribute('href', wallet!.adapter.url)
        link.target = '_blank'
        link.click()
      }
    } catch (err) {
      console.log(err)
    }
  }

  const disconnect = () => {
    localStorage.removeItem('cardanoWallet')
  }

  async function getChangeAddress(wallet) {
    const changeAddrHex = await wallet.getChangeAddress()
    const changeAddress = Address.from_bytes(Buffer.from(changeAddrHex, 'hex'))

    return [changeAddress, changeAddrHex, changeAddress.to_bech32()]
  }

  async function getStakeAddress(wallet) {
    const networkId = await wallet.getNetworkId()
    const [changeAddress] = await getChangeAddress(wallet)

    // derive the stake address from the change address to be sure we are getting
    // the stake address of the currently active account.
    const stakeCredential = BaseAddress.from_address(changeAddress)?.stake_cred()
    if (!stakeCredential) {
      throw 'Failed to get stakeCredential from wallet'
    }
    const stakeAddress = RewardAddress.new(networkId, stakeCredential).to_address()

    return [stakeAddress.to_hex(), stakeAddress.to_bech32()]
  }

  async function signMessage(wallet: { signData: Function }, message = '') {
    const [_changeAddress, changeAddrHex, changeAddrBech32] = await getChangeAddress(wallet)
    const messageUtf = `account: ${changeAddrBech32}${message ? `; ${message}` : ''}`
    const messageHex = Buffer.from(messageUtf).toString("hex")
    return await wallet.signData(changeAddrHex, messageHex)
  }

  return {
    initCardanoWallet,
    disconnect,
    wallets: CARDANO_WALLETS,
    signMessage,
    getStakeAddress,
  }
},
)
