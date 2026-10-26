# Blockchain-Based Property Ownership and Land Record Management System


An academic demonstration of property record registration and ownership transfers on a local Ethereum-compatible chain. The repository includes the Solidity contract, Hardhat local development and tests, a React/Vite dashboard, MetaMask support, and client-side encrypted document upload.

> **Demonstration only.** An on-chain record does not by itself establish legal property ownership. Real deployment requires government integration, legal authorization, verified source documents, privacy safeguards, and compliance with applicable laws. Use fictional data and Hardhat test ETH only.

## Features

- Administrator-controlled registrar management; registrar-only land registration and transfer decisions.
- Unique survey numbers, parcel area and location, registration timestamp, SHA-256 document hash, and IPFS CID.
- Searchable public land records, wallet ownership verification, and permanent ownership history.
- Seller-created transfer requests, exact-price buyer escrow deposit, registrar approval/rejection, and valid cancellation/refunds.
- Reentrancy guard, access checks, one active transfer per parcel, and checks-effects-interactions for escrow release.
- Responsive dashboard, land details, ownership-history viewer, document-integrity checker, registrar tools, and transaction status feedback.
- Browser-side AES-GCM encryption before an IPFS upload. An optional local-browser fallback stores only encrypted bytes and is suitable for a single-browser demo only.

## Stack and architecture

- Frontend: React 18, Vite, React Router, Ethers.js, Lucide React, Recharts, custom responsive CSS.
- Contracts: Solidity 0.8.24, Hardhat, Mocha/Chai.
- Documents: Kubo-compatible IPFS API. The browser encrypts the file first; the contract stores a content hash and CID, never document contents.
- There is no backend or conventional ownership database. The deployed contract is the source of record.

## Repository structure

```text
contracts/LandRegistry.sol      Registry and escrow contract
scripts/deploy.js               Local deployment and frontend ABI export
scripts/seed.js                 Optional fictional sample records
scripts/wait-for-chain.ps1      RPC readiness check for the Windows launcher
scripts/capture-screenshots.js  Captures the main UI routes with Chrome or Edge
test/LandRegistry.test.js       Contract authorization, registry, and escrow tests
screenshots/                    Generated dashboard screenshots
frontend/src/App.jsx             Wallet state and route shell
frontend/src/components/         Shared registry tables, cards, and transfer UI
frontend/src/pages/              Overview, records, registration, transfers, administration
frontend/src/services/           Wallet, contract, and encrypted-document utilities
frontend/src/utils/              Date, address, number, and status formatting
frontend/src/styles.css          Responsive visual system
frontend/src/contract.json       Frontend contract address and ABI; refreshed on deployment
hardhat.config.js                Local Hardhat network configuration
start.bat                        Windows one-click local demo launcher
```

## Requirements and install

- Node.js 20+ and npm.
- MetaMask browser extension for wallet transactions.
- Optional: a local Kubo IPFS daemon exposing its API on loopback.

Install both dependency sets from the repository root:

```bash
npm install
npm --prefix frontend install
```

Copy `.env.example` to `frontend/.env.local` for frontend settings. The default RPC is `http://127.0.0.1:8545`; no private key or API credential is required for local development. Never commit `.env` files, private keys, wallet secrets, or API credentials.

## Run locally

### Windows one-click startup

Double-click `start.bat` from File Explorer. It installs dependencies if needed, starts or reuses the local Hardhat node, compiles and deploys the registry, seeds three fictional parcels, starts Vite, and opens `http://localhost:5173`. Keep both opened terminal windows running while using the demo. It never deploys to a public network.

The script may reuse a Hardhat node that is already running. Restarting the node resets its blockchain state; run the launcher again to deploy and seed a fresh local demo.

### Capture UI screenshots

Start the local chain and frontend, deploy/seed demo data, then run `npm run capture:screenshots` from the repository root. The script uses an installed Chrome or Edge and saves four route screenshots under `screenshots/`. If the browser is installed outside the usual Windows locations, set `CHROME_PATH` to its executable path first.

### Manual startup

Open separate terminals from the repository root.

1. Compile and run contract tests:

   ```bash
   npm run compile
   npm test
   ```

2. Start the local chain:

   ```bash
   npm run chain
   ```

3. Deploy to the local chain in another terminal:

   ```bash
   npm run deploy:local
   ```

   This writes the current contract address and ABI to `frontend/src/contract.json`. The repository includes a local-development config; deployment refreshes it. This does not deploy to a public blockchain.

4. Optional: seed fictional example parcels:

   ```bash
   npx hardhat run scripts/seed.js --network localhost
   ```

5. Start Vite:

   ```bash
   npm run dev
   ```

   Open the URL Vite prints (normally `http://localhost:5173`). Build the frontend with `npm run build`.

