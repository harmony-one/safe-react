import { AbiItem } from 'web3-utils'
import GnosisSafeSol from '@gnosis.pm/safe-contracts/build/contracts/GnosisSafe.json'
import ProxyFactorySol from '@gnosis.pm/safe-contracts/build/contracts/GnosisSafeProxyFactory.json'
import Web3 from 'web3'

import { HARMONY_NETWORK } from 'src/config/networks/network.d'
import { getNetworkId } from 'src/config/index'
import { ZERO_ADDRESS } from 'src/logic/wallets/ethAddresses'
import { calculateGasOf, EMPTY_DATA } from 'src/logic/wallets/ethTransactions'
import { getWeb3, getNetworkIdFrom } from 'src/logic/wallets/getWeb3'
import { GnosisSafe } from 'src/types/contracts/GnosisSafe.d'
import { GnosisSafeProxyFactory } from 'src/types/contracts/GnosisSafeProxyFactory.d'
import { AllowanceModule } from 'src/types/contracts/AllowanceModule.d'
import { getSafeInfo, SafeInfo } from 'src/logic/safe/utils/safeInformation'
import { SPENDING_LIMIT_MODULE_ADDRESS } from 'src/utils/constants'

import SpendingLimitModule from './artifacts/AllowanceModule.json'

const MULTI_SEND_ADDRESSES = {
  [HARMONY_NETWORK.MAINNET]: '0xDEff67e9A02b4Ce60ff62F3CB5FFB41d48856285',
  [HARMONY_NETWORK.TESTNET]: '0xF39E79A7B8B319a2554abd3469463f6620C117Bb',
}

const SAFE_MASTER_COPY_ADDRESSES = {
  [HARMONY_NETWORK.MAINNET]: '0x3736aC8400751bf07c6A2E4db3F4f3D9D422abB2',
  [HARMONY_NETWORK.TESTNET]: '0x0F2f043DBc72D3948bB7E392E6E3258dc2743376',
}

const DEFAULT_FALLBACK_HANDLER_ADDRESSES = {
  [HARMONY_NETWORK.MAINNET]: '0xC5d654bcE1220241FCe1f0F1D6b9E04f75175452',
  [HARMONY_NETWORK.TESTNET]: '0x6B0d84741F7EE66B72bF262A1eDB772d01E2aFE6',
}

const SAFE_MASTER_COPY_ADDRESS_V10ES = {
  [HARMONY_NETWORK.MAINNET]: '0x3736aC8400751bf07c6A2E4db3F4f3D9D422abB2',
  [HARMONY_NETWORK.TESTNET]: '0x0F2f043DBc72D3948bB7E392E6E3258dc2743376',
}

export const SENTINEL_ADDRESS = '0x0000000000000000000000000000000000000001'
export const MULTI_SEND_ADDRESS = MULTI_SEND_ADDRESSES[HARMONY_NETWORK[getNetworkId()]]
export const SAFE_MASTER_COPY_ADDRESS = SAFE_MASTER_COPY_ADDRESSES[HARMONY_NETWORK[getNetworkId()]]
export const DEFAULT_FALLBACK_HANDLER_ADDRESS = DEFAULT_FALLBACK_HANDLER_ADDRESSES[HARMONY_NETWORK[getNetworkId()]]
export const SAFE_MASTER_COPY_ADDRESS_V10 = SAFE_MASTER_COPY_ADDRESS_V10ES[HARMONY_NETWORK[getNetworkId()]]

let proxyFactoryMaster: GnosisSafeProxyFactory
let safeMaster: GnosisSafe

const SAFE_CONTRACTS = {
  [HARMONY_NETWORK.MAINNET]: '0x3736aC8400751bf07c6A2E4db3F4f3D9D422abB2',
  [HARMONY_NETWORK.TESTNET]: '0x0F2f043DBc72D3948bB7E392E6E3258dc2743376',
}

const PROXY_CONTRACTS = {
  [HARMONY_NETWORK.MAINNET]: '0x4f9b1dEf3a0f6747bF8C870a27D3DeCdf029100e',
  [HARMONY_NETWORK.TESTNET]: '0xAaCf9eb6614f7C110EF9b7D832BCe2E67EEC08c1',
}
/**
 * Creates a Contract instance of the GnosisSafe contract
 * @param {Web3} web3
 * @param {HARMONY_NETWORK} networkId
 */
