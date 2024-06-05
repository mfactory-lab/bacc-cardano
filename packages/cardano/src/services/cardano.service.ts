import { Buffer } from 'node:buffer'
import type { HttpService } from '@nestjs/axios'
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { BigNum, COSEKey, COSESign1, Int, Label } from '@emurgo/cardano-message-signing-nodejs'
import { Address, Ed25519Signature, PublicKey } from '@emurgo/cardano-serialization-lib-nodejs'
import type { AccountJobData, AccountSyncEventData, SignInDto } from '@bacc/core'
import { ACCOUNT_SYNC_EVENT, DEFAULT_JOB_OPTS, executeByChunks } from '@bacc/core'
import { InjectQueue } from '@nestjs/bull'
import type { Queue } from 'bull'
import { OnEvent } from '@nestjs/event-emitter'
import { ADA_SYMBOL, CARDANO_BLOCKCHAIN, GET_TRANSACTION_QUEUE, LOGO_BASE_URL, MULTI_ACCOUNT, TX_HASHES_LIMIT, TX_HASHES_QUEUE, TX_LIMIT } from '../constants'
import type { Asset, GetTransactionsJobData, IAccountTransaction, ITransaction, ParsedTxAsset, StakeWithdrawal, Transfer, UTxO } from '../types'
import { TransactionType } from '../types'
import type { CardanoToken, TokenListService } from '../token-list'
import { isValidUtf8 } from '../utils'

/**
 * Service for interacting with the Cardano blockchain.
 */
@Injectable()
export class CardanoService {
  private readonly logger = new Logger(this.constructor.name)

  constructor(
    private tokenListService: TokenListService,
    private httpService: HttpService,
    @InjectQueue(TX_HASHES_QUEUE) private hashesQueue: Queue<AccountJobData>,
    @InjectQueue(GET_TRANSACTION_QUEUE) private getTransactionsQueue: Queue<GetTransactionsJobData>,
  ) {}

  /**
   * Checks the signature of a user.
   *
   * @param props Properties for checking the signature.
   * @param props.message Message to sign.
   * @param props.signature Signature to verify.
   * @param props.publicKey Public key of the user.
   * @returns True if the signature is verified, otherwise UnauthorizedException is thrown.
   */
  async checkSignature({ message, signature: combinedSignature, publicKey: publicKeyDto }: SignInDto) {
    const [signature, signatureKey] = combinedSignature.split(':')
    if (!signature || !signatureKey) {
      throw new UnauthorizedException({ message: 'User is not authorized' })
    }
    const decoded = COSESign1.from_bytes(Buffer.from(signature, 'hex'))
    const headerMap = decoded.headers().protected().deserialized_headers()

    const headerAddress = headerMap.header(Label.new_text('address'))
    if (!headerAddress) {
      throw new UnauthorizedException({ message: 'User is not authorized' })
    }

    const addressHex = Buffer.from(headerAddress.to_bytes())
      .toString('hex')
      .substring(4)
    const address = Address.from_bytes(Buffer.from(addressHex, 'hex'))

    const key = COSEKey.from_bytes(Buffer.from(signatureKey, 'hex'))
    const pubKeyBytes = key?.header(Label.new_int(Int.new_negative(BigNum.from_str('2'))))?.as_bytes()
    if (!pubKeyBytes) {
      throw new UnauthorizedException({ message: 'User is not authorized' })
    }
    const publicKey = PublicKey.from_bytes(pubKeyBytes)

    const payload = decoded.payload()
    if (!payload) {
      throw new UnauthorizedException({ message: 'User is not authorized' })
    }
    const signatureDec = Ed25519Signature.from_bytes(decoded.signature())
    const receivedData = decoded.signed_data().to_bytes()

    const addressBech32 = address.to_bech32()
    const utf8Payload = Buffer.from(payload).toString('utf8')
    // reconstructed message
    const expectedPayload = `account: ${addressBech32}${message ? `; ${message}` : ''}`

    // verify:
    const isVerified = publicKey.verify(receivedData, signatureDec)
    const payloadAsExpected = utf8Payload === expectedPayload
    // const signerIsRegistered = registeredUsers.includes(signerStakeAddrBech32)
    const publicKeyAsExpected = publicKeyDto === addressBech32

    if (!isVerified || !payloadAsExpected || !publicKeyAsExpected) {
      throw new UnauthorizedException({ message: 'User is not authorized' })
    }
    return true
  }

