import "@nomicfoundation/hardhat-toolbox";
import { subtask } from "hardhat/config.js";
import { TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD } from "hardhat/builtin-tasks/task-names.js";
import solc from "solc";
import { fileURLToPath } from "node:url";

const localSolcPath = fileURLToPath(new URL("./node_modules/solc/soljson.js", import.meta.url));

// Use the npm-pinned solc-js package so local compilation works without downloading a compiler.
subtask(TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD).setAction(async ({ solcVersion }, _hre, runSuper) => {
  if (solcVersion === "0.8.26") return { compilerPath: localSolcPath, isSolcJs: true, version: "0.8.26", longVersion: solc.version() };
  return runSuper();
});

export default {
  solidity: { version: "0.8.26", settings: { optimizer: { enabled: true, runs: 200 } } },
  networks: { hardhat: { chainId: 31337 }, localhost: { url: "http://127.0.0.1:8545", chainId: 31337 } }
};
