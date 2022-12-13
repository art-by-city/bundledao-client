import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios'
import { Buffer } from 'buffer'

import { BundleDAOClientConfig, IdentityServiceDeSoPrivateKey } from './'
import { memoize, uuid } from './util'

const MAX_RETRIES = 1

export default class BundleDAOAPI {
  api!: AxiosInstance
  private retries: number = 0

  constructor(
    private readonly privateKey: IdentityServiceDeSoPrivateKey,
    private readonly config: BundleDAOClientConfig,
    private readonly window: Window
  ) {
    this.api = axios.create({
      baseURL: config.nodeUrl
    })
    this.api.interceptors.request.use(
      this.interceptRequest.bind(this),
      error => Promise.reject(error)
    )
    this.api.interceptors.response.use(
      response => response,
      this.interceptResponseError.bind(this)
    )
  }

  private async setAuthHeaders(
    headers: any
  ): Promise<any> {
    const jwt = await this.refreshJwt()
    headers = {
      ...headers,
      Authorization: `${this.privateKey.desoPublicKey} ${jwt}`
    }

    return headers
  }

  private async interceptRequest(
    config: AxiosRequestConfig
  ): Promise<AxiosRequestConfig> {
    config.headers = await this.setAuthHeaders(config.headers)

    return config
  }

  private async interceptResponseError(error: AxiosError) {
    const { response, config } = error
    if (401 === response?.status) {
      if (this.retries < MAX_RETRIES) {
        config.headers = await this.setAuthHeaders(config.headers)
        this.retries++

        return this.api(config)
      } else {
        this.retries = 0

        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  }

  @memoize({
    /* @dev: DeSo JWT are valid for 10 minutes */
    maxAge: 60 * 10 * 1000,
    promise: true,
    preFetch: true
  })
  private async refreshJwt(): Promise<string> {
    return new Promise((resolve, reject) => {
      const id = uuid()

      const handleJwtResponse = (event: MessageEvent<any>) => {
        if (event.data.id === id) {
          const { payload: { jwt } } = event.data
          if (jwt) {
            resolve(jwt)
          } else {
            reject(new Error('[BundleDAOAPI] Could not get jwt!'))
          }
          this.window.removeEventListener('message', handleJwtResponse)
        }
      }

      this.window.addEventListener('message', handleJwtResponse)

      this.config.deso.identityIframe.contentWindow!.postMessage({
        id,
        service: 'identity',
        method: 'jwt',
        payload: {
          accessLevel: 4,
          encryptedSeedHex: this.privateKey.encryptedSeedHex,
          accessLevelHmac: this.privateKey.accessLevelHmac
        }
      }, this.config.deso.identityUrl)
    })
  }

  async postBundle(bundle: Buffer): Promise<{
    txid: string,
    status: number,
    statusText: string
  }> {
    const {
      data: txid,
      status,
      statusText
    } = await this.api.post('/bundle', bundle)

    return { txid, status, statusText }
  }

  async getBalance(): Promise<{ credit: number, deso: number }> {
    const { data: { credit, deso } } = await this.api.get('/balance')

    return { credit, deso }
  }
}
