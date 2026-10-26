import hre from "hardhat";
import fs from "node:fs";

const contract = await hre.ethers.deployContract("LandRegistry");
await contract.waitForDeployment();
const address = await contract.getAddress();
console.log(`LandRegistry deployed to ${address}`);
const artifact = JSON.parse(fs.readFileSync("./artifacts/contracts/LandRegistry.sol/LandRegistry.json", "utf8"));
fs.writeFileSync("./frontend/src/contract.json", JSON.stringify({ address, abi: artifact.abi }, null, 2));
console.log("Frontend contract address and ABI written to frontend/src/contract.json");
