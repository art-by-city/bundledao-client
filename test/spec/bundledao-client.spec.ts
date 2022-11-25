import 'mocha'
import { expect } from 'chai'
import * as bip39 from 'bip39'
import HDKey from 'hdkey'
import secp256k1 from 'secp256k1'
import EthereumSigner from 'arbundles/src/signing/chains/ethereumSigner'

import { mnemonic } from '../keys/alice.json'
import { BundleDAOClient, BundleDAOClientConfig } from '../../src'

const seed = bip39.mnemonicToSeedSync(mnemonic)
const keychain = HDKey.fromMasterSeed(seed).derive('m/44\'/0\'/0\'/0/0')
const seedHex = keychain.privateKey.toString('hex')
const publicKey = secp256k1.publicKeyCreate(Buffer.from(seedHex, 'hex'), false)
const opts: BundleDAOClientConfig = {
  deso: {
    seedHex
  },
  bundleDAO: {
    protocol: 'http',
    host: 'localhost',
    port: 1985
  }
}

describe('BundleDAO Client', () => {
  it('constructs with opts', () => {
    expect(() => { new BundleDAOClient(opts) }).to.not.throw()
  })

  it('creates data items', async () => {
    const client = new BundleDAOClient(opts)

    const dataItem = await client.createData('test string')
    const dataItem2 = await client.createData(`test string 2: ${dataItem.id}`)

    expect(dataItem.id).to.not.equal(dataItem2.id)
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
    expect(dataItem2.isSigned(), 'data item 2 is not signed').to.be.true
    expect(await dataItem2.isValid(), 'data item 2 is not valid').to.be.true
    expect(
      await EthereumSigner.verify(
        Buffer.from(publicKey),
        await dataItem2.getSignatureData(),
        dataItem2.rawSignature
      ),
      'data item 2 could not be verified'
    ).to.be.true
  })

  it('creates bundles', async () => {
    const client = new BundleDAOClient(opts)
    const dataItem = await client.createData('test string')
    const dataItem2 = await client.createData(`test string 2: ${dataItem.id}`)
    const bundle = await client.createBundle([ dataItem, dataItem2 ])

    const verified = await bundle.verify()

    expect(verified).to.be.true
  })

  it('posts bundles', async () => {
    const client = new BundleDAOClient(opts)
    const dataItem = await client.createData('test string')
    const dataItem2 = await client.createData(`test string 2: ${dataItem.id}`)
    const bundle = await client.createBundle([ dataItem, dataItem2 ])

    const bundleTxId = await client.postBundle(bundle)

    expect(bundleTxId).to.not.be.empty
  })

  it('gets derived key from node', async () => {
    const client = new BundleDAOClient(opts)

    const nodePublicKey = await client.getNodePublicKey()

    expect(nodePublicKey).to.not.be.empty
  })
})
