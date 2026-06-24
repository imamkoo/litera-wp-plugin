# Litera WordPress Plugin Release Notes

## v1.0.10 (Hotfix: Widget Rendering Crash)
- **HOTFIX**: Resolved a critical issue where the widget failed to render (disappeared) due to an accidental wiping of the Wagmi configuration during the previous build process.

## v1.0.9 (Smart Contract Synchronization)
- **CRITICAL FIX**: Synchronized the `contractAddress` for the Writer Contract to properly point to the verified Mainnet deployment.
- **RPC Setup Completion**: Finalized the `REACT_APP_NETWORK` and `GENERATE_SOURCEMAP` configurations.

## v1.0.8 (Critical Fix for Update Cache)
- **CRITICAL FIX**: Resolved a packaging script bug that caused the old frontend bundle to be included in v1.0.7. The frontend now correctly uses premium Web3 RPCs.
- **Auto-Sync Quota**: Mencegah cache agresif dari jaringan Polygon sehingga status *Sold Out* selalu akurat *real-time*.

## v1.0.7 (RPC Optimization)

- **Premium RPC Nodes**: Upgraded Web3 provider config to use `llamarpc`, `publicnode`, and `maticvigil` fallbacks to avoid public RPC caching/lag issues.
- **Auto Data Sync**: Implemented `refetchInterval` to automatically refresh article and blockchain data every 5 seconds.
- **Sold Out Bug Fix**: Fixed an issue where the widget gets stuck on "Sold Out" state because of outdated caching. The widget will now instantly reflect any quota additions made in the Dashboard.

*Please update to this version to ensure your readers see the real-time quota of your NFTs.*