export const getGnosisSafeContract = (web3: Web3, networkId: HARMONY_NETWORK) => {
  // TODO: this may not be the most scalable approach,
  //  but up until v1.2.0 the address is the same for all the networks.
  //  So, if we can't find the network in the Contract artifact, we fallback to MAINNET.
  const contractAddress = SAFE_CONTRACTS[networkId] ?? SAFE_CONTRACTS[HARMONY_NETWORK.MAINNET]
  return new web3.eth.Contract(GnosisSafeSol.abi as AbiItem[], contractAddress) as unknown as GnosisSafe
}

/**
 * Creates a Contract instance of the GnosisSafeProxyFactory contract
 * @param {Web3} web3
 * @param {HARMONY_NETWORK} networkId
 */
const getProxyFactoryContract = (web3: Web3, networkId: HARMONY_NETWORK): GnosisSafeProxyFactory => {
  // TODO: this may not be the most scalable approach,
  //  but up until v1.2.0 the address is the same for all the networks.
  //  So, if we can't find the network in the Contract artifact, we fallback to MAINNET.
  const contractAddress = PROXY_CONTRACTS[networkId] ?? PROXY_CONTRACTS[HARMONY_NETWORK.MAINNET]
  return new web3.eth.Contract(ProxyFactorySol.abi as AbiItem[], contractAddress) as unknown as GnosisSafeProxyFactory
}

export const getMasterCopyAddressFromProxyAddress = async (proxyAddress: string): Promise<string | undefined> => {
  let masterCopyAddress: string | undefined
  try {
    const res = await getSafeInfo(proxyAddress)
    masterCopyAddress = (res as SafeInfo)?.implementation.value
    if (!masterCopyAddress) {
      console.error(`There was not possible to get masterCopy address from proxy ${proxyAddress}.`)
    }
  } catch (e) {
    e.log()
  }
  return masterCopyAddress
}

export const instantiateSafeContracts = async () => {
  const web3 = getWeb3()
  const networkId = await getNetworkIdFrom(web3)

  // Create ProxyFactory Master Copy
  proxyFactoryMaster = getProxyFactoryContract(web3, networkId)

  // Create Safe Master copy
  safeMaster = getGnosisSafeContract(web3, networkId)
}

export const getSafeMasterContract = async () => {
  await instantiateSafeContracts()
  return safeMaster
}

export const getSafeDeploymentTransaction = (
  safeAccounts: string[],
  numConfirmations: number,
  safeCreationSalt: number,
) => {
  const gnosisSafeData = safeMaster.methods
    .setup(
      safeAccounts,
      numConfirmations,
      ZERO_ADDRESS,
      EMPTY_DATA,
      DEFAULT_FALLBACK_HANDLER_ADDRESS,
      ZERO_ADDRESS,
      0,
      ZERO_ADDRESS,
    )
    .encodeABI()
  return proxyFactoryMaster.methods.createProxyWithNonce(safeMaster.options.address, gnosisSafeData, safeCreationSalt)
}

export const estimateGasForDeployingSafe = async (
  safeAccounts: string[],
  numConfirmations: number,
  userAccount: string,
  safeCreationSalt: number,
) => {
  const gnosisSafeData = safeMaster.methods
    .setup(
      safeAccounts,
      numConfirmations,
      ZERO_ADDRESS,
      EMPTY_DATA,
      DEFAULT_FALLBACK_HANDLER_ADDRESS,
      ZERO_ADDRESS,
      0,
      ZERO_ADDRESS,
    )
    .encodeABI()
  const proxyFactoryData = proxyFactoryMaster.methods
    .createProxyWithNonce(safeMaster.options.address, gnosisSafeData, safeCreationSalt)
    .encodeABI()
  return calculateGasOf({
    data: proxyFactoryData,
    from: userAccount,
    to: proxyFactoryMaster.options.address,
  }).then((value) => value * 2)
}

export const getGnosisSafeInstanceAt = (safeAddress: string): GnosisSafe => {
  const web3 = getWeb3()
  return new web3.eth.Contract(GnosisSafeSol.abi as AbiItem[], safeAddress) as unknown as GnosisSafe
}

/**
 * Creates a Contract instance of the SpendingLimitModule contract
 */
export const getSpendingLimitContract = () => {
  const web3 = getWeb3()

  return new web3.eth.Contract(
    SpendingLimitModule.abi as AbiItem[],
    SPENDING_LIMIT_MODULE_ADDRESS,
  ) as unknown as AllowanceModule
}
