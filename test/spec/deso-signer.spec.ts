import 'mocha'
import { expect } from 'chai'
import { createData } from 'arbundles'
import * as bip39 from 'bip39'
import HDKey from 'hdkey'
import secp256k1 from 'secp256k1'
import EthereumSigner from 'arbundles/src/signing/chains/ethereumSigner'

import { DeSoSigner } from '../../src'

import { mnemonic } from '../keys/alice.json'

const seed = bip39.mnemonicToSeedSync(mnemonic)
const keychain = HDKey.fromMasterSeed(seed).derive('m/44\'/0\'/0\'/0/0')
const seedHex = keychain.privateKey.toString('hex')
const publicKey = secp256k1.publicKeyCreate(Buffer.from(seedHex, 'hex'), false)

describe('DeSo Signer', () => {
  it('signs and verifies data items', async () => {
    const signer = new DeSoSigner(mnemonic)
    const dataItem = createData('test string', signer)
    await dataItem.sign(signer)

    expect(dataItem.isSigned(), 'data item is not signed').to.be.true
    // expect(await dataItem.isValid(), 'data item is not valid').to.be.true
    expect(
      await DeSoSigner.verify(
        Buffer.from(publicKey),
        await dataItem.getSignatureData(),
        dataItem.rawSignature
      ),
      'data item could not be verified'
    ).to.be.true
  })

  it('[ETH] signs and verifies data items', async () => {
    const signer = new EthereumSigner(seedHex)
    const dataItem = createData('test string', signer)
    await dataItem.sign(signer)

    expect(dataItem.isSigned(), 'data item is not signed').to.be.true
    expect(await dataItem.isValid(), 'data item is not valid').to.be.true
    expect(
      await EthereumSigner.verify(
        Buffer.from(publicKey),
        await dataItem.getSignatureData(),
        dataItem.rawSignature
      ),
      'data item could not be verified'
    ).to.be.true
  })
})
