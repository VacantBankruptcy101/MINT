# FreeToMint NFT Platform

**ERC-721 · Free-To-Mint · Cross-Chain · OpenSea Compatible**

A complete NFT minting platform: Solidity smart contract + browser dApp.
Users upload artwork (.png) and metadata (.json), pin to IPFS, and mint
on-chain — gas only, no mint price. The NFT is owned by the minter's wallet
and is fully transferable across any EVM-compatible exchange or wallet.

---

## Quick Start (5 minutes to first mint)

### Option A — No-install (Remix IDE)

1. Open [remix.ethereum.org](https://remix.ethereum.org)
2. Create `FreeToMintNFT.sol` → paste contract source
3. Compile → Solidity 0.8.20
4. Deploy with MetaMask (Injected Provider)
5. Open `frontend/index.html` in any browser
6. Paste your contract address → Upload image + metadata → Mint

### Option B — Hardhat deploy

```bash
git clone <this-repo>
cd nft_platform
npm install
cp .env.example .env      # fill in your keys
npx hardhat run scripts/deploy.js --network sepolia
```

---

## Project Structure

```
nft_platform/
├── contracts/
│   └── FreeToMintNFT.sol       ← ERC-721 smart contract
├── frontend/
│   └── index.html              ← Self-contained dApp (no build step)
├── scripts/
│   └── deploy.js               ← Hardhat deploy script
├── deployments/                ← Auto-generated per-chain deploy records
├── hardhat.config.js           ← Multi-chain Hardhat config
├── package.json
├── .env.example
└── README.md
```

---

## Smart Contract

### Key Features

| Feature | Details |
|---|---|
| Standard | ERC-721 (non-fungible token) |
| Royalties | ERC-2981 (on-chain, honoured by OpenSea) |
| Mint price | FREE (gas only) |
| Batch mint | Up to 50 NFTs per transaction |
| Airdrop | Owner can airdrop to a list of addresses |
| Supply cap | Optional (0 = unlimited) |
| Per-wallet cap | Optional (0 = unlimited) |
| Pausable | Owner can pause/unpause minting |
| `contractURI()` | OpenSea collection storefront metadata |
| `tokenURI()` | Per-token IPFS metadata URI |
| Verification | ownerOf(tokenId) traceable on any block explorer |

### Constructor Parameters

```solidity
constructor(
  string memory _name,           // Collection name
  string memory _symbol,         // Ticker, e.g. "FMNT"
  string memory _contractURI,    // ipfs://Qm… (collection metadata)
  string memory _chainName,      // "Ethereum Mainnet"
  uint256 _maxSupply,            // 0 = unlimited
  uint256 _maxPerWallet,         // 0 = unlimited
  address _royaltyReceiver,      // Your wallet address
  uint96  _royaltyBps            // 500 = 5%
)
```

### Key Functions

```solidity
// Free mint — anyone can call
function mint(string calldata _tokenURI) external returns (uint256 tokenId)

// Batch mint up to 50 NFTs
function batchMint(string[] calldata _tokenURIs) external returns (uint256[] memory)

// Transfer NFT to another wallet (inherited ERC-721)
function transferFrom(address from, address to, uint256 tokenId) external

// Query current owner (verifiable on any block explorer)
function ownerOf(uint256 tokenId) external view returns (address)

// OpenSea collection metadata
function contractURI() external view returns (string memory)
```

---

## IPFS / Metadata

### Metadata JSON Format (OpenSea Standard)

```json
{
  "name": "My NFT #001",
  "description": "A unique digital artwork.",
  "image": "ipfs://QmImageCIDHere",
  "external_url": "https://yoursite.com/nft/1",
  "background_color": "1a1a24",
  "attributes": [
    { "trait_type": "Rarity",  "value": "Legendary" },
    { "trait_type": "Element", "value": "Fire" },
    { "trait_type": "Power",   "value": 9500, "display_type": "number" }
  ]
}
```

### Collection-Level Metadata (contractURI)

```json
{
  "name": "My NFT Collection",
  "description": "Collection description for OpenSea storefront.",
  "image": "ipfs://QmCollectionImageCID",
  "external_link": "https://yoursite.com",
  "seller_fee_basis_points": 500,
  "fee_recipient": "0xYourWalletAddress"
}
```

### IPFS Pinning Services (free tiers available)

| Service | Free Tier | Notes |
|---|---|---|
| [Pinata](https://pinata.cloud) | 1 GB | Recommended — enter JWT in dApp |
| [NFT.storage](https://nft.storage) | Unlimited* | Filecoin-backed |
| [Web3.storage](https://web3.storage) | 5 GB | |
| [Arweave](https://arweave.org) | Pay once | Permanent storage |

---

## Supported Networks

| Network | Chain ID | Testnet | Explorer |
|---|---|---|---|
| Ethereum Mainnet | 1 | Sepolia (11155111) | etherscan.io |
| Polygon | 137 | Amoy (80002) | polygonscan.com |
| BNB Chain | 56 | Testnet (97) | bscscan.com |
| Arbitrum One | 42161 | Sepolia (421614) | arbiscan.io |
| Base | 8453 | Sepolia (84532) | basescan.org |
| Avalanche | 43114 | Fuji (43113) | snowtrace.io |
| Optimism | 10 | Sepolia (11155420) | optimistic.etherscan.io |

---

## Wallet Compatibility

Any EIP-1193 compatible wallet works:

- **MetaMask** (recommended for browser dApp)
- **Coinbase Wallet**
- **Rainbow**
- **WalletConnect** (add WC support to extend the dApp)
- **Ledger / Trezor** (hardware wallets via MetaMask)

Once minted, the NFT is stored at the **contract address** with your wallet
as the registered owner (`ownerOf(tokenId) === yourWallet`). Importing your
wallet into any exchange (Binance, Coinbase, Kraken, etc.) or wallet app
(Trust Wallet, Phantom EVM, imToken) will show you as the owner because
ownership is encoded in the contract, not the wallet software.

---

## OpenSea Integration

1. Deploy contract on a supported chain (Ethereum, Polygon, Arbitrum, Base, Optimism)
2. Visit [opensea.io/get-listed](https://opensea.io/get-listed) → paste contract address
3. OpenSea reads `contractURI()` to populate the collection page
4. Each token is visible via `tokenURI(tokenId)` pointing to IPFS metadata
5. Buyers can bid, buy, and offer — royalties are enforced via ERC-2981

For **testnets**: use [testnets.opensea.io](https://testnets.opensea.io)

---

## Contract Verification

After deployment, verify your contract source code so anyone can audit it:

### Etherscan (and all block explorers)
```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS> \
  "My Collection" "FMNT" "ipfs://QmXXX" "Ethereum Sepolia" \
  0 0 "0xYourWallet" 500
```

### Sourcify (chain-agnostic)
```bash
npx hardhat sourcify --network sepolia
```

### Manual (Remix)
1. In Remix: Plugins → Etherscan (or Sourcify)
2. Paste API key → Verify

Once verified, `ownerOf(tokenId)` is publicly callable on the explorer,
proving provenance back to the contract address for any NFT in the collection.

---

## Security Notes

- Never commit your `.env` file
- The contract has no `withdraw()` function — no ETH is held
- `onlyOwner` gates: pause, setContractURI, setRoyalty, setTokenURI, airdrop
- No re-entrancy risk: no ETH transfers in mint path
- Royalty capped at 10% in contract (`_royaltyBps <= 1000`)

---

## License

MIT
