// test/FreeToMintNFT.test.js
// ---------------------------
// Full test suite for FreeToMintNFT.sol
// Run: npx hardhat test

const { expect } = require("chai");
const { ethers }  = require("hardhat");

describe("FreeToMintNFT", function () {

  let contract, owner, alice, bob, carol;

  const DEPLOY_ARGS = {
    name:            "Test Collection",
    symbol:          "TC",
    contractURI:     "ipfs://QmContractMetadata",
    chainName:       "Hardhat Local",
    maxSupply:       0,
    maxPerWallet:    0,
    royaltyBps:      500,
  };

  async function deploy(overrides = {}) {
    [owner, alice, bob, carol] = await ethers.getSigners();
    const args = { ...DEPLOY_ARGS, ...overrides };
    const Factory = await ethers.getContractFactory("FreeToMintNFT");
    return Factory.deploy(
      args.name,
      args.symbol,
      args.contractURI,
      args.chainName,
      args.maxSupply,
      args.maxPerWallet,
      owner.address,
      args.royaltyBps,
    );
  }

  // ── Deployment ────────────────────────────────────────────────────
  describe("Deployment", function () {
    it("sets name, symbol, owner correctly", async function () {
      contract = await deploy();
      expect(await contract.name()).to.equal("Test Collection");
      expect(await contract.symbol()).to.equal("TC");
      expect(await contract.owner()).to.equal(owner.address);
    });

    it("stores contractURI", async function () {
      contract = await deploy();
      expect(await contract.contractURI()).to.equal("ipfs://QmContractMetadata");
    });

    it("sets royalty correctly", async function () {
      contract = await deploy();
      const [recv, amt] = await contract.royaltyInfo(1, ethers.parseEther("1"));
      expect(recv).to.equal(owner.address);
      expect(amt).to.equal(ethers.parseEther("0.05")); // 5%
    });

    it("rejects royalty > 10%", async function () {
      await expect(deploy({ royaltyBps: 1001 })).to.be.revertedWith("Royalty cannot exceed 10%");
    });

    it("starts with totalSupply = 0", async function () {
      contract = await deploy();
      expect(await contract.totalSupply()).to.equal(0n);
    });
  });

  // ── Minting ───────────────────────────────────────────────────────
  describe("Free Mint", function () {
    beforeEach(async () => { contract = await deploy(); });

    it("mints token ID 1 to caller", async function () {
      await contract.connect(alice).mint("ipfs://QmToken1");
      expect(await contract.ownerOf(1)).to.equal(alice.address);
      expect(await contract.balanceOf(alice.address)).to.equal(1n);
    });

    it("increments totalSupply", async function () {
      await contract.connect(alice).mint("ipfs://QmToken1");
      await contract.connect(alice).mint("ipfs://QmToken2");
      expect(await contract.totalSupply()).to.equal(2n);
    });

    it("stores tokenURI correctly", async function () {
      await contract.connect(alice).mint("ipfs://QmABC");
      expect(await contract.tokenURI(1)).to.equal("ipfs://QmABC");
    });

    it("emits Transfer and Minted events", async function () {
      await expect(contract.connect(alice).mint("ipfs://QmToken1"))
        .to.emit(contract, "Transfer").withArgs(ethers.ZeroAddress, alice.address, 1)
        .and.emit(contract, "Minted").withArgs(alice.address, 1, "ipfs://QmToken1");
    });

    it("rejects empty tokenURI", async function () {
      await expect(contract.connect(alice).mint("")).to.be.revertedWith("Token URI required");
    });

    it("tracks mintedByWallet", async function () {
      await contract.connect(alice).mint("ipfs://Qm1");
      await contract.connect(alice).mint("ipfs://Qm2");
      expect(await contract.mintedByWallet(alice.address)).to.equal(2n);
    });
  });

  // ── Max Supply ────────────────────────────────────────────────────
  describe("Max Supply", function () {
    it("enforces maxSupply cap", async function () {
      contract = await deploy({ maxSupply: 2 });
      await contract.connect(alice).mint("ipfs://Qm1");
      await contract.connect(alice).mint("ipfs://Qm2");
      await expect(contract.connect(alice).mint("ipfs://Qm3")).to.be.revertedWith("Max supply reached");
    });

    it("zero maxSupply = unlimited", async function () {
      contract = await deploy({ maxSupply: 0 });
      for (let i = 1; i <= 5; i++) await contract.connect(alice).mint(`ipfs://Qm${i}`);
      expect(await contract.totalSupply()).to.equal(5n);
    });

    it("owner can increase maxSupply", async function () {
      contract = await deploy({ maxSupply: 1 });
      await contract.connect(alice).mint("ipfs://Qm1");
      await contract.setMaxSupply(5);
      await contract.connect(alice).mint("ipfs://Qm2");
      expect(await contract.totalSupply()).to.equal(2n);
    });

    it("owner cannot reduce maxSupply below minted", async function () {
      contract = await deploy({ maxSupply: 0 });
      await contract.connect(alice).mint("ipfs://Qm1");
      await contract.connect(alice).mint("ipfs://Qm2");
      await expect(contract.setMaxSupply(1)).to.be.revertedWith("Cannot reduce below minted");
    });
  });

  // ── Per-wallet Cap ────────────────────────────────────────────────
  describe("Per-Wallet Cap", function () {
    it("enforces maxPerWallet", async function () {
      contract = await deploy({ maxPerWallet: 2 });
      await contract.connect(alice).mint("ipfs://Qm1");
      await contract.connect(alice).mint("ipfs://Qm2");
      await expect(contract.connect(alice).mint("ipfs://Qm3")).to.be.revertedWith("Wallet mint cap reached");
    });

    it("cap is per-wallet, not global", async function () {
      contract = await deploy({ maxPerWallet: 1 });
      await contract.connect(alice).mint("ipfs://Qm1");
      await contract.connect(bob).mint("ipfs://Qm2");   // different wallet, allowed
      expect(await contract.totalSupply()).to.equal(2n);
    });
  });

  // ── Batch Mint ────────────────────────────────────────────────────
  describe("Batch Mint", function () {
    beforeEach(async () => { contract = await deploy(); });

    it("mints multiple tokens with correct URIs", async function () {
      const uris = ["ipfs://Qm1", "ipfs://Qm2", "ipfs://Qm3"];
      await contract.connect(alice).batchMint(uris);
      for (let i = 1; i <= 3; i++) {
        expect(await contract.ownerOf(i)).to.equal(alice.address);
        expect(await contract.tokenURI(i)).to.equal(uris[i - 1]);
      }
    });

    it("rejects batch > 50", async function () {
      const uris = Array(51).fill("ipfs://Qm");
      await expect(contract.connect(alice).batchMint(uris)).to.be.revertedWith("Batch: 1-50 tokens");
    });

    it("rejects empty batch", async function () {
      await expect(contract.connect(alice).batchMint([])).to.be.revertedWith("Batch: 1-50 tokens");
    });
  });

  // ── Pause ─────────────────────────────────────────────────────────
  describe("Pause", function () {
    beforeEach(async () => { contract = await deploy(); });

    it("owner can pause minting", async function () {
      await contract.setMintingPaused(true);
      await expect(contract.connect(alice).mint("ipfs://Qm1")).to.be.revertedWith("Minting is paused");
    });

    it("owner can unpause", async function () {
      await contract.setMintingPaused(true);
      await contract.setMintingPaused(false);
      await expect(contract.connect(alice).mint("ipfs://Qm1")).to.not.be.reverted;
    });

    it("non-owner cannot pause", async function () {
      await expect(contract.connect(alice).setMintingPaused(true)).to.be.revertedWith("Ownable: not owner");
    });
  });

  // ── ERC-721 Transfers ─────────────────────────────────────────────
  describe("ERC-721 Transfers", function () {
    beforeEach(async () => {
      contract = await deploy();
      await contract.connect(alice).mint("ipfs://Qm1");
    });

    it("transferFrom moves ownership", async function () {
      await contract.connect(alice).transferFrom(alice.address, bob.address, 1);
      expect(await contract.ownerOf(1)).to.equal(bob.address);
      expect(await contract.balanceOf(alice.address)).to.equal(0n);
      expect(await contract.balanceOf(bob.address)).to.equal(1n);
    });

    it("operator can transfer after approval", async function () {
      await contract.connect(alice).approve(bob.address, 1);
      await contract.connect(bob).transferFrom(alice.address, carol.address, 1);
      expect(await contract.ownerOf(1)).to.equal(carol.address);
    });

    it("setApprovalForAll grants operator rights", async function () {
      await contract.connect(alice).setApprovalForAll(bob.address, true);
      await contract.connect(bob).transferFrom(alice.address, carol.address, 1);
      expect(await contract.ownerOf(1)).to.equal(carol.address);
    });

    it("unauthorized transfer reverts", async function () {
      await expect(
        contract.connect(bob).transferFrom(alice.address, bob.address, 1)
      ).to.be.revertedWith("Transfer not approved");
    });

    it("emits Transfer event", async function () {
      await expect(contract.connect(alice).transferFrom(alice.address, bob.address, 1))
        .to.emit(contract, "Transfer").withArgs(alice.address, bob.address, 1);
    });
  });

  // ── Airdrop ───────────────────────────────────────────────────────
  describe("Airdrop", function () {
    beforeEach(async () => { contract = await deploy(); });

    it("owner can airdrop to multiple recipients", async function () {
      await contract.airdrop(
        [alice.address, bob.address, carol.address],
        ["ipfs://Qm1", "ipfs://Qm2", "ipfs://Qm3"]
      );
      expect(await contract.ownerOf(1)).to.equal(alice.address);
      expect(await contract.ownerOf(2)).to.equal(bob.address);
      expect(await contract.ownerOf(3)).to.equal(carol.address);
    });

    it("non-owner cannot airdrop", async function () {
      await expect(
        contract.connect(alice).airdrop([bob.address], ["ipfs://Qm1"])
      ).to.be.revertedWith("Ownable: not owner");
    });

    it("mismatched lengths revert", async function () {
      await expect(
        contract.airdrop([alice.address, bob.address], ["ipfs://Qm1"])
      ).to.be.revertedWith("Length mismatch");
    });
  });

  // ── Royalties (ERC-2981) ──────────────────────────────────────────
  describe("ERC-2981 Royalties", function () {
    beforeEach(async () => { contract = await deploy(); });

    it("returns correct royalty for any sale price", async function () {
      const salePrice = ethers.parseEther("10");
      const [recv, amt] = await contract.royaltyInfo(1, salePrice);
      expect(recv).to.equal(owner.address);
      expect(amt).to.equal(ethers.parseEther("0.5")); // 5%
    });

    it("owner can update royalty receiver and bps", async function () {
      await contract.setRoyalty(alice.address, 250);
      const [recv, amt] = await contract.royaltyInfo(1, ethers.parseEther("1"));
      expect(recv).to.equal(alice.address);
      expect(amt).to.equal(ethers.parseEther("0.025")); // 2.5%
    });

    it("royalty > 10% rejected", async function () {
      await expect(contract.setRoyalty(alice.address, 1001)).to.be.revertedWith("Royalty max 10%");
    });
  });

  // ── ERC-165 Interface Support ─────────────────────────────────────
  describe("ERC-165", function () {
    beforeEach(async () => { contract = await deploy(); });

    it("supports ERC-721 interface", async function () {
      expect(await contract.supportsInterface("0x80ac58cd")).to.equal(true);
    });

    it("supports ERC-2981 interface", async function () {
      expect(await contract.supportsInterface("0x2a55205a")).to.equal(true);
    });

    it("supports ERC-165 interface", async function () {
      expect(await contract.supportsInterface("0x01ffc9a7")).to.equal(true);
    });

    it("rejects unknown interfaces", async function () {
      expect(await contract.supportsInterface("0xdeadbeef")).to.equal(false);
    });
  });

  // ── Admin: contractURI & tokenURI updates ─────────────────────────
  describe("Admin Functions", function () {
    beforeEach(async () => {
      contract = await deploy();
      await contract.connect(alice).mint("ipfs://QmOriginal");
    });

    it("owner can update contractURI", async function () {
      await contract.setContractURI("ipfs://QmNewContract");
      expect(await contract.contractURI()).to.equal("ipfs://QmNewContract");
    });

    it("owner can update tokenURI (for reveal)", async function () {
      await contract.setTokenURI(1, "ipfs://QmRevealed");
      expect(await contract.tokenURI(1)).to.equal("ipfs://QmRevealed");
    });

    it("non-owner cannot update tokenURI", async function () {
      await expect(contract.connect(alice).setTokenURI(1, "ipfs://Qm")).to.be.revertedWith("Ownable: not owner");
    });

    it("tokenURI query for nonexistent token reverts", async function () {
      await expect(contract.tokenURI(999)).to.be.revertedWith("URI query for nonexistent token");
    });
  });

  // ── Ownership Transfer ────────────────────────────────────────────
  describe("Ownership", function () {
    beforeEach(async () => { contract = await deploy(); });

    it("transferOwnership changes owner", async function () {
      await contract.transferOwnership(alice.address);
      expect(await contract.owner()).to.equal(alice.address);
    });

    it("previous owner loses admin rights", async function () {
      await contract.transferOwnership(alice.address);
      await expect(contract.connect(owner).setMintingPaused(true)).to.be.revertedWith("Ownable: not owner");
    });

    it("renounceOwnership sets owner to zero", async function () {
      await contract.renounceOwnership();
      expect(await contract.owner()).to.equal(ethers.ZeroAddress);
    });
  });

});
