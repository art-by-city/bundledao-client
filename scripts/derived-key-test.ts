import axios from 'axios'
import { ec as EC } from 'elliptic'
import * as bip39 from 'bip39'
import HDKey from 'hdkey'
import bs58check from 'bs58check'
import sha256 from 'sha256'
import { ethers } from 'ethers'

import alice from '../test/keys/alice.json'
import bob from '../test/keys/bob.json'

const aliceSeed = bip39.mnemonicToSeedSync(alice.mnemonic)
const aliceKeychain = HDKey.fromMasterSeed(aliceSeed).derive('m/44\'/0\'/0\'/0/0')
const aliceSeedHex = aliceKeychain.privateKey.toString('hex')

enum NFTLimitOperationString {
  ANY = 'any',
  UPDATE = 'update',
  BID = 'nft_bid',
  ACCEPT_BID = 'accept_nft_bid',
  TRANSFER = 'transfer',
  BURN = 'burn',
  ACCEPT_TRANSFER = 'accept_nft_transfer',
}
type LimitOperationString =
  | DAOCoinLimitOperationString
  | CreatorCoinLimitOperationString
  | NFTLimitOperationString
type OperationToCountMap<T extends LimitOperationString> = {
  [operation in T]?: number;
}
enum CreatorCoinLimitOperationString {
  ANY = 'any',
  BUY = 'buy',
  SELL = 'sell',
  TRANSFER = 'transfer',
}
enum DAOCoinLimitOperationString {
  ANY = 'any',
  MINT = 'mint',
  BURN = 'burn',
  DISABLE_MINTING = 'disable_minting',
  UPDATE_TRANSFER_RESTRICTION_STATUS = 'update_transfer_restriction_status',
  TRANSFER = 'transfer',
}
type CoinLimitOperationString =
  | DAOCoinLimitOperationString
  | CreatorCoinLimitOperationString
type CoinOperationLimitMap<T extends CoinLimitOperationString> = {
  [publicKey: string]: OperationToCountMap<T>;
}
type CreatorCoinOperationLimitMap =
  CoinOperationLimitMap<CreatorCoinLimitOperationString>
type DAOCoinOperationLimitMap =
  CoinOperationLimitMap<DAOCoinLimitOperationString>
type NFTOperationLimitMap = {
  [postHashHex: string]: {
    [serialNumber: number]: OperationToCountMap<NFTLimitOperationString>;
  };
}
type DAOCoinLimitOrderLimitMap = {
  [buyingPublicKey: string]: { [sellingPublicKey: string]: number };
}
interface TransactionSpendingLimitResponse {
  GlobalDESOLimit: number;
  // TODO: make enum for transaction type string
  TransactionCountLimitMap?: { [k: string]: number };
  CreatorCoinOperationLimitMap?: CreatorCoinOperationLimitMap;
  DAOCoinOperationLimitMap?: DAOCoinOperationLimitMap;
  NFTOperationLimitMap?: NFTOperationLimitMap;
  DAOCoinLimitOrderLimitMap?: DAOCoinLimitOrderLimitMap;
  IsUnlimited?: boolean;
  DerivedKeyMemo?: string;
}

function publicKeyToECKeyPair(publicKey: string): EC.KeyPair {
  // Sanity check similar to Base58CheckDecodePrefix from core/lib/base58.go
  if (publicKey.length < 5) {
    throw new Error('Failed to decode public key');
  }
  const decoded = bs58check.decode(publicKey);
  const payload = Uint8Array.from(decoded).slice(3);

  const ec = new EC('secp256k1');
  return ec.keyFromPublic(payload, 'array');
}

// Decode public key base58check to Buffer of secp256k1 public key
function publicKeyToBuffer(publicKey: string): number[] {
  const publicKeyEC = publicKeyToECKeyPair(publicKey)

  return publicKeyEC.getPublic().encode('array', true)
}

function uint64ToBufBigEndian (uint: number): Buffer {
  const result: any[] = [];

  while (BigInt(uint) >= BigInt(0xff)) {
    result.push(Number(BigInt(uint) & BigInt(0xff)));
    uint = Number(BigInt(uint) >> BigInt(8));
  }

  result.push(Number(BigInt(uint) | BigInt(0)));

  while (result.length < 8) {
    result.push(0);
  }

  return Buffer.from(result.reverse());
}

