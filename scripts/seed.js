import hre from "hardhat";
import fs from "node:fs";

const { ethers } = hre;
const [admin, registrar, owner, buyer] = await ethers.getSigners();
const artifact = JSON.parse(fs.readFileSync("./frontend/src/contract.json", "utf8"));
if (!artifact.address) throw new Error("Deploy locally before seeding.");
const registry = new ethers.Contract(artifact.address, artifact.abi, admin);
if (!(await registry.isRegistrar(registrar.address))) await (await registry.addRegistrar(registrar.address)).wait();
const demo = [
  ["1001", 111.48, "Vijayawada, Andhra Pradesh", "fictional-demo-document-1001"],
  ["1002", 185.81, "Guntur, Andhra Pradesh", "fictional-demo-document-1002"],
  ["1003", 139.35, "Amaravati, Andhra Pradesh", "fictional-demo-document-1003"]
];
for (const [survey, area, location, content] of demo) {
  try {
    await registry.getLandBySurveyNumber(survey);
    console.log(`Skipped existing demo parcel ${survey}.`);
    continue;
  } catch {
    // This survey number is not registered yet; continue with the fictional demo record.
  }
  await (await registry.connect(registrar).registerLand(owner.address, survey, Math.round(area), location, ethers.id(content), `demo:${survey}`)).wait();
}
console.log(`Seeded ${demo.length} fictional parcels.`);
console.log(`Administrator: ${admin.address}`);
console.log(`Registrar: ${registrar.address}`);
console.log(`Owner: ${owner.address}`);
console.log(`Buyer: ${buyer.address}`);
