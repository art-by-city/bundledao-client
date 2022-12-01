import { Bundle, createData, DataItem, DataItemCreateOptions } from 'arbundles'
import EthereumSigner from 'arbundles/src/signing/chains/ethereumSigner'
import Arweave from 'arweave'
import axios, { AxiosInstance } from 'axios'
import { Buffer } from 'buffer'
import { Signer } from 'arbundles/src/signing'
import InjectedDeSoSigner from './injected-deso-signer'

import { longTo32ByteArray } from './util'

export type BundleDAOClientConfig = {
  deso?: {
    seedHex?: string
    mnemonic?: string
    identityUrl?: string
  },
  bundleDAO?: { nodeUrl: string },
  arweave?: {
    protocol: string,
    host: string,
    port: number,
    baseURL?: string
  }
}

export default class BundleDAOClient {
  signer!: Signer
  arweave!: Arweave
  api!: AxiosInstance
  identityUrl!: string
  useIdentity: boolean = true

  constructor(config?: BundleDAOClientConfig) {
    this.identityUrl = config?.deso?.identityUrl || 'https://identity.deso.org'
    const arweaveConfig = config?.arweave || {
      protocol: 'https',
      host: 'arweave.net',
      port: 443
    }
    this.arweave = new Arweave(arweaveConfig)
    this.api = axios.create({
      baseURL: config?.bundleDAO?.nodeUrl || 'https://node.bundledao.io'
    })

  }

  async connect(opts: {
    seedHex?: string,
    mnemonic?: string,
    useIdentity?: boolean,
    publicKey?: string,
    encryptedSeedHex?: string,
    accessLevel?: number,
    accessLevelHmac?: string
  }): Promise<void> {
    const {
      seedHex,
      mnemonic,
      publicKey,
      encryptedSeedHex,
      accessLevel,
      accessLevelHmac
    } = opts

    let { useIdentity } = opts

    if (!mnemonic && !seedHex) {
      useIdentity = true
    }

    if (!useIdentity) {
      // TODO -> Validate seedHex or mnemonic
    } else {
      if (!encryptedSeedHex || !accessLevel || !accessLevelHmac || !publicKey) {
        throw new Error(
          'publicKey, encryptedSeedHex, accessLevel, and accessLevelHmac are'
          + ' required when connecting with DeSo Identity Service'
        )
      }

      this.signer = new InjectedDeSoSigner(publicKey, (id, message) => {
        window.postMessage({
          id,
          service: 'identity',
          method: 'signETH',
          payload: {
            unsignedHashes: [ message ],
            encryptedSeedHex,
            accessLevel,
            accessLevelHmac
          }
        }, { targetOrigin: this.identityUrl })
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
        { name: 'App-Name', value: 'BundleDAO' }, // TODO
        { name: 'App-Version', value: '0.1.0'} // TODO
      ]
    })
    await dataItem.sign(this.signer)

    return dataItem
  }

  async createBundle(items: DataItem[]): Promise<Bundle> {
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

    const { data: txid, status, statusText } = await this.api.post(
      '/bundle',
      data
    )

    if ([200, 202].includes(status)) {
      return txid
    } else if ([410].includes(status)) {
      throw new Error(`Insufficient funds (410): ${statusText}`)
    }

    throw new Error(
      `Failed to submit tx (${status}): ${statusText}`
    )
  }
}
