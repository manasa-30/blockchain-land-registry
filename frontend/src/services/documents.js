const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = ["application/pdf", "image/jpeg", "image/png"];
function saveInBrowser(key, blob) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("terra-ledger-documents", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("encrypted");
    request.onerror = () => reject(new Error("Browser document storage is unavailable."));
    request.onsuccess = () => {
      const transaction = request.result.transaction("encrypted", "readwrite");
      transaction.objectStore("encrypted").put(blob, key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error("Could not save encrypted document in browser storage."));
    };
  });
}
export async function digestFile(file) {
  if (!ALLOWED.includes(file.type) || file.size > MAX_BYTES) throw new Error("Choose a PDF, JPG or PNG document up to 10 MB.");
  const bytes = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return { bytes, hash: `0x${[...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("")}` };
}
export async function uploadEncrypted(file) {
  const { bytes, hash } = await digestFile(file);
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, bytes);
  const rawKey = await crypto.subtle.exportKey("raw", key);
  const keyText = btoa(String.fromCharCode(...new Uint8Array(rawKey)));
  const api = import.meta.env.VITE_IPFS_API_URL;
  let cid;
  if (api) {
    const form = new FormData(); form.append("file", new Blob([iv, encrypted], { type: "application/octet-stream" }), `${file.name}.aes`);
    const response = await fetch(`${api.replace(/\/$/, "")}/api/v0/add?pin=true`, { method: "POST", body: form });
    if (!response.ok) throw new Error(`IPFS upload failed (${response.status}).`);
    const result = await response.json(); cid = result.Hash;
  } else {
    // Development fallback: store only the encrypted file in this browser, never on-chain.
    const localKey = `land-doc-${crypto.randomUUID()}`;
    await saveInBrowser(localKey, new Blob([iv, encrypted], { type: "application/octet-stream" }));
    cid = `local:${localKey}`;
  }
  return { hash, cid, keyText, iv: [...iv] };
}
export async function verifyFile(file, expectedHash) {
  const { hash } = await digestFile(file);
  return hash.toLowerCase() === expectedHash.toLowerCase();
}
