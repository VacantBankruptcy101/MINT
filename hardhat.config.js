// hardhat.config.js
// -----------------
// Multi-chain deployment configuration.
// Supports: Ethereum (mainnet + Sepolia), Polygon (mainnet + Amoy),
//           BNB Chain, Arbitrum One, Base, Avalanche C-Chain.
//
// Usage:
//   npm install
//   cp .env.example .env   # fill in your values
//   npx hardhat compile
//   npx hardhat run scripts/deploy.js --network sepolia

require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const PK = process.env.DEPLOYER_PRIVATE_KEY || "0x" + "0".repeat(64);

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: { optimizer: { enabled: true, runs: 200 } },
  },

  networks: {
    // ── Ethereum ──────────────────────────────────────────────────────────
    mainnet: {
      url: process.env.ETH_MAINNET_RPC || "https://eth.llamarpc.com",
      accounts: [PK],
      chainId: 1,
    },
    sepolia: {
      url: process.env.ETH_SEPOLIA_RPC || "https://rpc.sepolia.org",
      accounts: [PK],
      chainId: 11155111,
    },

    // ── Polygon ───────────────────────────────────────────────────────────
    polygon: {
      url: process.env.POLYGON_MAINNET_RPC || "https://polygon-rpc.com",
      accounts: [PK],
      chainId: 137,
    },
    amoy: {
      url: process.env.POLYGON_AMOY_RPC || "https://rpc-amoy.polygon.technology",
      accounts: [PK],
      chainId: 80002,
    },

    // ── BNB Smart Chain ───────────────────────────────────────────────────
    bsc: {
      url: "https://bsc-dataseed.binance.org",
      accounts: [PK],
      chainId: 56,
    },
    bscTestnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      accounts: [PK],
      chainId: 97,
    },

    // ── Arbitrum ──────────────────────────────────────────────────────────
    arbitrum: {
      url: "https://arb1.arbitrum.io/rpc",
      accounts: [PK],
      chainId: 42161,
    },
    arbitrumSepolia: {
      url: "https://sepolia-rollup.arbitrum.io/rpc",
      accounts: [PK],
      chainId: 421614,
    },

    // ── Base ──────────────────────────────────────────────────────────────
    base: {
      url: "https://mainnet.base.org",
      accounts: [PK],
      chainId: 8453,
    },
    baseSepolia: {
      url: "https://sepolia.base.org",
      accounts: [PK],
      chainId: 84532,
    },

    // ── Avalanche ─────────────────────────────────────────────────────────
    avalanche: {
      url: "https://api.avax.network/ext/bc/C/rpc",
      accounts: [PK],
      chainId: 43114,
    },
    fuji: {
      url: "https://api.avax-test.network/ext/bc/C/rpc",
      accounts: [PK],
      chainId: 43113,
    },

    // ── Optimism ──────────────────────────────────────────────────────────
    optimism: {
      url: "https://mainnet.optimism.io",
      accounts: [PK],
      chainId: 10,
    },
    optimismSepolia: {
      url: "https://sepolia.optimism.io",
      accounts: [PK],
      chainId: 11155420,
    },
  },

  etherscan: {
    apiKey: {
      mainnet:         process.env.ETHERSCAN_API_KEY    || "",
      sepolia:         process.env.ETHERSCAN_API_KEY    || "",
      polygon:         process.env.POLYGONSCAN_API_KEY  || "",
      amoy:            process.env.POLYGONSCAN_API_KEY  || "",
      bsc:             process.env.BSCSCAN_API_KEY      || "",
      bscTestnet:      process.env.BSCSCAN_API_KEY      || "",
      arbitrumOne:     process.env.ARBISCAN_API_KEY     || "",
      arbitrumSepolia: process.env.ARBISCAN_API_KEY     || "",
      base:            process.env.BASESCAN_API_KEY     || "",
      baseSepolia:     process.env.BASESCAN_API_KEY     || "",
      avalanche:       process.env.SNOWTRACE_API_KEY    || "",
      fuji:            process.env.SNOWTRACE_API_KEY    || "",
    },
    customChains: [
      {
        network: "amoy",
        chainId: 80002,
        urls: {
          apiURL:    "https://api-amoy.polygonscan.com/api",
          browserURL: "https://amoy.polygonscan.com",
        },
      },
      {
        network: "arbitrumSepolia",
        chainId: 421614,
        urls: {
          apiURL:    "https://api-sepolia.arbiscan.io/api",
          browserURL: "https://sepolia.arbiscan.io",
        },
      },
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL:    "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org",
        },
      },
      {
        network: "optimismSepolia",
        chainId: 11155420,
        urls: {
          apiURL:    "https://api-sepolia-optimism.etherscan.io/api",
          browserURL: "https://sepolia-optimism.etherscan.io",
        },
      },
    ],
  },
};
