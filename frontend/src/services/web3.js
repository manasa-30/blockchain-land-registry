import { BrowserProvider, Contract, JsonRpcProvider } from "ethers";
import config from "../contract.json";

export const LOCAL_CHAIN_ID = 31337n;
export function readProvider() { return new JsonRpcProvider(import.meta.env.VITE_RPC_URL || "http://127.0.0.1:8545"); }
export function readContract() {
  if (!config.address || !config.abi.length) throw new Error("Contract is not deployed. Run npm run deploy:local.");
  return new Contract(config.address, config.abi, readProvider());
}
export async function connectWallet() {
  if (!window.ethereum) throw new Error("MetaMask was not detected. Install MetaMask to continue.");
  const provider = new BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  const network = await provider.getNetwork();
  if (network.chainId !== LOCAL_CHAIN_ID) throw new Error("Wrong network. Select Hardhat Local (chain ID 31337) in MetaMask.");
  const signer = await provider.getSigner();
  if (!config.address || !config.abi.length) throw new Error("Contract is not deployed. Run npm run deploy:local.");
  return { provider, signer, account: await signer.getAddress(), contract: new Contract(config.address, config.abi, signer) };
}
export function contractFor(signer) {
  if (!config.address || !config.abi.length) throw new Error("Contract is not deployed. Run npm run deploy:local.");
  return new Contract(config.address, config.abi, signer);
}
export function friendlyError(error) {
  const message = error?.shortMessage || error?.reason || error?.message || "Transaction failed.";
  if (/user rejected|ACTION_REJECTED/i.test(message)) return "The wallet request was declined.";
  if (/insufficient funds/i.test(message)) return "This local wallet does not have enough test ETH.";
  if (/could not coalesce|revert/i.test(message)) return message.split(" (")[0];
  return message;
}