  /**
   * Retrieves transactions for a given account address.
   *
   * @param {object} opts The object containing the options.
   * @param {string} opts.address The account address.
   * @param {number} [opts.afterBlock] The block height after which to retrieve transactions.
   * @param {number} [opts.offset] The offset for pagination.
   * @returns {Promise<IAccountTransaction[]>} A list of account transactions.
   */
  async getAccountTransactions({ address, afterBlock = 0, offset = 0 }: { address: string, afterBlock?: number, offset?: number }): Promise<IAccountTransaction[]> {
    const { data } = await this.httpService.axiosRef.post(
      `address_txs?offset=${offset}&limit=${TX_HASHES_LIMIT}&order=block_height.asc`,
      { _addresses: [address], _after_block_height: afterBlock },
    )
    return data
  }

  /**
   * Retrieves transaction information for the given transaction hashes.
   *
   * @param txHashes List of transaction hashes.
   * @returns Information about the transactions.
   */
  async getTransactionsInfo(txHashes: string[]): Promise<ITransaction[]> {
    const { data } = await this.httpService.axiosRef.post('tx_info', { _tx_hashes: txHashes })
    return data
  }

  /**
   * Retrieves UTXOs (Unspent Transaction Outputs) for the given transaction hashes.
   *
   * @param txHashes List of transaction hashes.
   * @returns UTXO data.
   */
  async getTransactionsUtxos(txHashes: string[]): Promise<any> {
    const { data } = await this.httpService.axiosRef.post('tx_utxos', { _tx_hashes: txHashes })
    return data
  }

  /**
   * Retrieves metadata for the given transaction hashes.
   *
   * @param txHashes List of transaction hashes.
   * @returns Metadata associated with the transactions.
   */
  async getTransactionsMetadata(txHashes: string[]): Promise<any> {
    const { data } = await this.httpService.axiosRef.post('tx_metadata', { _tx_hashes: txHashes })
    return data
  }

  /**
   * Parses a transaction and extracts relevant data.
   *
   * @param tx The transaction to parse.
   * @returns Parsed transaction data.
   */
  async parseTx(tx: ITransaction) {
    const assetsAll: Record<string, ParsedTxAsset> = {}
    const accBalancesBefore: Record<string, Record<string, number>> = {}
    const accBalancesAfter: Record<string, Record<string, number>> = {}
    for (const utxo of tx.inputs) {
      this.parseUtxo({
        assets: assetsAll,
        accounts: accBalancesBefore,
        utxo,
      })
    }
    // if (tx.collateral_inputs) {
    //   for (const utxo of tx.collateral_inputs) {
    //     this.parseUtxo({
    //       assets,
    //       accounts: accBalancesBefore,
    //       utxo,
    //     })
    //   }
    // }
    for (const utxo of tx.outputs) {
      this.parseUtxo({
        assets: assetsAll,
        accounts: accBalancesAfter,
        utxo,
      })
    }
    // if (tx.collateral_output) {
    //   this.parseUtxo({
    //     assets,
    //     accounts: accBalancesAfter,
    //     utxo: tx.collateral_output,
    //   })
    // }
    const { balanceChanges, assets } = this.getBalanceChanges({
      accountsAfter: accBalancesAfter,
      accountsBefore: accBalancesBefore,
    })
    const transfers = await this.getTransfers({
      balanceChanges,
      assets,
      fee: +tx.fee,
      deposit: +tx.deposit,
      assetsMinted: tx.assets_minted,
    })
    const withdrawals = tx.withdrawals?.filter(w => +w.amount > 0)
    if (withdrawals) {
      this.handleWithdrawals({
        transfers,
        balanceChanges,
        utxos: [...tx.inputs, ...tx.outputs],
        withdrawals,
        fee: +tx.fee,
        deposit: +tx.deposit,
      })
    }

    return {
      assetsAll,
      assets,
      accBalancesBefore,
      accBalancesAfter,
      balanceChanges,
      transfers,
    }
  }