Hardhat prints local test account addresses and private keys in its own terminal. Import a test account into MetaMask only for this local demo and never reuse those keys on a real network. Add a network with RPC `http://127.0.0.1:8545`, chain ID `31337`, and currency symbol `ETH`. Switch accounts in MetaMask to demonstrate the administrator, registrar, owner, and buyer roles. The first deployer account is the administrator; the administrator must add the registrar account before registration or review.

## Demonstration walkthrough

1. Connect MetaMask to Hardhat Local. The app checks chain ID 31337 and reads role permissions from the contract.
2. As deployer, open Administration and add an authorized registrar wallet.
3. Switch to that registrar and register land with a unique survey number, owner wallet, area (m²), location, and supporting file.
4. The browser validates PDF/JPEG/PNG files up to 10 MB, computes SHA-256, encrypts with AES-GCM, then uploads ciphertext. Save the decryption key displayed after upload; it is not stored on-chain. If no IPFS endpoint is configured, the encrypted file is kept in the current browser's IndexedDB as a demo fallback.
5. In Land records, search for the survey number. Inspect owner address, document hash/CID, and history. Enter an address to verify ownership. To verify file integrity, select the original unencrypted document and compare its computed hash with the on-chain hash.
6. Switch to the current owner. In Transfers, choose the parcel, enter a buyer address and the price in ETH, then create the transfer request.
7. Switch to the designated buyer. Enter the transfer request ID and deposit; the app reads the agreed price and submits that exact amount. The contract rejects other wallets and payment mismatches.
8. Switch to a registrar. Review the queue and approve or reject. Approval changes ownership and credits escrow to the seller; rejection or paid cancellation credits a refund to the buyer. The recipient connects and withdraws their credit from the Transfers page.
9. Return to Land records and inspect the updated owner and full ownership history.

## IPFS configuration and privacy

Set `VITE_IPFS_API_URL` in `frontend/.env.local` to a Kubo-compatible API base, for example `http://127.0.0.1:5001`. The browser calls `/api/v0/add?pin=true` and uploads the encrypted payload. Do not expose a Pinata JWT or other provider secret in a Vite variable: frontend variables are public. For a hosted Pinata deployment, add a server-side upload proxy with authentication and rate limits, then point the frontend to that proxy. Keep decryption keys out of blockchain storage and share them only through a secure channel with authorized parties. Public CIDs and hashes reveal references and equality information even when document bytes are encrypted.

The demo fallback (`local:<key>`) is stored only in the browser that uploaded it; it is not replicated or accessible from another device. Use IPFS for multi-account walkthroughs. The current UI creates an encryption key and displays it after upload, but does not provide a key-management or document-decryption workflow.

## Contract workflow and security notes

The seller calls `initiateTransfer(landId, buyer, price)`. The named buyer calls `depositPayment(transferId)` with exactly the agreed wei amount. A registrar approves or rejects; a paid cancellation is available to the seller or buyer and credits a refund to the buyer. Resolution records a pull-payment credit rather than calling the recipient, avoiding recipient fallback failures from blocking review or refund. `withdrawEscrow()` clears the credit before sending ETH and has a reentrancy guard, so each credit can be withdrawn only once.

The contract provides a demonstration correction operation and document update function; corrections are registrar-controlled and emit an audit event. On-chain survey numbers, addresses, locations, hashes, and CIDs are public and immutable history remains discoverable. Do not put names, identity documents, or other sensitive personal data on-chain. The contract does not establish legal title, validate government source documents, handle disputes, or integrate with cadastral authorities. A production deployment needs independent security review and jurisdiction-specific legal design.

## Optional public testnet deployment

Public-network deployment is not configured or run by default. If you explicitly choose to use Sepolia, add a dedicated network configuration and use a funded testnet wallet kept outside the repository. Never add a mainnet deployment command or real funds to this local demo without an explicit decision. No transaction is sent to a public chain by the supplied scripts.

## Common issues

- **Contract not deployed:** start the Hardhat node and run `npm run deploy:local` again.
- **MetaMask wrong network:** choose Hardhat Local, chain ID `31337`; after restarting Hardhat, redeploy because its state resets.
- **MetaMask not detected:** install/enable the extension and reload the Vite page.
- **No registrar access:** connect the deployer, add a registrar under Administration, then switch to that wallet.
- **No IPFS endpoint:** encrypted file fallback is browser-local. Configure Kubo for CID access across browsers.
- **Upload CORS/network error:** configure the local IPFS API gateway for browser origins or use a secure backend upload proxy.
- **Escrow amount mismatch:** the connected wallet must be the request's designated buyer; the frontend loads the exact amount from the contract.

## Tests

`npm test` runs 20 focused cases covering administrator/registrar access, registration validation and lookup, owner indexes, exact buyer payments, approvals, cancellation/refunds, and replay/withdrawal protection. Frontend production bundle validation is `npm run build`.
