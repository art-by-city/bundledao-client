import 'mocha'
import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import * as bip39 from 'bip39'
import HDKey from 'hdkey'
import secp256k1 from 'secp256k1'
import { ec as EC } from 'elliptic'

import {
  BundleDAOClient,
  InjectedDeSoSigner
} from '../../src'
import { mnemonic } from '../keys/alice.json'
import { publicKeyToDeSoPublicKey } from '../../src/util'

chai.use(chaiAsPromised)
const expect = chai.expect

const ec = new EC('secp256k1')
const seed = bip39.mnemonicToSeedSync(mnemonic)
const hdkeychain = HDKey.fromMasterSeed(seed).derive('m/44\'/0\'/0\'/0/0')
const seedHex = hdkeychain.privateKey.toString('hex')
const publicKey = secp256k1.publicKeyCreate(Buffer.from(seedHex, 'hex'), false)
const keychain = ec.keyFromPrivate(seedHex)
const desoPublicKey = publicKeyToDeSoPublicKey(keychain)

describe('BundleDAO Client', () => {
  it('constructs with defaults', () => {
    const client = new BundleDAOClient()

    expect(client.useIdentity).to.be.true
    expect(client.identityUrl).to.not.be.empty
    expect(client.arweave.api.config.protocol).to.equal('https')
    expect(client.arweave.api.config.host).to.equal('arweave.net')
    expect(client.arweave.api.config.port).to.equal(443)
    expect(client.api.defaults.baseURL).to.equal('https://node.bundledao.io')
  })

  it('allows custom identity service url to be set', () => {
    const identityUrl = 'http://localhost:4201'
    const client = new BundleDAOClient({ deso: { identityUrl } })

    expect(client.identityUrl).to.equal(identityUrl)
  })

  it('allows custom arweave client config', () => {
    const arweave = {
      protocol: 'http',
      host: 'localhost',
      port: 1984
    }
    const client = new BundleDAOClient({ arweave })

    expect(client.arweave.api.config.protocol).to.equal(arweave.protocol)
    expect(client.arweave.api.config.host).to.equal(arweave.host)
    expect(client.arweave.api.config.port).to.equal(arweave.port)
  })

  it('allows custom bundledao node endpoint', () => {
    const nodeUrl = 'http://localhost:1985'
    const client = new BundleDAOClient({ bundleDAO: { nodeUrl } })

    expect(client.api.defaults.baseURL).to.equal(nodeUrl)
  })

  it('requires connect() be called before creating data items', async () => {
    const client = new BundleDAOClient()

    expect(client.createData('test')).to.be.rejected
    expect(client.createData('test')).to.not.be.rejected
  })

  it('requires auth info for connect() with injected deso signer', () => {
    const encryptedSeedHex = 'test-encrypted-seed-hex'
    const accessLevel = 4
    const accessLevelHmac = 'test-access-level-hmac'
    const client = new BundleDAOClient()
    const useIdentityOpts = {
      useIdentity: true,
      publicKey: desoPublicKey,
      encryptedSeedHex,
      accessLevel,
      accessLevelHmac
    }

    const injectedSigner = async () => {
      await client.connect(useIdentityOpts)

      return client.signer
    }

    return Promise.all([
      expect(client.connect({})).to.be.rejected,
      expect(client.connect({ encryptedSeedHex })).to.be.rejected,
      expect(client.connect({ encryptedSeedHex, accessLevel })).to.be.rejected,
      expect(client.connect({ encryptedSeedHex, accessLevelHmac })).to.be.rejected,
      expect(client.connect({ accessLevel })).to.be.rejected,
      expect(client.connect({ accessLevel, accessLevelHmac })).to.be.rejected,
      expect(client.connect({ accessLevelHmac })).to.be.rejected,
      expect(client.connect(useIdentityOpts)).to.not.be.rejected,
      expect(injectedSigner()).to.eventually.be.instanceOf(InjectedDeSoSigner)
    ])
  })

  // it('creates data items', async () => {
  //   const client = new BundleDAOClient(opts)

  //   const dataItem = await client.createData('test string')
  //   const dataItem2 = await client.createData(`test string 2: ${dataItem.id}`)

  //   expect(dataItem.id).to.not.equal(dataItem2.id)
  //   expect(dataItem.isSigned(), 'data item is not signed').to.be.true
  //   expect(await dataItem.isValid(), 'data item is not valid').to.be.true
  //   expect(
  //     await EthereumSigner.verify(
  //       Buffer.from(publicKey),
  //       await dataItem.getSignatureData(),
  //       dataItem.rawSignature
  //     ),
  //     'data item could not be verified'
  //   ).to.be.true
  //   expect(dataItem2.isSigned(), 'data item 2 is not signed').to.be.true
  //   expect(await dataItem2.isValid(), 'data item 2 is not valid').to.be.true
  //   expect(
  //     await EthereumSigner.verify(
  //       Buffer.from(publicKey),
  //       await dataItem2.getSignatureData(),
  //       dataItem2.rawSignature
  //     ),
  //     'data item 2 could not be verified'
  //   ).to.be.true
  // })

  // it('creates bundles', async () => {
  //   const client = new BundleDAOClient(opts)
  //   const dataItem = await client.createData('test string')
  //   const dataItem2 = await client.createData(`test string 2: ${dataItem.id}`)
  //   const bundle = await client.createBundle([ dataItem, dataItem2 ])

  //   const verified = await bundle.verify()

  //   expect(verified).to.be.true
  // })

  // it('posts bundles', async () => {
  //   const client = new BundleDAOClient(opts)
  //   const dataItem = await client.createData('test string')
  //   const dataItem2 = await client.createData(`test string 2: ${dataItem.id}`)
  //   const bundle = await client.createBundle([ dataItem, dataItem2 ])

  //   const bundleTxId = await client.postBundle(bundle)

  //   expect(bundleTxId).to.not.be.empty
  // })

  // it('gets derived key from node', async () => {
  //   const client = new BundleDAOClient(opts)

  //   const nodePublicKey = await client.getNodePublicKey()

  //   expect(nodePublicKey).to.not.be.empty
  // })
})
