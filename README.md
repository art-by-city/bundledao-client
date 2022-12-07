# BundleDAO Client

This is a JavaScript library written in TypeScript to create Arweave ANS-104 Binary Bundles with a DeSo identity.  The client signs Data Items and posts bundles to the [BundleDAO Node](https://gitlab.com/art-by-city/bundledao-node) for payment delegation to the Arweave network.

## Install
```bash
$ npm i --save @artbycity/bundledao-client
```

## Usage
Create a `BundleDAOClient`, `Bundle`, and post it to the [BundleDAO Node](https://gitlab.com/art-by-city/bundledao-node)
```typescript
import { BundleDAOClient } from '@artbycity/bundledao-client'
// Get this info from user auth object after log-in with identity service
const identityServiceSignerInfo = {
    accessLevelHmac: 'user-access-level-hmac',
    encryptedSeedHex: 'user-encrypted-seedhex',
    desoPublicKey: 'user-deso-public-key' // e.g. BC1YLioCEtYLNTTRjvAok9Hkfj8yd1E1LWQ2PSBv1KdbPKKdcvu74aN
}
const bundleDAO = new BundleDAOClient('deso', identityServiceSignerInfo)

const data = 'my data' // or Uint8Array

// Add metadata tags to your data
const tags = [
    { name: 'Content-Type', value: 'text/plain' }, // Content MIME Type for serving
    { name: 'External-Network', value: 'deso' },
    { name: 'External-Owner', value: 'my-deso-public-key' }, // Your DeSo Public Key, for discoverability
]
const dataItem = await bundleDAO.createData(data, { tags })

// Wrap all of your data items in a Bundle
const items = [ dataItem ]
const bundle = await bundleDAO.createBundle(items)

// Post!
const bundleTxId = await bundleDAO.postBundle(bundle)
```

## About BundleDAO
[BundleDAO on DAODAO](https://daodao.io/profile/BundleDAO)
