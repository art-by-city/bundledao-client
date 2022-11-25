import Secp256k1 from 'arbundles/src/signing/keys/secp256k1'
import secp256k1 from 'secp256k1'
import * as bip39 from 'bip39'
import HDKey from 'hdkey'
import { SignatureConfig, SIG_CONFIG } from 'arbundles/src/constants'
import { ec as EC } from 'elliptic'
import { ethers } from 'ethers'

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
    const signature = keychain.sign(message, { canonical: true })
    const joinedSignature = ethers.utils.joinSignature({
      recoveryParam: signature.recoveryParam || undefined,
      r: ethers.utils.hexZeroPad('0x' + signature.r.toString(16), 32),
      s: ethers.utils.hexZeroPad('0x' + signature.s.toString(16), 32),
    })

    return Buffer.from(joinedSignature.substring(2), 'hex')
  }

  static async verify(
    pk: Buffer,
    message: Uint8Array,
    signature: Uint8Array
  ): Promise<boolean> {
    let verified = false

    try {
      const ec = new EC('secp256k1')
      const keychain = ec.keyFromPublic(pk)
      const sigBuffer = Buffer.from(signature)
      const m = sigBuffer.toString('hex').match(/([a-f\d]{64})/gi)

      if (m !== null) {
        verified = keychain.verify(message, { r: m[0], s: m[1] })
      }
    } catch (e) {}

    return verified
  }
}
