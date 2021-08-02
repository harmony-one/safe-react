import { WalletInitOptions } from 'bnc-onboard/dist/src/interfaces'

import { getNetworkId, getNetworkConfigDisabledWallets } from 'src/config'
import { WALLETS } from 'src/config/networks/network.d'

const networkId = getNetworkId()
const disabledWallets = getNetworkConfigDisabledWallets()

type Wallet = WalletInitOptions & {
  desktop: boolean
  walletName: WALLETS
}

const wallets: Wallet[] = [{ walletName: WALLETS.METAMASK, preferred: true, desktop: false }]

export const getSupportedWallets = (): WalletInitOptions[] => {
  const { isDesktop } = window
  /* eslint-disable no-unused-vars */
  if (isDesktop) {
    return wallets.filter((wallet) => wallet.desktop).map(({ desktop, ...rest }) => rest)
  }

  return wallets.map(({ desktop, ...rest }) => rest).filter((w) => !disabledWallets.includes(w.walletName))
}
