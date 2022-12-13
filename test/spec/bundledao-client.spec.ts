import 'mocha'
import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import * as bip39 from 'bip39'
import HDKey from 'hdkey'
import secp256k1 from 'secp256k1'
import { ec as EC } from 'elliptic'
import EthereumSigner from 'arbundles/src/signing/chains/ethereumSigner'

import {
  BundleDAOClient,
  InjectedDeSoSigner
} from '../../src'
import { mnemonic, encryptedSeedHex, accessLevelHmac } from '../keys/alice.json'
import { publicKeyToDeSoPublicKey } from '../../src/util'

chai.use(chaiAsPromised)
const expect = chai.expect

const ec = new EC('secp256k1')
const seed = bip39.mnemonicToSeedSync(mnemonic)
const hdkeychain = HDKey.fromMasterSeed(seed).derive('m/44\'/0\'/0\'/0/0')
const seedhex = hdkeychain.privateKey.toString('hex')
const publicKey = secp256k1.publicKeyCreate(Buffer.from(seedhex, 'hex'), false)
const keychain = ec.keyFromPrivate(seedhex)
const desoPublicKey = publicKeyToDeSoPublicKey(keychain)
const identitySignerKey = { accessLevelHmac, encryptedSeedHex, desoPublicKey }

global.document = {
  ...global.document,
  getElementById(id: string): HTMLElement | null {
    return { id } as HTMLIFrameElement
  }
}

global.window = {
  ...global.window
}

describe('BundleDAO Client', () => {
  it('constructs with defaults', () => {
    const client = new BundleDAOClient('deso', identitySignerKey)

    expect(client.config.deso.identityUrl).to.not.be.empty
    // expect(client.api.defaults.baseURL).to.equal('https://node.bundledao.io')
  })

  it('allows custom endpoints to be set', () => {
    const nodeUrl = 'http://localhost:1985'
    const identityUrl = 'http://localhost:4201'
    const config = {
      nodeUrl,
      deso: {
        identityUrl,
        identityIframe: 'identity'
      }
    }
    const client = new BundleDAOClient('deso', identitySignerKey, config)

    expect(client.config.nodeUrl).to.equal(nodeUrl)
    expect(client.config.deso.identityUrl).to.equal(identityUrl)
  })

  it('defaults to standard identity service iframe by id', () => {
    const client = new BundleDAOClient('deso', identitySignerKey)

    expect(client.config.deso.identityIframe).to.not.be.null
    expect(client.config.deso.identityIframe).to.not.be.undefined
    expect(client.config.deso.identityIframe.id).to.equal('identity')
  })

  it('allows passing of identity service iframe by custom id', () => {
    const identityIframe = 'identity'
    const config = {
      nodeUrl: 'http://localhost:1985',
      deso: {
        identityUrl: 'http://localhost:4201',
        identityIframe
      }
    }
    const client = new BundleDAOClient('deso', identitySignerKey, config)

    expect(client.config.deso.identityIframe).to.not.be.undefined
    expect(client.config.deso.identityIframe.id).to.equal(identityIframe)
  })

  it('allows passing of identity service iframe by element reference', () => {
    const identityIframe = { id: 'identity-iframe' } as HTMLIFrameElement
    const config = {
      nodeUrl: 'http://localhost:1985',
      deso: {
        identityUrl: 'http://localhost:4201',
        identityIframe
      }
    }
    const client = new BundleDAOClient('deso', identitySignerKey, config)

    expect(client.config.deso.identityIframe).to.not.be.undefined
    expect(client.config.deso.identityIframe.id).to.equal(identityIframe.id)
  })

  it('defaults to global window for deso identity service messages', () => {
    const client = new BundleDAOClient('deso', identitySignerKey)

    expect(client.window).to.not.be.undefined
  })

  it('allows custom window for deso identity service messages', () => {
    const customWindow = { name: 'custom-window' } as Window
    const config = {
      nodeUrl: 'http://localhost:1985',
      deso: {
        identityUrl: 'http://localhost:4201',
        identityIframe: 'identity'
      },
      window: customWindow
    }
    const client = new BundleDAOClient('deso', identitySignerKey, config)

    expect(client.window).to.not.be.undefined
    expect(client.window.name).to.equal(customWindow.name)
  })

  it('TODO -> creates data item with app-version from package.json')
  it('TODO -> creates data items')//, async () => {
    // const { window } = new JSDOM('http://localhost:4201', { runScripts: 'dangerously', pretendToBeVisual: true })
    // const client = new BundleDAOClient({
    //   deso: {
    //     identityUrl: 'http://localhost:4201'
    //   },
    //   bundleDAO: { nodeUrl: 'http://localhost:1985' }
    // }, window as unknown as Window)
    // await client.connect({
    //   publicKey: desoPublicKey,
    //   encryptedSeedHex,
    //   accessLevel: 4,
    //   accessLevelHmac
    // })

    // const dataItem = await client.createData('test string')
    // const dataItem2 = await client.createData(`test string 2: ${dataItem.id}`)

    // expect(dataItem.id).to.not.equal(dataItem2.id)
    // expect(dataItem.isSigned(), 'data item is not signed').to.be.true
    // expect(await dataItem.isValid(), 'data item is not valid').to.be.true
    // expect(
    //   await EthereumSigner.verify(
    //     Buffer.from(publicKey),
    //     await dataItem.getSignatureData(),
    //     dataItem.rawSignature
    //   ),
    //   'data item could not be verified'
    // ).to.be.true
    // expect(dataItem2.isSigned(), 'data item 2 is not signed').to.be.true
    // expect(await dataItem2.isValid(), 'data item 2 is not valid').to.be.true
    // expect(
    //   await EthereumSigner.verify(
    //     Buffer.from(publicKey),
    //     await dataItem2.getSignatureData(),
    //     dataItem2.rawSignature
    //   ),
    //   'data item 2 could not be verified'
    // ).to.be.true
  //}).timeout(5000)

  it('TODO -> creates bundles')//, async () => {
    // const client = new BundleDAOClient(opts)
    // const dataItem = await client.createData('test string')
    // const dataItem2 = await client.createData(`test string 2: ${dataItem.id}`)
    // const bundle = await client.createBundle([ dataItem, dataItem2 ])

    // const verified = await bundle.verify()

    // expect(verified).to.be.true
  //})

  it('TODO -> posts bundles')//, async () => {
    // const client = new BundleDAOClient(opts)
    // const dataItem = await client.createData('test string')
    // const dataItem2 = await client.createData(`test string 2: ${dataItem.id}`)
    // const bundle = await client.createBundle([ dataItem, dataItem2 ])

    // const bundleTxId = await client.postBundle(bundle)

    // expect(bundleTxId).to.not.be.empty
  //})
  it('TODO -> requires auth info for deso signer (mnemonic/seedhex)')
  it('TODO -> calcs public key from auth info for deso signer (mnemonic/seedhex)')
})
