import Secp256k1 from 'arbundles/src/signing/keys/secp256k1'
import secp256k1 from 'secp256k1'
import * as bip39 from 'bip39'
import HDKey from 'hdkey'
import { SignatureConfig, SIG_CONFIG } from 'arbundles/src/constants'
import { ec as EC } from 'elliptic'
import { ethers } from 'ethers'
import { arrayify, hashMessage } from 'ethers/lib/utils'
import { Buffer } from 'buffer'
import base64url from 'base64url'

export default class DeSoSigner extends Secp256k1 {
  readonly ownerLength = SIG_CONFIG[SignatureConfig.ETHEREUM].pubLength
  readonly signatureLength = SIG_CONFIG[SignatureConfig.ETHEREUM].sigLength
  readonly signatureType = SignatureConfig.ETHEREUM

  public get publicKey(): Buffer {
    return Buffer.from(this.pk, 'hex')
  }

  constructor(mnemonic: string) {
    const seed = bip39.mnemonicToSeedSync(mnemonic)
    const keychain = HDKey.fromMasterSeed(seed).derive('m/44\'/0\'/0\'/0/0')
    const seedHex = keychain.privateKey.toString('hex')
    const pub = secp256k1.publicKeyCreate(Buffer.from(seedHex, 'hex'), false)

    super(seedHex, Buffer.from(pub))
  }

  sign(message: Uint8Array): Uint8Array {
    const ec = new EC('secp256k1')
    const keychain = ec.keyFromPrivate(this._key)
    const signature = keychain.sign(arrayify(hashMessage(message)), { canonical: true })
    const formattedSignature = {
      r: '0x' + signature.r.toString(16),
      s: '0x' + signature.s.toString(16),
      v: signature.recoveryParam || 0,
    }
    const joinedSignature = ethers.utils.joinSignature({
      r: ethers.utils.hexZeroPad(formattedSignature.r, 32),
      s: ethers.utils.hexZeroPad(formattedSignature.s, 32),
      recoveryParam: formattedSignature.v
    })

    return Buffer.from(joinedSignature.slice(2), 'hex')
  }

  static async verify(
    pk: Buffer,
    message: Uint8Array,
    signature: Uint8Array
  ): Promise<boolean> {
    const msg = arrayify(hashMessage(message))

    return secp256k1.ecdsaVerify(
      (signature.length === 65) ? signature.slice(0, -1) : signature,
      msg,
      (typeof pk === 'string') ? base64url.toBuffer(pk) : pk,
    )
  }
}
