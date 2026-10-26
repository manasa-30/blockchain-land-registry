# Blockchain-Based Property Ownership and Land Record Management System

A local Ethereum-compatible application for registering land parcels, verifying recorded ownership, viewing ownership history, and handling property transfers with escrow. It is an academic demonstration and uses fictional data on a local Hardhat network.

> **Academic prototype:** an on-chain record does not by itself establish legal property ownership. Real-world use requires government integration, legal authorization, verified source documents, privacy safeguards, and compliance with applicable laws.

## Features

- Administrator and registrar roles enforced by the smart contract.
- Land registration with unique survey number, owner address, area, location, SHA-256 document hash, and IPFS CID.
- Property search, ownership verification, document-integrity checks, and permanent ownership history.
- Seller-initiated transfer requests, exact-price buyer deposits, registrar decisions, and cancellable escrow credits/refunds.
- Responsive dashboards for administration, registrars, landowners, and buyers.
- Client-side AES-GCM document encryption before IPFS upload; a browser-local encrypted fallback for demonstrations without IPFS.

## Project structure

```text
blockchain-land-registry/
├── contracts/
│   └── LandRegistry.sol                 # Land records, roles, ownership history, escrow
├── test/
│   └── LandRegistry.test.js             # 20 Hardhat contract tests
├── scripts/
│   ├── deploy.js                        # Deploy contract and export ABI/address
│   ├── seed.js                          # Add fictional demo parcels
│   ├── wait-for-chain.ps1               # Local RPC readiness check for Windows launcher
│   └── capture-screenshots.js           # Capture app routes using Chrome or Edge
├── frontend/
│   ├── index.html                       # Vite entry point
│   ├── package.json                     # Frontend dependencies and scripts
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx                      # Wallet state and route shell
│       ├── components/RegistryUI.jsx    # Shared tables, cards, and transfer list
│       ├── pages/
│       │   ├── Home.jsx
│       │   ├── Properties.jsx
│       │   ├── Register.jsx
│       │   ├── Transfers.jsx
│       │   └── Administration.jsx
│       ├── services/                    # Ethers, wallet, and document workflows
│       ├── utils/formatters.js
│       ├── contract.json                # Generated contract ABI and local address
│       └── styles.css
├── screenshots/                         # Generated UI screenshots
├── hardhat.config.js
├── start.bat                            # Windows one-click local demo
├── package.json
└── README.md
```

## Technology

- **Smart contract:** Solidity 0.8.24, Hardhat
- **Frontend:** React, Vite, React Router, Ethers.js 6, Lucide React, Recharts
- **Tests:** Hardhat, Mocha, and Chai
- **Documents:** Kubo-compatible IPFS API with browser-side AES-GCM encryption

## Requirements

- Node.js 20+ and npm
- Chrome or Edge with MetaMask for wallet transactions
- Optional local Kubo IPFS daemon for persistent document storage

Install dependencies from the repository root:

```bash
npm install
npm --prefix frontend install
```

No private key or API credential is needed for the local demo. Never commit wallet secrets, private keys, or API credentials.

## Run the demo

### Option 1: Windows one-click startup

Double-click `start.bat`. It will:

1. Install dependencies if they are missing.
2. Start or reuse the local Hardhat blockchain at `http://127.0.0.1:8545`.
3. Compile and deploy `LandRegistry.sol` locally.
4. Seed three fictional land parcels.
5. Start the Vite frontend and open `http://localhost:5173`.

Keep the Hardhat and frontend terminal windows open while using the app. Restarting the Hardhat node resets its local blockchain state; run `start.bat` again to redeploy and seed a fresh demo.

### Option 2: Manual startup

From the repository root, install dependencies, then use separate terminals:

**Terminal 1 — start the local blockchain:**

```bash
npm run chain
```

**Terminal 2 — compile, test, deploy, and seed:**

```bash
npm run compile
npm test
npm run deploy:local
npm run seed:local
```

**Terminal 3 — start the frontend:**

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The deployment script updates `frontend/src/contract.json` with the local address and ABI. Deployment is local only; no public network is configured by default.

## MetaMask setup

Add a custom network in MetaMask:

- **Network name:** Hardhat Local
- **RPC URL:** `http://127.0.0.1:8545`
- **Chain ID:** `31337`
- **Currency symbol:** `ETH`

The Hardhat node prints funded local test accounts and their private keys in its terminal. Import Account #0 for the administrator and use other Hardhat accounts to demonstrate registrar, owner, and buyer roles. These are publicly known test keys; use them only on the local Hardhat network and never with real funds.

The deployer account is the administrator. Add a registrar wallet from the Administration page before using a separate registrar account to register land or review transfers.

## Demo workflow

1. Connect MetaMask to Hardhat Local using the administrator account.
2. Add a registrar wallet under **Administration**.
3. Switch to the registrar and register a parcel with a unique survey number, owner wallet, area in m², location, and supporting PDF/JPG/PNG document.
4. Search for the parcel under **Land records**. Inspect its current owner, document hash/CID, and ownership history; verify an owner address or document hash.
5. Switch to the current owner and create a transfer request with the buyer address and agreed ETH price.
6. Switch to the named buyer and enter the transfer request ID to deposit the exact agreed amount into escrow.
7. Switch to a registrar and approve or reject the request. Approval updates ownership and credits the seller; rejection or paid cancellation credits a refund to the buyer. The recipient can withdraw the escrow credit from **Transfers**.
8. Return to **Land records** to verify the new owner and ownership history.

## Document storage and privacy

Set `VITE_IPFS_API_URL` in `frontend/.env.local` to a Kubo-compatible API base, such as `http://127.0.0.1:5001`. The browser encrypts the file before upload and records only its SHA-256 hash and CID on-chain. Save the decryption key shown after upload; the application does not store it on-chain.

Without an IPFS endpoint, encrypted documents are kept in the current browser's IndexedDB under a local demo reference. This fallback is not replicated or accessible from another device. The app does not currently provide document decryption or key management. Do not put names, identity documents, or other sensitive personal information on-chain. Public CIDs and hashes can reveal document references and equality information even when document bytes are encrypted.

Never put a Pinata JWT or provider secret in a Vite environment variable because frontend variables are public. For hosted Pinata use, route uploads through a secured backend proxy.

## Tests and build

```bash
npm run compile
npm test
npm run build
```

The Hardhat suite contains 20 tests covering role access, registration validation, survey lookup, ownership history, exact escrow payment, registrar decisions, cancellation/refunds, and withdrawal replay protection.

## Security and legal limitations

Escrow resolution uses pull-payment credits: the contract updates state and credits the recipient before `withdrawEscrow()` sends ETH. The withdrawal function clears the credit first and has a reentrancy guard. On-chain records are publicly visible and immutable; the contract does not independently establish legal title, verify government documents, resolve disputes, or integrate with cadastral authorities. This prototype is not suitable for real property transactions without legal review, government authorization, and an independent smart-contract security audit.
