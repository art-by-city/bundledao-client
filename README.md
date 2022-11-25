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

const bundleDAO = new BundleDAOClient({
    deso: {
        seedHex: 'your-deso-seedhex'
    },
    // Public Node coming soon!
    bundleDAO: {
        protocol: 'http',
        host: 'localhost',
        port: 1985
    }
})

const data = 'my data' // or Uint8Array
const tags = [
    { name: 'Content-Type', value: 'text/plain' }, // Content MIME Type for serving
    { name: 'External-Network', value: 'DESO' },
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