function signHashes(seedHex: string, unsignedHashes: string[]): string[] {
  const ec = new EC('secp256k1')
  const privateKey = ec.keyFromPrivate(seedHex)
  const signedHashes: string[] = [];

  for (const unsignedHash of unsignedHashes) {
    const signature = privateKey.sign(unsignedHash);
    const signatureBytes = Buffer.from(signature.toDER());
    console.log('signHashes() signatureBytes.byteLength', signatureBytes.byteLength)
    const hexString = signatureBytes.toString('hex')
    console.log('signHashes() hexString.length', hexString.length)
    signedHashes.push(hexString);
  }

  return signedHashes;
}

function signHashesETH(
  seedHex: string,
  unsignedHashes: string[]
): { s: any; r: any; v: number | null }[] {
  const ec = new EC('secp256k1')
  const privateKey = ec.keyFromPrivate(seedHex)
  const signedHashes: { s: any; r: any; v: number | null }[] = [];

  for (const unsignedHash of unsignedHashes) {
    const signature = privateKey.sign(unsignedHash, { canonical: true });

    signedHashes.push({
      s: '0x' + signature.s.toString('hex'),
      r: '0x' + signature.r.toString('hex'),
      v: signature.recoveryParam,
    });
  }

  return signedHashes;
}

const api = axios.create({ baseURL: 'http://localhost:18001' })
async function main() {
  const derivedPublicKeyBuffer = publicKeyToBuffer(bob.publicKey)
  const expirationBlockBuffer = uint64ToBufBigEndian(1e9)
  let accessBytes: number[] = [
    ...derivedPublicKeyBuffer,
    ...expirationBlockBuffer,
  ]
  const accessHash = sha256.x2(accessBytes)
  // const AccessSignature = signHashes(aliceSeedHex, [
  //   accessHash,
  // ])[0]
  // const signature = signHashesETH(aliceSeedHex, [ accessHash ])[0]
  const ec = new EC('secp256k1')
  const privateKey = ec.keyFromPrivate(aliceSeedHex)
  const signature = privateKey.sign(accessHash, { canonical: true })
  const r = ethers.utils.hexZeroPad('0x' + signature.r.toString(16), 32)
  console.log('r', r.length, r)
  const joinedSignature = ethers.utils.joinSignature({
    recoveryParam: signature.recoveryParam || undefined,
    r: ethers.utils.hexZeroPad('0x' + signature.r.toString(16), 32),
    s: ethers.utils.hexZeroPad('0x' + signature.s.toString(16), 32),
  })
  console.log('joinedSignature', joinedSignature.length, joinedSignature)
  const AccessSignature = Buffer.from(joinedSignature.substring(2), 'hex')
  const acs = AccessSignature.toString('hex')
  console.log('acs', acs.length, acs)

  console.log('AccessSignature', AccessSignature.length, AccessSignature)

  const TransactionSpendingLimit: TransactionSpendingLimitResponse = {
    GlobalDESOLimit: 10000000
  }

  const getTransactionSpendingLimitHexString = await api.post('/api/v0/get-transaction-spending-limit-hex-string', {
    TransactionSpendingLimit
  })
  console.log('getTransactionSpendingLimitHexString', getTransactionSpendingLimitHexString.status, getTransactionSpendingLimitHexString.data)
  const TransactionSpendingLimitHex = getTransactionSpendingLimitHexString.data.HexString

  try {
    // https://github.com/deso-protocol/deso-workspace/blob/master/libs/deso-protocol/src/lib/user/User.ts#L168
    const authorizeDerivedKey = await api.post(`/api/v0/authorize-derived-key`, {
      OwnerPublicKeyBase58Check: alice.publicKey,
      DerivedPublicKeyBase58Check: bob.publicKey,
      DerivedKeySignature: true,
      ExpirationBlock: 100000,
      AccessSignature: AccessSignature.toString('hex'),
      DeleteKey: false,
      MinFeeRateNanosPerKB: 1000,

      TransactionSpendingLimitHex,

      AppName: 'BundleDAO',
      // TransactionFees: [],
      // Memo: '',
      // ExtraData: {}
    })

    console.log(
      'authorizeDerivedKey',
      authorizeDerivedKey.status,
      authorizeDerivedKey.data
    )
  } catch (e) {
    console.error('ERROR /authorize-derived-key', e.message, e.response.data.error)
  }

  // const res = await api.post(`/api/v0/get-user-derived-keys`, {
  //   PublicKeyBase58Check: alice.publicKey
  // })
  // console.log(res.data)
}

(() => main().catch(e => console.error(e)))()
