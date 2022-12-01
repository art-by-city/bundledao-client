import { Buffer } from 'buffer'
import { ec as EC } from 'elliptic'
import bs58check from 'bs58check'

export function longTo32ByteArray(long: number): Uint8Array {
  // we want to represent the input as a 8-bytes array
  const byteArray = [
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
  ];

  for (let index = 0; index < byteArray.length; index++) {
    const byte = long & 0xff;
    byteArray[index] = byte;
    long = (long - byte) / 256;
  }

  return Buffer.from(byteArray);
}

export function desoPublicKeyToECKeyPair(publicKey: string): EC.KeyPair {
  // Sanity check similar to Base58CheckDecodePrefix from core/lib/base58.go
  if (publicKey.length < 5) {
    throw new Error('Failed to decode public key')
  }
  const decoded = bs58check.decode(publicKey)
  const payload = Uint8Array.from(decoded).slice(3)

  const ec = new EC('secp256k1')
  return ec.keyFromPublic(payload, 'array')
}

export function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
  });
}

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
export function publicKeyToDeSoPublicKey(publicKey: EC.KeyPair): string {
  const prefix = PUBLIC_KEY_PREFIXES['mainnet'].deso
  const key = publicKey.getPublic().encode('array', true)
  return bs58check.encode(Buffer.from([...prefix, ...key]))
}
