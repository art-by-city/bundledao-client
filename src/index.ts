export { default as DeSoSigner } from './deso-signer'
export { default as InjectedDeSoSigner } from './injected-deso-signer'
export { default as BundleDAOClient } from './bundledao-client'
export * from './bundledao-client'

export type IdentityServiceDeSoPrivateKey = {
  encryptedSeedHex: string
  accessLevelHmac: string
  desoPublicKey: string
}
export type DeSoPrivateKey =
  | { mnemonic: string }
  | { seedhex: string }
  | IdentityServiceDeSoPrivateKey
export type PrivateKey = DeSoPrivateKey
