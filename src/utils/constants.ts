export const APP_ENV = process.env.REACT_APP_ENV
export const NODE_ENV = process.env.NODE_ENV
export const IS_PRODUCTION = process.env.NODE_ENV === 'production'
export const NETWORK = process.env.REACT_APP_NETWORK?.toUpperCase() || 'MAINNET'

export const LATEST_SAFE_VERSION = process.env.REACT_APP_LATEST_SAFE_VERSION || '1.1.1'

export const APP_VERSION = process.env.REACT_APP_APP_VERSION || 'not-defined'
export const COLLECTIBLES_SOURCE = process.env.REACT_APP_COLLECTIBLES_SOURCE || 'Gnosis'
export const TIMEOUT = process.env.NODE_ENV === 'test' ? 1500 : 5000

export const SPENDING_LIMIT_MODULE_ADDRESS =
  process.env.REACT_APP_SPENDING_LIMIT_MODULE_ADDRESS || '0x965179FbFcf7410634C7A0a258545E136A890cD7'
export const KNOWN_MODULES = {
  [SPENDING_LIMIT_MODULE_ADDRESS]: 'Spending limit',
}
