import { SignatureConfig, SIG_CONFIG } from 'arbundles/src/constants'
import { Signer } from 'arbundles/src/signing'
import secp256k1 from 'secp256k1'
import base64url from 'base64url'
import { ethers } from 'ethers'
import { arrayify, hashMessage } from 'ethers/lib/utils'

import { desoPublicKeyToECKeyPair, uuid } from './util'

export default class InjectedDeSoSigner implements Signer {
  readonly ownerLength = SIG_CONFIG[SignatureConfig.ETHEREUM].pubLength
  readonly signatureLength = SIG_CONFIG[SignatureConfig.ETHEREUM].sigLength
  readonly signatureType = SignatureConfig.ETHEREUM

  private readonly identityUrl!: string
  private readonly encryptedSeedHex!: string
  private readonly accessLevelHmac!: string
  private readonly identityIframe!: HTMLIFrameElement
  private readonly window!: Window

  private readonly _pub!: Buffer
  get publicKey(): Buffer {
    return this._pub
  }

  constructor(opts: {
    desoPublicKey: string,
    encryptedSeedHex: string,
    accessLevelHmac: string,
    identityUrl: string,
    identityIframe: HTMLIFrameElement,
    window: Window
  }) {
    const keypair = desoPublicKeyToECKeyPair(opts.desoPublicKey)
    this._pub = Buffer.from(keypair.getPublic().encode('array', false))
    this.encryptedSeedHex = opts.encryptedSeedHex
    this.accessLevelHmac = opts.accessLevelHmac
    this.identityUrl = opts.identityUrl
    this.identityIframe = opts.identityIframe
    this.window = opts.window
  }

  async sign(message: Uint8Array): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      const id = uuid()
      const handleMessageSignedEvent = (event: MessageEvent<any>) => {
        if (event.data.id === id) {
          const signatures: {
            r: string,
            s: string,
            v: number
          }[] = event.data.payload.signatures

          const signature = ethers.utils.joinSignature({
            r: ethers.utils.hexZeroPad(signatures[0].r, 32),
            s: ethers.utils.hexZeroPad(signatures[0].s, 32),
            recoveryParam: signatures[0].v
          })

          if (signature) {
            resolve(Buffer.from(signature.slice(2), 'hex'))
          } else {
            reject(new Error('[InjectedDeSoSigner] Could not get signature!'))
          }
          this.window.removeEventListener('message', handleMessageSignedEvent)
        }
      }

      this.window.addEventListener('message', handleMessageSignedEvent)
      this.identityIframe.contentWindow!.postMessage({
        id,
        service: 'identity',
        method: 'signETH',
        payload: {
          unsignedHashes: [ arrayify(hashMessage(message)) ],
          accessLevel: 4,
          encryptedSeedHex: this.encryptedSeedHex,
          accessLevelHmac: this.accessLevelHmac
        }
      }, this.identityUrl)
    })
  }

  static verify(
    pk: Buffer,
    message: Uint8Array,
    signature: Uint8Array
  ): boolean {
    const msg = arrayify(hashMessage(message))

    return secp256k1.ecdsaVerify(
      (signature.length === 65) ? signature.slice(0, -1) : signature,
      msg,
      (typeof pk === 'string') ? base64url.toBuffer(pk) : pk,
    )
  }
}
