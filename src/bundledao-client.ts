import { Bundle, createData, DataItem, DataItemCreateOptions } from 'arbundles'
import { longTo32ByteArray } from 'arbundles/src/utils'
import EthereumSigner from 'arbundles/src/signing/chains/ethereumSigner'
import Arweave from 'arweave'
import axios, { AxiosInstance } from 'axios'

export type BundleDAOClientConfig = {
  deso: {
    seedHex: string
  },
  bundleDAO: {
    protocol: string,
    host: string,
    port: number
  }
}

export default class BundleDAOClient {
  signer!: EthereumSigner
  arweave!: Arweave
  api!: AxiosInstance

  constructor(opts: BundleDAOClientConfig) {
    this.signer = new EthereumSigner(opts.deso.seedHex)
    const { protocol, host, port } = opts.bundleDAO
    this.arweave = new Arweave({ protocol, host, port })
    const baseURL = `${protocol}://${host}:${port}`
    this.api = axios.create({ baseURL })
  }

  async getNodePublicKey(): Promise<string> {
    const { data } = await this.api.get('/derived-key')

    return data
  }

  async createData(
    data: string | Uint8Array,
    opts?: DataItemCreateOptions
  ): Promise<DataItem> {
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

  async postBundle(
    bundle: Bundle,
    tags?: { name: string, value: string }[]
  ): Promise<string> {
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
