import 'mocha'
import { expect } from 'chai'
import { createData } from 'arbundles'

import { DeSoSigner } from '../../src'

import { mnemonic } from '../keys/alice.json'

describe('DeSo Signer', () => {
  it('signs and verifies data items', async () => {
    const signer = new DeSoSigner(mnemonic)
    const dataItem = createData('test string', signer)
    await dataItem.sign(signer)

    expect(dataItem.isSigned(), 'data item is not signed').to.be.true
    expect(
      await DeSoSigner.verify(
        signer.publicKey,
        await dataItem.getSignatureData(),
        dataItem.rawSignature
      ),
      'data item could not be verified'
    ).to.be.true
    expect(await dataItem.isValid(), 'data item is not valid').to.be.true
  })
})
