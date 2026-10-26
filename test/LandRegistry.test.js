import { expect } from "chai";
import hre from "hardhat";

const { ethers } = hre;

describe("LandRegistry", function () {
  async function setup() {
    const [admin, registrar, owner, buyer, other] = await ethers.getSigners();
    const registry = await ethers.deployContract("LandRegistry");
    await registry.addRegistrar(registrar.address);
    await registry.connect(registrar).registerLand(owner.address, "SUR-17-A", 1200, "North District", ethers.id("document"), "bafy-document");
    return { registry, admin, registrar, owner, buyer, other };
  }
  it("makes deployer admin and restricts registrar management", async function () {
    const { registry, admin, other, registrar } = await setup();
    expect(await registry.administrator()).to.equal(admin.address);
    expect(await registry.isRegistrar(registrar.address)).to.equal(true);
    await expect(registry.connect(other).addRegistrar(other.address)).to.be.revertedWith("administrator only");
    await registry.removeRegistrar(registrar.address);
    expect(await registry.isRegistrar(registrar.address)).to.equal(false);
  });
  it("registers unique land and exposes ownership verification and history", async function () {
    const { registry, registrar, owner, other } = await setup();
    expect((await registry.getLand(1)).owner).to.equal(owner.address);
    expect(await registry.verifyOwnership(1, owner.address)).to.equal(true);
    expect(await registry.verifyOwnership(1, other.address)).to.equal(false);
    expect((await registry.getOwnershipHistory(1)).length).to.equal(1);
    await expect(registry.connect(registrar).registerLand(owner.address, "SUR-17-A", 10, "X", ethers.ZeroHash, "")).to.be.revertedWith("duplicate survey number");
    await expect(registry.connect(other).registerLand(owner.address, "SUR-X", 10, "X", ethers.ZeroHash, "")).to.be.revertedWith("registrar only");
  });
  it("requires designated buyer to deposit exact escrow and transfers on approval", async function () {
    const { registry, registrar, owner, buyer, other } = await setup();
    const price = ethers.parseEther("1");
    await registry.connect(owner).initiateTransfer(1, buyer.address, price);
    await expect(registry.connect(other).depositPayment(1, { value: price })).to.be.revertedWith("designated buyer only");
    await expect(registry.connect(buyer).depositPayment(1, { value: price - 1n })).to.be.revertedWith("incorrect payment amount");
    await registry.connect(buyer).depositPayment(1, { value: price });
    await registry.connect(registrar).approveTransfer(1);
    expect(await registry.escrowCredits(owner.address)).to.equal(price);
    await expect(registry.connect(owner).withdrawEscrow()).to.changeEtherBalance(owner, price);
    expect((await registry.getLand(1)).owner).to.equal(buyer.address);
    expect((await registry.getOwnershipHistory(1)).length).to.equal(2);
    await expect(registry.connect(registrar).approveTransfer(1)).to.be.revertedWith("not awaiting approval");
  });
  it("refunds rejected and buyer-cancelled deposits, and clears the pending lock", async function () {
    const { registry, registrar, owner, buyer, other } = await setup();
    const price = ethers.parseEther("0.2");
    await registry.connect(owner).initiateTransfer(1, buyer.address, price);
    await registry.connect(buyer).depositPayment(1, { value: price });
    await registry.connect(registrar).rejectTransfer(1, "document mismatch");
    expect(await registry.escrowCredits(buyer.address)).to.equal(price);
    await expect(registry.connect(buyer).withdrawEscrow()).to.changeEtherBalance(buyer, price);
    await registry.connect(owner).initiateTransfer(1, other.address, price);
    await registry.connect(other).depositPayment(2, { value: price });
    await registry.connect(other).cancelTransfer(2);
    expect(await registry.escrowCredits(other.address)).to.equal(price);
    await registry.connect(other).withdrawEscrow();
  });
  it("allows seller to cancel an unpaid request and rejects invalid fields", async function () {
    const { registry, owner, buyer, other } = await setup();
    await expect(registry.connect(other).initiateTransfer(1, buyer.address, 10)).to.be.revertedWith("current owner only");
    await expect(registry.connect(owner).initiateTransfer(1, buyer.address, 0)).to.be.revertedWith("price must be positive");
    await registry.connect(owner).initiateTransfer(1, buyer.address, 10);
    await expect(registry.connect(owner).cancelTransfer(1)).to.emit(registry, "TransferCancelled");
  });
});
