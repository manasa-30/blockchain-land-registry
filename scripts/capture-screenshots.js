import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const screenshots = path.join(root, "screenshots");
const chromeCandidates = [
  process.env.CHROME_PATH,
  path.join(process.env.ProgramFiles || "C:\\Program Files", "Google", "Chrome", "Application", "chrome.exe"),
  path.join(process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)", "Google", "Chrome", "Application", "chrome.exe"),
  path.join(process.env.LOCALAPPDATA || "", "Google", "Chrome", "Application", "chrome.exe"),
  path.join(process.env.ProgramFiles || "C:\\Program Files", "Microsoft", "Edge", "Application", "msedge.exe")
].filter(Boolean);
const browser = chromeCandidates.find(candidate => fs.existsSync(candidate));

if (!browser) {
  console.error("Chrome or Edge was not found. Set CHROME_PATH to its executable and try again.");
  process.exit(1);
}

const captures = [
  ["01_home_dashboard.png", ""],
  ["02_land_records.png", "properties"],
  ["03_transfer_portal.png", "transfers"],
  ["04_registration_portal.png", "register"]
];
fs.mkdirSync(screenshots, { recursive: true });

for (const [filename, route] of captures) {
  const destination = path.join(screenshots, filename);
  const url = `http://localhost:5173/${route}`;
  const result = spawnSync(browser, [
    "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run",
    "--window-size=1600,1100", "--virtual-time-budget=2500",
    `--screenshot=${destination}`, url
  ], { stdio: "inherit", timeout: 30000, windowsHide: true });

  if (result.error || result.status !== 0 || !fs.existsSync(destination)) {
    console.error(`Failed to capture ${url}`, result.error?.message || "");
    process.exit(result.status || 1);
  }
  console.log(`Saved ${path.relative(root, destination)}`);
}
