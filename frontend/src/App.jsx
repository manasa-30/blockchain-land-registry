import React, { useCallback, useEffect, useState } from "react";
import { NavLink, Route, Routes, useLocation } from "react-router-dom";
import { ArrowLeftRight, Building2, Check, ChevronRight, CircleHelp, FilePlus2, House, Landmark, LoaderCircle, LogOut, Menu, ShieldCheck, Wallet, X } from "lucide-react";
import Dashboard from "./pages/Home.jsx";
import Properties from "./pages/Properties.jsx";
import Register from "./pages/Register.jsx";
import Transfers from "./pages/Transfers.jsx";
import Administration from "./pages/Administration.jsx";
import { connectWallet, friendlyError, readContract } from "./services/web3.js";
import { short } from "./utils/formatters.js";

const nav = [
  { to: "/", label: "Overview", icon: House }, { to: "/properties", label: "Land records", icon: Building2 },
  { to: "/transfers", label: "Transfers", icon: ArrowLeftRight }, { to: "/register", label: "Register land", icon: FilePlus2 },
  { to: "/administration", label: "Administration", icon: ShieldCheck }
];
function App() {
  const [wallet, setWallet] = useState(null), [lands, setLands] = useState([]), [transfers, setTransfers] = useState([]);
  const [role, setRole] = useState("Visitor"), [registrar, setRegistrar] = useState(false), [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null), [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const notify = (kind, message, hash) => { setNotice({ kind, message, hash }); window.setTimeout(() => setNotice(null), 10000); };
  const loadData = useCallback(async () => {
    try {
      const contract = readContract();
      const count = Number(await contract.getLandCount());
      const records = await Promise.all(Array.from({ length: count }, (_, i) => contract.getLand(i + 1)));
      setLands(records.filter(x => x.exists));
      const n = Number(await contract.getTransferCount());
      const all = await Promise.all(Array.from({ length: n }, (_, i) => contract.getTransferById(i + 1).then(t => ({ transferId: i + 1, ...t })).catch(() => null)));
      setTransfers(all.filter(Boolean));
    } catch { setLands([]); setTransfers([]); }
  }, []);
  useEffect(() => { loadData(); const timer = setInterval(loadData, 12000); return () => clearInterval(timer); }, [loadData]);
  useEffect(() => {
    if (!window.ethereum) return;
    const change = () => { setWallet(null); setRole("Visitor"); setRegistrar(false); loadData(); };
    window.ethereum.on("accountsChanged", change); window.ethereum.on("chainChanged", change);
    return () => { window.ethereum.removeListener?.("accountsChanged", change); window.ethereum.removeListener?.("chainChanged", change); };
  }, [loadData]);
  const connect = async () => {
    try {
      const result = await connectWallet(); setWallet(result);
      const admin = await result.contract.administrator(); const isRegistrar = await result.contract.isRegistrar(result.account);
      const ownsLand = lands.some(land => land.owner.toLowerCase() === result.account.toLowerCase());
      const hasBought = transfers.some(item => item.buyer.toLowerCase() === result.account.toLowerCase());
      setRegistrar(isRegistrar); setRole(result.account.toLowerCase() === admin.toLowerCase() ? "Administrator" : isRegistrar ? "Land registrar" : ownsLand ? "Landowner" : hasBought ? "Buyer" : "Landowner / Buyer");
      notify("success", "Wallet connected to Hardhat Local.");
    } catch (e) { notify("error", friendlyError(e)); }
  };
  const act = async (fn, success) => {
    if (!wallet) return notify("error", "Connect a wallet before submitting a transaction.");
    if (loading) return;
    setLoading(true);
    try { const tx = await fn(wallet.contract); notify("pending", "Transaction submitted; waiting for confirmation…", tx.hash); await tx.wait(); notify("success", success, tx.hash); await loadData(); }
    catch (e) { notify("error", friendlyError(e)); } finally { setLoading(false); }
  };
  const current = nav.find(n => n.to === location.pathname)?.label || "Overview";
  return <div className="shell">
    <aside className={`sidebar ${mobileOpen ? "show" : ""}`}>
      <div className="brand"><div className="brand-mark"><Landmark size={21}/></div><div className="brand-copy"><b className="brand-title">Blockchain Land Registry</b><small>PROPERTY OWNERSHIP RECORDS</small></div><button className="icon-btn close-mobile" onClick={() => setMobileOpen(false)}><X size={18}/></button></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav>{nav.map(({ to, label, icon: Icon }) => <NavLink end={to === "/"} to={to} key={to} onClick={() => setMobileOpen(false)} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}><Icon size={18}/><span>{label}</span>{label === "Transfers" && transfers.filter(t => [1,2].includes(Number(t.status))).length > 0 && <em>{transfers.filter(t => [1,2].includes(Number(t.status))).length}</em>}</NavLink>)}</nav>
      <div className="sidebar-bottom"><div className="network-box"><span className="pulse-dot"/><div><b>Local development</b><small>Hardhat · Chain 31337</small></div></div><div className="side-user"><div className="avatar">{wallet ? wallet.account.slice(2,4).toUpperCase() : "G"}</div><div><b>{wallet ? short(wallet.account) : "Guest access"}</b><small>{role}</small></div>{wallet && <button title="Disconnect wallet" className="icon-btn" onClick={() => {setWallet(null);setRole("Visitor");setRegistrar(false);}}><LogOut size={16}/></button>}</div></div>
    </aside>
    {mobileOpen && <button className="scrim" onClick={() => setMobileOpen(false)} aria-label="Close navigation"/>}
    <main className="main"><header className="topbar"><div className="heading"><button className="icon-btn menu-btn" onClick={() => setMobileOpen(true)}><Menu size={19}/></button><div className="crumb">Portal <ChevronRight size={14}/> <b>{current}</b></div></div><div className="top-actions"><div className="chain-tag"><span className="pulse-dot"/>Hardhat Local</div>{wallet ? <button className="wallet-button connected"><Wallet size={16}/>{short(wallet.account)}</button> : <button className="wallet-button" onClick={connect}><Wallet size={16}/>Connect wallet</button>}</div></header>
      <div className="content"><Routes>
        <Route path="/" element={<Dashboard lands={lands} transfers={transfers} wallet={wallet} registrar={registrar}/>}/>
        <Route path="/properties" element={<Properties lands={lands} wallet={wallet} contract={wallet?.contract} notify={notify}/>}/>
        <Route path="/register" element={<Register wallet={wallet} act={act} loading={loading} notify={notify} lands={lands}/>}/>
        <Route path="/transfers" element={<Transfers transfers={transfers} lands={lands} wallet={wallet} registrar={registrar} act={act} loading={loading} notify={notify}/>}/>
        <Route path="/administration" element={<Administration wallet={wallet} registrar={registrar} lands={lands} transfers={transfers} act={act} loading={loading} notify={notify}/>}/>
        <Route path="*" element={<Dashboard lands={lands} transfers={transfers} wallet={wallet} registrar={registrar}/>}/>
      </Routes><footer><span>Academic prototype <span className="muted">· Local demonstrations</span></span><span><CircleHelp size={14}/> Blockchain records need legal and government verification</span></footer></div>
    </main>
    {notice && <div className={`toast ${notice.kind}`}><span className="toast-icon">{notice.kind === "success" ? <Check size={17}/> : notice.kind === "pending" ? <LoaderCircle className="spin" size={17}/> : <X size={17}/>}</span><div><b>{notice.kind === "error" ? "Action could not complete" : notice.kind === "pending" ? "Processing transaction" : "All set"}</b><p>{notice.message}</p>{notice.hash && <code>Tx {notice.hash}</code>}</div><button onClick={() => setNotice(null)}><X size={15}/></button></div>}
  </div>;
}
export default App;
