import { SignatureConfig, SIG_CONFIG } from 'arbundles/src/constants'
import { Signer } from 'arbundles/src/signing'
import { arrayify, hashMessage } from 'ethers/lib/utils'
import secp256k1 from 'secp256k1'
import base64url from 'base64url'
import { ethers } from 'ethers'

import { desoPublicKeyToECKeyPair, uuid } from './util'

export default class InjectedDeSoSigner implements Signer {
  readonly ownerLength = SIG_CONFIG[SignatureConfig.ETHEREUM].pubLength
  readonly signatureLength = SIG_CONFIG[SignatureConfig.ETHEREUM].sigLength
  readonly signatureType = SignatureConfig.ETHEREUM

  private signatureRequestCallback!: (id: string, message: string | Uint8Array) => void

  private readonly _pub!: Buffer
  get publicKey(): Buffer {
    return this._pub
  }

  constructor(
    desoPublicKey: string,
    signatureRequestCallback: (id: string, message: string | Uint8Array) => void
  ) {
    const keypair = desoPublicKeyToECKeyPair(desoPublicKey)
    this._pub = Buffer.from(keypair.getPublic().encode('array', false))
    this.signatureRequestCallback = signatureRequestCallback
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
          window.removeEventListener('message', handleMessageSignedEvent)
        }
      }

      window.addEventListener('message', handleMessageSignedEvent)
      this.signatureRequestCallback(id, arrayify(hashMessage(message)))
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
