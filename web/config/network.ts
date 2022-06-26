import { NetworkType } from '../types/network';

// Default Elrond network configuration (constants).
// Change if you need, but by default, you shouldn't have to do that.

export const DEFAULT_MIN_GAS_LIMIT = 50_000;

export const DAPP_CONFIG_ENDPOINT: string = '/dapp/config';
export const DAPP_INIT_ROUTE: string = '/dapp/init';

export const chainType = process.env.NEXT_PUBLIC_ELROND_CHAIN || 'devnet';

export const networkConfig: Record<string, NetworkType> = {
  devnet: {
    id: 'devnet',
    shortId: 'D',
    name: 'Devnet',
    egldLabel: 'xEGLD',
    egldDenomination: '18',
    decimals: '4',
    gasPerDataByte: '1500',
    walletConnectDeepLink:
      'https://maiar.page.link/?apn=com.elrond.maiar.wallet&isi=1519405832&ibi=com.elrond.maiar.wallet&link=https://maiar.com/',
    walletConnectBridgeAddresses: ['https://bridge.walletconnect.org'],
    walletAddress: 'https://devnet-wallet.elrond.com',
    apiAddress:
      process.env.NEXT_PUBLIC_ELROND_API || 'https://devnet-api.elrond.com',
    explorerAddress: 'https://devnet-explorer.elrond.com',
    apiTimeout: '4000',
  },

  testnet: {
    id: 'testnet',
    shortId: 'T',
    name: 'Testnet',
    egldLabel: 'xEGLD',
    egldDenomination: '18',
    decimals: '4',
    gasPerDataByte: '1500',
    walletConnectDeepLink:
      'https://maiar.page.link/?apn=com.elrond.maiar.wallet&isi=1519405832&ibi=com.elrond.maiar.wallet&link=https://maiar.com/',
    walletConnectBridgeAddresses: ['https://bridge.walletconnect.org'],
    walletAddress: 'https://testnet-wallet.elrond.com',
    apiAddress:
      process.env.NEXT_PUBLIC_ELROND_API || 'https://testnet-api.elrond.com',
    explorerAddress: 'https://testnet-explorer.elrond.com',
    apiTimeout: '4000',
  },

  mainnet: {
    id: 'mainnet',
    shortId: '1',
    name: 'Mainnet',
    egldLabel: 'EGLD',
    egldDenomination: '18',
    decimals: '4',
    gasPerDataByte: '1500',
    walletConnectDeepLink:
      'https://maiar.page.link/?apn=com.elrond.maiar.wallet&isi=1519405832&ibi=com.elrond.maiar.wallet&link=https://maiar.com/',
    walletConnectBridgeAddresses: ['https://bridge.walletconnect.org'],
    walletAddress: 'https://wallet.elrond.com',
    apiAddress: process.env.NEXT_PUBLIC_ELROND_API || 'https://api.elrond.com',
    explorerAddress: 'https://explorer.elrond.com',
    apiTimeout: '4000',
  },
};