  /**
   * Parses a UTXO (Unspent Transaction Output) and updates account balances and asset information.
   *
   * @param props Properties for parsing the UTXO.
   * @param props.assets All parsed assets.
   * @param props.accounts Account balances before parsing the UTXO.
   * @param props.utxo The UTXO to parse.
   */
  parseUtxo({ assets, accounts, utxo }: ParseUtxoProps) {
    const addr = utxo.payment_addr.bech32
    if (!accounts[addr]) {
      accounts[addr] = {
        [ADA_SYMBOL]: 0,
      }
    }
    if (utxo.value) {
      accounts[addr][ADA_SYMBOL] += +utxo.value
    }
    if (utxo.asset_list) {
      for (const asset of utxo.asset_list) {
        const assetId = `${asset.policy_id}-${asset.asset_name}`
        if (!assets[assetId]) {
          const assetName = asset.asset_name ?? ''
          assets[assetId] = {
            policy_id: asset.policy_id ?? '',
            name: assetName,
            symbol: this.getAssetNameFromHex(assetName),
            decimals: asset.decimals,
          }
        }
        if (!accounts[addr][assetId]) {
          accounts[addr][assetId] = 0
        }
        accounts[addr][assetId] += +asset.quantity
      }
    }
  }

  /**
   * Computes balance changes for accounts based on their balances before and after a transaction.
   *
   * @param props Properties for computing balance changes.
   * @param props.accountsAfter Account balances after the transaction.
   * @param props.accountsBefore Account balances before the transaction.
   * @returns Balance changes and affected assets.
   */
  getBalanceChanges({ accountsAfter, accountsBefore }: GetBalanceChangesProps) {
    const balanceChanges: Record<string, Record<string, number>> = {}
    const assets: Set<string> = new Set()
    for (const acc of Object.keys(accountsAfter)) {
      if (!balanceChanges[acc]) {
        balanceChanges[acc] = {}
      }
      for (const asset of Object.keys(accountsAfter[acc])) {
        const amount = accountsAfter[acc][asset] - (accountsBefore[acc]?.[asset] ?? 0)
        if (amount) {
          balanceChanges[acc][asset] = amount
          assets.add(asset)
        }
      }
    }
    for (const acc of Object.keys(accountsBefore)) {
      if (!balanceChanges[acc]) {
        balanceChanges[acc] = {}
      }
      for (const asset of Object.keys(accountsBefore[acc])) {
        const amount = (accountsAfter[acc]?.[asset] ?? 0) - (accountsBefore[acc][asset])
        if (!balanceChanges[acc][asset] && amount) {
          balanceChanges[acc][asset] = amount
          assets.add(asset)
        }
      }
    }
    return {
      balanceChanges,
      assets,
    }
  }

