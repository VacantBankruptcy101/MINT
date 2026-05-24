// scripts/deploy.js
// -----------------
// Deploy FreeToMintNFT to any configured network.
//
// Usage:
//   npx hardhat run scripts/deploy.js --network sepolia
//   npx hardhat run scripts/deploy.js --network mainnet
//   npx hardhat run scripts/deploy.js --network polygon
//
// After deploy, verify with:
//   npx hardhat verify --network sepolia <CONTRACT_ADDRESS> \
//     "MyCollection" "MYC" "ipfs://QmXXX" "Ethereum Sepolia" \
//     0 0 "<YOUR_WALLET>" 500

const hre = require("hardhat");
const fs  = require("fs");
const path = require("path");

// ── Chain name map ────────────────────────────────────────────────────────────
const CHAIN_NAMES = {
  1:        "Ethereum Mainnet",
  11155111: "Ethereum Sepolia",
  137:      "Polygon Mainnet",
  80002:    "Polygon Amoy",
  56:       "BNB Smart Chain",
  97:       "BNB Testnet",
  42161:    "Arbitrum One",
  421614:   "Arbitrum Sepolia",
  8453:     "Base Mainnet",
  84532:    "Base Sepolia",
  43114:    "Avalanche C-Chain",
  43113:    "Avalanche Fuji",
  10:       "Optimism Mainnet",
  11155420: "Optimism Sepolia",
};

// ── Collection config — edit these before deploy ─────────────────────────────
const CONFIG = {
  name:            process.env.NFT_NAME        || "My Free NFT Collection",
  symbol:          process.env.NFT_SYMBOL      || "FMNT",
  contractURI:     process.env.CONTRACT_URI    || "ipfs://QmPlaceholderContractMetadata",
  maxSupply:       Number(process.env.MAX_SUPPLY      || 0),   // 0 = unlimited
  maxPerWallet:    Number(process.env.MAX_PER_WALLET  || 0),   // 0 = unlimited
  royaltyBps:      Number(process.env.ROYALTY_BPS     || 500), // 5%
};

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const { chainId } = await hre.ethers.provider.getNetwork();
  const chainName = CHAIN_NAMES[chainId] || `Chain ${chainId}`;

  console.log("\n═══════════════════════════════════════════════");
  console.log("  FreeToMintNFT Deployment");
  console.log("═══════════════════════════════════════════════");
  console.log(`  Network   : ${chainName} (${chainId})`);
  console.log(`  Deployer  : ${deployer.address}`);
  console.log(`  Collection: ${CONFIG.name} (${CONFIG.symbol})`);
  console.log(`  Max Supply: ${CONFIG.maxSupply || "Unlimited"}`);
  console.log(`  Royalty   : ${CONFIG.royaltyBps / 100}%`);
  console.log("───────────────────────────────────────────────\n");

  const Factory = await hre.ethers.getContractFactory("FreeToMintNFT");
  const contract = await Factory.deploy(
    CONFIG.name,
    CONFIG.symbol,
    CONFIG.contractURI,
    chainName,
    CONFIG.maxSupply,
    CONFIG.maxPerWallet,
    deployer.address,    // royalty receiver = deployer
    CONFIG.royaltyBps,
  );

  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log(`✅ Contract deployed: ${address}`);

  // ── Save deployment record ──────────────────────────────────────────────
  const record = {
    network:    chainName,
    chainId:    Number(chainId),
    address,
    deployer:   deployer.address,
    name:       CONFIG.name,
    symbol:     CONFIG.symbol,
    timestamp:  new Date().toISOString(),
    txHash:     contract.deploymentTransaction()?.hash,
  };

  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${chainId}.json`);
  fs.writeFileSync(outFile, JSON.stringify(record, null, 2));

  console.log(`\n  Deployment saved → deployments/${chainId}.json`);
  console.log("\n  Block Explorer URLs:");

  const explorers = {
    1:        `https://etherscan.io/address/${address}`,
    11155111: `https://sepolia.etherscan.io/address/${address}`,
    137:      `https://polygonscan.com/address/${address}`,
    80002:    `https://amoy.polygonscan.com/address/${address}`,
    56:       `https://bscscan.com/address/${address}`,
    97:       `https://testnet.bscscan.com/address/${address}`,
    42161:    `https://arbiscan.io/address/${address}`,
    421614:   `https://sepolia.arbiscan.io/address/${address}`,
    8453:     `https://basescan.org/address/${address}`,
    84532:    `https://sepolia.basescan.org/address/${address}`,
    43114:    `https://snowtrace.io/address/${address}`,
    43113:    `https://testnet.snowtrace.io/address/${address}`,
    10:       `https://optimistic.etherscan.io/address/${address}`,
    11155420: `https://sepolia-optimism.etherscan.io/address/${address}`,
  };

  if (explorers[chainId]) {
    console.log(`  ${explorers[chainId]}`);
  }

  console.log("\n  Verify command:");
  console.log(
    `  npx hardhat verify --network ${hre.network.name} ${address} ` +
    `"${CONFIG.name}" "${CONFIG.symbol}" "${CONFIG.contractURI}" ` +
    `"${chainName}" ${CONFIG.maxSupply} ${CONFIG.maxPerWallet} ` +
    `"${deployer.address}" ${CONFIG.royaltyBps}`
  );

  console.log("\n  OpenSea listing:");
  console.log(`  https://opensea.io/assets/${hre.network.name === "mainnet" ? "ethereum" : hre.network.name}/${address}`);

  console.log("\n═══════════════════════════════════════════════\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
