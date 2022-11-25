import { randomBytes } from 'crypto'
import * as bip39 from 'bip39'
import bs58check from 'bs58check'
import { ec as EC } from 'elliptic'
import HDKey from 'hdkey'

const PUBLIC_KEY_PREFIXES = {
  mainnet: {
    bitcoin: [0x00],
    deso: [0xcd, 0x14, 0x0],
  },
  testnet: {
    bitcoin: [0x6f],
    deso: [0x11, 0xc2, 0x0],
  },
}

const aliceSeed = bip39.mnemonicToSeedSync('favorite dutch must lift cart supreme bicycle elbow travel coin fruit learn')
const aliceKeychain = HDKey.fromMasterSeed(aliceSeed).derive('m/44\'/0\'/0\'/0/0')
const aliceSeedHex = aliceKeychain.privateKey.toString('hex')
const ec = new EC('secp256k1')
const privateKey = ec.keyFromPrivate(aliceSeedHex)
const prefix = PUBLIC_KEY_PREFIXES['mainnet'].deso
const key = privateKey.getPublic().encode('array', true)
const prefixAndKey = Uint8Array.from([...prefix, ...key])
const desopublickey = bs58check.encode(prefixAndKey)
console.log('desopublickey', desopublickey)

// class EntropyGeneratorConstants {
//   static DEFAULT_ENTROPY_BYTES = 16
//   static ENTROPY_ALIGNMENT_BYTES = 4
//   static MIN_ENTROPY_BYTES = 16
//   static MAX_ENTROPY_BYTES = 64
// }

// const entropy = randomBytes(EntropyGeneratorConstants.DEFAULT_ENTROPY_BYTES)
// const mnemonic = bip39.entropyToMnemonic(entropy)
// const temporaryEntropy = {
//   entropy,
//   extraText: '',
//   mnemonic
// }

// const contents = temporaryEntropy?.mnemonic

// const ec = new EC('secp256k1')
// const key = ec.keyFromPrivate(contents)

// const seedHex = key.getPrivate('hex')
// console.log('seedHex', seedHex.length, seedHex)

// const seedHexBuffer = Buffer.from(seedHex, 'hex')
// console.log('seedHexBuffer', seedHexBuffer.byteLength)

// console.log(contents)

// const entropy2 = bip39.mnemonicToEntropy(mnemonic)
// console.log('entropy', entropy.toString('hex'))
// console.log('entropy2', entropy2)