  /**
   * Computes transfers based on balance changes, fees, and other transaction details.
   *
   * @param props Properties for computing transfers.
   * @param props.assets Set of assets involved in the transfers.
   * @param props.balanceChanges Balance changes for accounts.
   * @param props.fee Transaction fee.
   * @param props.deposit Transaction deposit.
   * @param props.assetsMinted Assets minted in the transaction.
   * @returns List of transfers.
   */
  async getTransfers({ assets, balanceChanges, fee, deposit, assetsMinted }: GetTransfersProps): Promise<Transfer[]> {
    const transfers = []
    const accounts = Object.keys(balanceChanges)
    for (const asset of assets) {
      let [tokenMint, tokenSymbol] = asset.split('-')
      let metadata: Partial<CardanoToken> | undefined = asset !== ADA_SYMBOL ? await this.tokenListService.getTokenData(`${tokenMint}${tokenSymbol}`) : undefined
      if (metadata) {
        metadata = {
          decimals: metadata.decimals,
          ticker: metadata.ticker,
          name: metadata.name,
          logo: `${LOGO_BASE_URL}${metadata.logo}`,
        }
      }
      /**
       * asset = policyId-tokenName
       * tokenMint = policyId
       * tokenSymbol = tokenName
       * ADA have no policyId, so use next fix
       */
      if (!tokenSymbol) {
        tokenSymbol = tokenMint
        tokenMint = ''
      }
      const receivers: string[] = []
      const senders: string[] = []
      for (const acc of accounts) {
        if (balanceChanges[acc][asset] > 0) {
          receivers.push(acc)
        } else if (balanceChanges[acc][asset] < 0) {
          senders.push(acc)
        }
      }

      // TODO: transactions type: swap, stakes
      if (senders.length === 1 && (receivers.length >= 1)) {
        const sender = senders[0]
        for (const receiver of receivers) {
          transfers.push({
            from: sender,
            to: receiver,
            amount: balanceChanges[receiver][asset],
            // TODO: get token decimals from asset data if it needed in transfer entity
            // asset policyId
            tokenMint,
            // asset name hex
            tokenSymbol,
            instructionType: TransactionType.TRANSFER,
            metadata,
            // TODO: instructionOrder ?
            // instructionOrder: number,
          })
        }
      } else if (receivers.length === 1 && senders.length > 0) {
        const receiver = receivers[0]
        for (const sender of senders) {
          transfers.push({
            from: sender,
            to: receiver,
            amount: balanceChanges[sender][asset],
            tokenMint,
            tokenSymbol,
            instructionType: TransactionType.TRANSFER,
            metadata,
          })
        }
      } else if (
        receivers.length > 0
        && senders.length === 0
        && assetsMinted?.find(a => a.policy_id === tokenMint && a.asset_name === tokenSymbol)
      ) {
        // Tokens mints
        for (const receiver of receivers) {
          transfers.push({
            // TODO: token mint owner?
            from: '',
            to: receiver,
            amount: balanceChanges[receiver][asset],
            tokenMint,
            tokenSymbol,
            instructionType: TransactionType.MINT,
            metadata,
          })
        }
      } else if (
        senders.length > 0
        && receivers.length === 0
        && assetsMinted?.find(a => a.policy_id === tokenMint && a.asset_name === tokenSymbol)
      ) {
        for (const sender of senders) {
          transfers.push({
            from: sender,
            to: '',
            amount: Math.abs(balanceChanges[sender][asset]),
            tokenMint,
            tokenSymbol,
            instructionType: TransactionType.BURN,
            metadata,
          })
        }
      } else if (receivers.length > 1 && senders.length > 1) {
        // if we have 2+ senders and 2+ receivers
        // TODO: perhaps should write down which accounts participated
        for (const sender of senders) {
          transfers.push({
            from: sender,
            to: MULTI_ACCOUNT,
            amount: Math.abs(balanceChanges[sender][asset]),
            tokenMint,
            tokenSymbol,
            instructionType: TransactionType.TRANSFER,
            metadata,
          })
        }
        for (const receiver of receivers) {
          transfers.push({
            from: MULTI_ACCOUNT,
            to: receiver,
            amount: balanceChanges[receiver][asset],
            tokenMint,
            tokenSymbol,
            instructionType: TransactionType.TRANSFER,
            metadata,
          })
        }
      }
      // TODO: fee if we have few ADA senders
      if (asset === ADA_SYMBOL && (accounts.length === 1 || senders.length === 1)) {
        transfers.push({
          from: accounts.length === 1 ? accounts[0] : senders[0],
          to: '',
          amount: fee,
          tokenMint: '',
          tokenSymbol: ADA_SYMBOL,
          instructionType: TransactionType.FEE,
        })
      }
    }
    // TODO: check it. Is there a deposit only when staking?
    if (accounts.length === 1 && deposit) {
      transfers.push({
        from: deposit > 0 ? accounts[0] : '',
        to: deposit < 0 ? accounts[0] : '',
        amount: Math.abs(deposit),
        tokenMint: '',
        tokenSymbol: ADA_SYMBOL,
        instructionType: deposit > 0 ? TransactionType.STAKE : TransactionType.WITHDRAW_STAKE,
      })
    }
    return transfers
  }

