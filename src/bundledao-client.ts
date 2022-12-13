import { Bundle, createData, DataItem, DataItemCreateOptions } from 'arbundles'
import { Buffer } from 'buffer'
import { Signer } from 'arbundles/src/signing'
import InjectedDeSoSigner from './injected-deso-signer'
import packageJson from '../package.json'

import { longTo32ByteArray } from './util'
import { DeSoPrivateKey, IdentityServiceDeSoPrivateKey, PrivateKey } from './'
import BundleDAOAPI from './api'

export type Currency = 'deso'

export type DeSoConfig = {
  identityUrl: string
  identityIframe: HTMLIFrameElement | string
}

const DEFAULT_DESO_CONFIG: DeSoConfig = {
  identityUrl: 'https://identity.deso.org',
  identityIframe: 'identity'
}

export type BundleDAOClientUserConfig = {
  nodeUrl: string
  deso: DeSoConfig
  window?: Window
}

export type BundleDAOClientConfig = Omit<BundleDAOClientUserConfig, 'deso'>
  & {
    deso: Omit<DeSoConfig, 'identityIframe'>
      & { identityIframe: HTMLIFrameElement }
  }

const DEFAULT_CONFIG: BundleDAOClientUserConfig = {
  nodeUrl: 'https://node.bundledao.io',
  deso: DEFAULT_DESO_CONFIG
}

export default class BundleDAOClient {
  signer!: Signer
  api!: BundleDAOAPI
  window!: Window
  config!: BundleDAOClientConfig

  constructor(
    currency: Currency = 'deso',
    privateKey: PrivateKey,
    config: BundleDAOClientUserConfig = DEFAULT_CONFIG
  ) {
    if (config.window) {
      this.window = config.window
    } else if (typeof window !== 'undefined') {
      this.window = window
    }

    switch (currency) {
      case 'deso':
        this.configDeSo(privateKey, config)
        break
      default:
        throw new Error(`${currency} support is not yet implemented!`)
    }

    this.api = new BundleDAOAPI(
      privateKey as IdentityServiceDeSoPrivateKey, // TODO -> seedhex/mnemonic
      this.config,
      this.window
    )
  }

  private configDeSo(
    privateKey: DeSoPrivateKey,
    config: BundleDAOClientUserConfig
  ) {
    let identityIframe!: HTMLIFrameElement
    if (typeof config.deso.identityIframe !== 'string') {
      identityIframe = config.deso.identityIframe
    } else {
      const iframeById = document.getElementById(config.deso.identityIframe)
      if (iframeById) {
        identityIframe = iframeById as HTMLIFrameElement
      }
    }

    this.config = {
      nodeUrl: config.nodeUrl,
      deso: {
        ...DEFAULT_DESO_CONFIG,
        ...config.deso,
        identityIframe
      }
    }

    if ('mnemonic' in privateKey || 'seedhex' in privateKey) {
      // TODO -> Validate seedHex or mnemonic
      throw new Error('mnemonic/seedhex signing not yet implemented')
    } else {
      const {
        encryptedSeedHex,
        accessLevelHmac,
        desoPublicKey
      } = privateKey

      if (!encryptedSeedHex || !accessLevelHmac || !desoPublicKey) {
        throw new Error(
          'desoPublicKey, encryptedSeedHex, and accessLevelHmac are'
          + ' required when signing with DeSo Identity Service'
        )
      }

      this.signer = new InjectedDeSoSigner({
        desoPublicKey,
        encryptedSeedHex,
        accessLevelHmac,
        identityUrl: this.config.deso.identityUrl,
        identityIframe: this.config.deso.identityIframe,
        window: this.window
      })
    }
  }

  async createData(
    data: string | Uint8Array,
    opts?: DataItemCreateOptions
  ): Promise<DataItem> {
    if (!this.signer) {
      throw new Error('Signer not set: please call connect() first.')
    }

    const dataItem = createData(data, this.signer, {
      ...opts,
      tags: [
        ...(opts?.tags || []),
        { name: 'App-Name', value: 'BundleDAO' },
        { name: 'App-Version', value: `client-${packageJson.version}` }
      ]
    })
    await dataItem.sign(this.signer)

    return dataItem
  }

  createBundle(items: DataItem[]): Bundle {
    const headers = Buffer.alloc(64 * items.length)
    const binaries = items.map((item, index) => {
      const header = Buffer.alloc(64)
      header.set(longTo32ByteArray(item.getRaw().byteLength), 0)
      header.set(item.rawId, 32)
      headers.set(header, 64 * index)

      return item.getRaw()
    })

    const buffer = Buffer.concat([
      longTo32ByteArray(items.length),
      headers,
      ...binaries
    ])

    return new Bundle(buffer)
  }

  async postBundle(bundle: Bundle): Promise<string> {
    const data = bundle.getRaw()

    const { txid, status, statusText } = await this.api.postBundle(data)

    if ([200, 202].includes(status)) {
      return txid
    } else if ([410].includes(status)) {
      throw new Error(`Insufficient funds (410): ${statusText}`)
    }

    throw new Error(
      `Failed to submit tx (${status}): ${statusText}`
    )
  }

  async getBalance(): Promise<{ credit: number, deso: number }> {
    return await this.api.getBalance()
  }
}