  /**
   * Handles stake withdrawals in the transaction, updating transfers and balance changes accordingly.
   *
   * @param props Props for handling stake withdrawals.
   * @param props.withdrawals Stake withdrawals.
   * @param props.balanceChanges Balance changes for accounts.
   * @param props.transfers List of transfers.
   * @param props.utxos List of UTXOs in the transaction.
   * @param props.deposit Transaction deposit.
   * @param props.fee Transaction fee.
   */
  handleWithdrawals({ transfers, utxos, withdrawals, balanceChanges, fee, deposit }: HandleWithdrawalsProps) {
    const accs = Object.keys(balanceChanges).filter(acc => !!balanceChanges[acc][ADA_SYMBOL])
    const receivers: string[] = []
    const senders: string[] = []
    for (const acc of accs) {
      if (balanceChanges[acc][ADA_SYMBOL] > 0) {
        receivers.push(acc)
      } else if (balanceChanges[acc][ADA_SYMBOL] < 0) {
        senders.push(acc)
      }
    }

    for (const withdrawal of withdrawals) {
      const accountsSet = utxos
        .filter(utxo => utxo.stake_addr === withdrawal.stake_addr)
        .reduce((accounts, utxo) => {
          return accounts.add(utxo.payment_addr.bech32)
        }, new Set() as Set<string>,
        )

      const accounts = Array.from(accountsSet)
      let to = ''
      if (accounts.length === 1) {
        to = accounts[0]
      } else if (accs.length === 1 && accounts.includes(accs[0])) {
        to = accs[0]
      } else if (withdrawals.length === 1) {
        const checkAmount = Object.keys(balanceChanges).reduce((val, acc) => {
          return val + (balanceChanges[acc][ADA_SYMBOL] ?? 0)
        }, fee + deposit)
        if (checkAmount > 0) {
          to = senders.find(acc => accounts.includes(acc)) ?? ''
        } else if (checkAmount < 0) {
          to = receivers.find(acc => accounts.includes(acc)) ?? ''
        }
      }
      /**
       * TODO: if there are several withdrawals
       * and the withdrawal has few addresses for StakeKey
       * and in the transaction there is more than one address whose ADA balance has changed
       * than we cannot calculate the receiver
       */
      if (to) {
        transfers.push({
          from: '',
          to,
          amount: +withdrawal.amount,
          tokenMint: '',
          tokenSymbol: ADA_SYMBOL,
          instructionType: TransactionType.WITHDRAW_STAKE,
        })
      }
    }
  }

  /**
   * Retrieves data for the specified assets from Koios.
   *
   * @param assets List of assets to retrieve data for.
   * @returns Asset data.
   */
  async getAssetsData(assets: { policyId: string, name: string }[]): Promise<any> {
    const { data } = await this.httpService.axiosRef.post(
      'asset_info',
      { _asset_list: assets.map(a => [a.policyId, a.name]) },
    )
    return data
  }

  /**
   * Retrieves the asset name from its hexadecimal representation.
   * upd: koios return the same name (but contains additional data)
   * TODO: need improvements - some names are converted incorrectly
   *
   * @param hexName The hexadecimal representation of the asset name.
   * @returns The asset name.
   */
  getAssetNameFromHex(hexName: string): string {
    try {
      const buf = Buffer.from(hexName, 'hex')
      return isValidUtf8(buf) ? buf.toString('utf8') : ''
    } catch (e) {
      this.logger.warn(`getAssetNameFromHex ${hexName}: ${e}`)
      return ''
    }
  }

  /**
   * Syncs an account with the blockchain upon receiving an account sync event.
   * @param payload Data associated with the account sync event.
   */
  @OnEvent(ACCOUNT_SYNC_EVENT)
  async syncAccount(payload: AccountSyncEventData) {
    if (payload.blockchain === CARDANO_BLOCKCHAIN) {
      await this.addAccountJob({ publicKey: payload.publicKey, id: payload.id })
    }
  }

  /**
   * Adds an account job to the hashes queue for processing.
   * @param job The account job data to add to the queue.
   */
  async addAccountJob(job: AccountJobData) {
    await this.hashesQueue.add(job, DEFAULT_JOB_OPTS)
  }

  /**
   * Adds a job to retrieve transactions to the get transactions queue for processing.
   * @param job The get transactions job data to add to the queue.
   */
  async addGetTransactionsJob(job: GetTransactionsJobData) {
    await executeByChunks(
      async (chunk: string[]) => await this.getTransactionsQueue.add(
        {
          accountId: job.accountId,
          hashes: chunk,
        },
        {
          ...DEFAULT_JOB_OPTS,
          lifo: true,
        },
      ),
      job.hashes,
      TX_LIMIT,
    )
  }
}

type ParseUtxoProps = {
  assets: Record<string, ParsedTxAsset>
  accounts: Record<string, Record<string, number>>
  utxo: UTxO
}

type GetBalanceChangesProps = {
  accountsAfter: Record<string, Record<string, number>>
  accountsBefore: Record<string, Record<string, number>>
}

type GetTransfersProps = {
  assets: Set<string>
  balanceChanges: Record<string, Record<string, number>>
  fee: number
  deposit: number
  assetsMinted: Asset[] | null
}

type HandleWithdrawalsProps = {
  withdrawals: StakeWithdrawal[]
  balanceChanges: Record<string, Record<string, number>>
  transfers: Transfer[]
  utxos: UTxO[]
  deposit: number
  fee: number
}
