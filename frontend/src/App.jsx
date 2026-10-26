import React, { useCallback, useEffect, useMemo, useState } from "react";
import { NavLink, Route, Routes, useLocation } from "react-router-dom";
import { Activity, ArrowLeftRight, BadgeCheck, Building2, Check, ChevronRight, CircleHelp, ClipboardList, FileCheck2, FilePlus2, Fingerprint, House, Landmark, LoaderCircle, LogOut, Menu, Search, ShieldCheck, Wallet, X } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { connectWallet, friendlyError, readContract } from "./services/web3.js";
import { uploadEncrypted, verifyFile } from "./services/documents.js";

const nav = [
  { to: "/", label: "Overview", icon: House }, { to: "/properties", label: "Land records", icon: Building2 },
  { to: "/transfers", label: "Transfers", icon: ArrowLeftRight }, { to: "/register", label: "Register land", icon: FilePlus2 },
  { to: "/administration", label: "Administration", icon: ShieldCheck }
];
const statusLabels = ["None", "Awaiting payment", "Awaiting review", "Approved", "Rejected", "Cancelled"];
const short = value => typeof value === "string" && value ? `${value.slice(0, 6)}…${value.slice(-4)}` : "—";
const number = value => Number(value || 0).toLocaleString();
const date = value => value ? new Date(Number(value) * 1000).toLocaleDateString() : "—";

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
      <div className="brand"><div className="brand-mark"><Landmark size={21}/></div><div><b>Terra Ledger</b><small>LAND RECORDS PORTAL</small></div><button className="icon-btn close-mobile" onClick={() => setMobileOpen(false)}><X size={18}/></button></div>
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
      </Routes><footer><span>Terra Ledger <span className="muted">· Academic prototype for local demonstrations</span></span><span><CircleHelp size={14}/> Blockchain records need legal and government verification</span></footer></div>
    </main>
    {notice && <div className={`toast ${notice.kind}`}><span className="toast-icon">{notice.kind === "success" ? <Check size={17}/> : notice.kind === "pending" ? <LoaderCircle className="spin" size={17}/> : <X size={17}/>}</span><div><b>{notice.kind === "error" ? "Action could not complete" : notice.kind === "pending" ? "Processing transaction" : "All set"}</b><p>{notice.message}</p>{notice.hash && <code>Tx {notice.hash}</code>}</div><button onClick={() => setNotice(null)}><X size={15}/></button></div>}
  </div>;
}

function PageTitle({ eyebrow = "LAND REGISTRY", title, subtitle, action }) { return <div className="page-title"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>; }
function Stat({ title, value, note, icon: Icon, tint = "green" }) { return <div className="stat-card"><div className={`stat-icon ${tint}`}><Icon size={19}/></div><div className="stat-label">{title}</div><div className="stat-value">{value}</div><div className="stat-note">{note}</div></div>; }
function Dashboard({ lands, transfers, wallet, registrar }) {
  const owned = lands.filter(l => wallet && l.owner.toLowerCase() === wallet.account.toLowerCase());
  const pending = transfers.filter(t => [1,2].includes(Number(t.status)));
  const today = new Date();
  const chart = Array.from({length:6}, (_, offset) => {
    const month = new Date(today.getFullYear(), today.getMonth() - 5 + offset, 1);
    const key = `${month.getFullYear()}-${month.getMonth()}`;
    return { name: month.toLocaleDateString(undefined, { month: "short" }), records: lands.filter(l => {
      const created = new Date(Number(l.registeredAt) * 1000);
      return `${created.getFullYear()}-${created.getMonth()}` === key;
    }).length };
  });
  return <><PageTitle eyebrow="MONDAY, OCTOBER 26, 2026" title="Good day. Your records are in order." subtitle="A clear view of registered land, ownership activity, and pending actions." action={<button className="button primary" onClick={() => window.location.assign("/register")}><FilePlus2 size={16}/>Register land</button>}/>
    <div className="stat-grid"><Stat title="Registered parcels" value={number(lands.length)} note="Verified on local chain" icon={Landmark}/><Stat title="Your properties" value={number(owned.length)} note={wallet ? "Owned by connected wallet" : "Connect wallet to view"} icon={House} tint="blue"/><Stat title="Pending transfers" value={number(pending.length)} note="Awaiting payment or review" icon={ArrowLeftRight} tint="amber"/><Stat title="Registrar status" value={registrar ? "Authorized" : "Read access"} note={registrar ? "You can review transfers" : "Wallet role determines access"} icon={BadgeCheck} tint="violet"/></div>
    <div className="dashboard-grid"><section className="panel chart-panel"><div className="panel-heading"><div><h2>Registry activity</h2><p>Parcel records on this network</p></div><span className="select-lite">Last 6 months</span></div><div className="chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chart} margin={{top:14,right:4,left:-26,bottom:0}}><defs><linearGradient id="fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#27826c" stopOpacity={.18}/><stop offset="100%" stopColor="#27826c" stopOpacity={0}/></linearGradient></defs><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill:"#80908b",fontSize:12}}/><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{fill:"#80908b",fontSize:11}}/><Tooltip/><Area type="monotone" dataKey="records" stroke="#27826c" strokeWidth={2.5} fill="url(#fill)"/></AreaChart></ResponsiveContainer></div></section>
      <section className="panel activity-panel"><div className="panel-heading"><div><h2>Recent activity</h2><p>Latest on-chain registry events</p></div><Activity size={18}/></div>{transfers.slice(-4).reverse().map(t => <div className="activity-row" key={String(t.landId)+String(t.createdAt)}><span className="activity-icon"><ArrowLeftRight size={15}/></span><div className="activity-text"><b>Transfer #{String(t.landId)}</b><small>{short(t.seller)} → {short(t.buyer)}</small></div><span className={`badge s${Number(t.status)}`}>{statusLabels[Number(t.status)]}</span></div>)}{transfers.length === 0 && <Empty text="No transfer activity yet."/>}</section>
    </div>
    <section className="panel table-panel"><div className="panel-heading"><div><h2>Recently registered land</h2><p>Public records available for verification</p></div><NavLink to="/properties" className="text-link">View all records <ChevronRight size={15}/></NavLink></div><LandTable lands={lands.slice(-5).reverse()} compact/></section>
  </>;
}
function Empty({ text }) { return <div className="empty"><div className="empty-icon"><ClipboardList size={20}/></div><span>{text}</span></div>; }
function LandTable({ lands, compact, onSelect }) { return <div className="table-wrap"><table><thead><tr><th>Survey number</th><th>Location</th><th>Area</th><th>Current owner</th><th>Registered</th><th>Record</th>{onSelect&&<th></th>}</tr></thead><tbody>{lands.map(l => <tr key={String(l.id)}><td><b className="mono">{l.surveyNumber}</b></td><td>{l.location}</td><td>{number(l.areaSqMeters)} m²</td><td className="mono">{short(l.owner)}</td><td>{date(l.registeredAt)}</td><td><span className="verified"><BadgeCheck size={14}/>Verified</span></td>{onSelect&&<td><button className="text-link" onClick={()=>onSelect(l)}>Inspect <ChevronRight size={14}/></button></td>}</tr>)}</tbody></table>{lands.length === 0 && <Empty text="No land records found. Register the first parcel to get started."/>}</div>; }

function Properties({ lands, wallet, contract, notify }) {
  const [query,setQuery] = useState(""), [selected,setSelected] = useState(null), [history,setHistory] = useState([]), [claim,setClaim] = useState(""), [verification,setVerification] = useState(null), [file,setFile] = useState(null), [hashResult,setHashResult] = useState(null);
  const rows = useMemo(() => lands.filter(l => `${l.surveyNumber} ${l.location} ${l.owner}`.toLowerCase().includes(query.toLowerCase())), [lands,query]);
  const open = async l => { setSelected(l); setVerification(null); try { const c = contract || readContract(); setHistory(await c.getOwnershipHistory(l.id)); } catch { setHistory([]); } };
  const verify = async () => { try { setVerification(await (contract || readContract()).verifyOwnership(selected.id, claim)); } catch(e) { notify("error",friendlyError(e)); } };
  const verifyDocument = async () => { try { setHashResult(await verifyFile(file, selected.documentHash)); } catch(e) { notify("error",e.message); } };
  return <><PageTitle title="Land records" subtitle="Search public parcel records and inspect on-chain ownership history."/><section className="panel records-panel"><div className="searchbar"><Search size={18}/><input placeholder="Search survey number, location or wallet…" value={query} onChange={e=>setQuery(e.target.value)}/><span>{rows.length} records</span></div><LandTable lands={rows} onSelect={open}/></section>
    {selected && <div className="modal-backdrop" onClick={()=>setSelected(null)}><div className="modal" onClick={e=>e.stopPropagation()}><div className="modal-head"><div><div className="eyebrow">LAND RECORD · #{String(selected.id)}</div><h2>{selected.surveyNumber}</h2></div><button className="icon-btn" onClick={()=>setSelected(null)}><X size={18}/></button></div><div className="detail-grid"><Detail label="Location" value={selected.location}/><Detail label="Area" value={`${number(selected.areaSqMeters)} m²`}/><Detail label="Recorded owner" value={selected.owner} mono/><Detail label="Registered" value={date(selected.registeredAt)}/><Detail label="Document SHA-256" value={selected.documentHash} mono/><Detail label="IPFS CID" value={selected.documentCid || "Not provided"} mono/></div><div className="verify-box"><h3><Fingerprint size={17}/>Ownership verification</h3><div className="inline-form"><input value={claim} onChange={e=>setClaim(e.target.value)} placeholder="Enter claimed owner wallet address"/><button className="button secondary" onClick={verify}>Verify</button></div>{verification !== null && <p className={verification?"match":"mismatch"}>{verification?"Wallet matches the current recorded owner.":"This wallet does not match the current recorded owner."}</p>}</div><div className="verify-box"><h3><FileCheck2 size={17}/>Verify document integrity</h3><div className="inline-form"><input type="file" accept="application/pdf,image/jpeg,image/png" onChange={e=>setFile(e.target.files[0])}/><button className="button secondary" disabled={!file} onClick={verifyDocument}>Check hash</button></div>{hashResult !== null && <p className={hashResult?"match":"mismatch"}>{hashResult?"SHA-256 matches the on-chain record.":"Hash mismatch. Do not rely on this document."}</p>}</div><div className="history"><h3>Ownership history</h3>{history.map((h,i)=><div className="history-item" key={i}><div className="history-dot"/><div><b>{short(h.owner)}</b><small>{i === 0 ? "Initial registration" : "Ownership transferred"} · {date(h.timestamp)}</small></div></div>)}</div></div></div>}
  </>;
}
function Detail({label,value,mono}) { return <div className="detail"><small>{label}</small><b className={mono?"mono":""}>{value}</b></div>; }

function Register({ wallet, act, loading, notify, lands }) {
  const [form,setForm] = useState({owner:"",survey:"",area:"",location:""}), [file,setFile] = useState(null), [doc,setDoc] = useState(null), [uploading,setUploading] = useState(false);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const submit = async e => { e.preventDefault(); if(!wallet) return notify("error","Connect an authorized registrar wallet to register land."); if(!form.owner || !/^0x[a-fA-F0-9]{40}$/.test(form.owner)) return notify("error","Enter a valid owner wallet address."); if(!form.survey.trim() || !form.location.trim() || Number(form.area)<=0) return notify("error","Complete every field and enter a positive area.");
    let document = doc;
    if(file && !document) { setUploading(true); try { document = await uploadEncrypted(file); setDoc(document); notify("success",`Encrypted document uploaded. Save decryption key: ${document.keyText}`); } catch(error) { notify("error",error.message); setUploading(false); return; } setUploading(false); }
    if(!document) return notify("error","Upload a supporting document before registering.");
    await act(c=>c.registerLand(form.owner,form.survey.trim(),BigInt(Math.round(Number(form.area))),form.location.trim(),document.hash,document.cid),"Land record registered successfully.");
  };
  return <><PageTitle title="Register land" eyebrow="REGISTRAR SERVICES" subtitle="Create an auditable parcel record with a verified owner and encrypted supporting document."/><div className="form-layout"><section className="panel form-panel"><div className="form-heading"><span className="form-badge"><FilePlus2 size={20}/></span><div><h2>New land record</h2><p>Fields marked required are written to the local blockchain.</p></div></div><form onSubmit={submit}><label>Current owner wallet address <i>Required</i><input value={form.owner} onChange={e=>set("owner",e.target.value)} placeholder="0x…"/></label><div className="form-row"><label>Survey number <i>Required</i><input value={form.survey} onChange={e=>set("survey",e.target.value)} placeholder="e.g. SUR-1001"/></label><label>Area (m²) <i>Required</i><input type="number" min="1" value={form.area} onChange={e=>set("area",e.target.value)} placeholder="120"/></label></div><label>Property location <i>Required</i><input value={form.location} onChange={e=>set("location",e.target.value)} placeholder="District, state"/></label><label>Supporting document <i>Required</i><div className="dropzone"><input type="file" accept="application/pdf,image/jpeg,image/png" onChange={e=>{setFile(e.target.files[0]);setDoc(null);}}/><FileCheck2 size={19}/><b>{file?.name || "Choose a PDF or image"}</b><small>Up to 10 MB · AES-GCM encrypted before IPFS upload</small>{doc && <span className="match">CID: {doc.cid}</span>}</div></label><div className="form-note"><ShieldCheck size={17}/><span>Documents are encrypted in your browser before upload. The document hash and IPFS reference become public on-chain.</span></div><button disabled={loading||uploading} className="button primary wide">{loading||uploading?<LoaderCircle className="spin" size={17}/>:<Check size={17}/>} {uploading?"Encrypting & uploading…":loading?"Waiting for confirmation…":"Register parcel"}</button></form></section><aside className="panel side-info"><div className="eyebrow">REGISTRATION CHECKLIST</div><h3>Before submitting</h3>{["Confirm survey number is unique","Use a verified owner wallet","Check area in square metres","Upload the supporting document"].map((t,i)=><div className="check-row" key={t}><span>{i+1}</span>{t}</div>)}<div className="info-divider"/><p>Registration is restricted by the smart contract to the administrator and authorized registrar wallets.</p><div className="role-chip"><ShieldCheck size={15}/>{wallet?"Connected: "+short(wallet.account):"Connect registrar wallet"}</div><small className="record-count">{lands.length} land records currently on chain</small></aside></div></>;
}

function Transfers({ transfers, lands, wallet, registrar, act, loading, notify }) {
  const [landId,setLandId]=useState(""), [buyer,setBuyer]=useState(""), [price,setPrice]=useState(""), [depositId,setDepositId]=useState(""), [credit,setCredit]=useState(0n);
  useEffect(()=>{let active=true;if(wallet)wallet.contract.escrowCredits(wallet.account).then(value=>{if(active)setCredit(value);}).catch(()=>{});else setCredit(0n);return()=>{active=false;};},[wallet,transfers]);
  const mine = transfers.filter(t=>wallet && [t.seller,t.buyer].some(a=>a.toLowerCase()===wallet.account.toLowerCase()));
  const submit = e=>{e.preventDefault(); if(!/^0x[a-fA-F0-9]{40}$/.test(buyer)) return notify("error","Enter a valid buyer address."); if(Number(price)<=0) return notify("error","Enter a positive ETH price."); act(c=>c.initiateTransfer(landId,buyer,BigInt(Math.round(Number(price)*1e18))),"Transfer request created. Buyer can now deposit the exact amount.");};
  return <><PageTitle title="Property transfers" eyebrow="OWNERSHIP WORKFLOW" subtitle="Create a sale request, deposit payment in escrow, and track registrar review."/>{credit>0n&&<div className="credit-banner"><div><b>Escrow credit available</b><small>{Number(credit)/1e18} ETH · withdrawable after a transfer was resolved</small></div><button className="button primary" disabled={loading} onClick={()=>act(c=>c.withdrawEscrow(),"Escrow credit withdrawn to your wallet.")}><Wallet size={15}/>Withdraw credit</button></div>}<div className="transfer-layout"><section className="panel form-panel"><div className="panel-heading"><div><h2>Initiate a transfer</h2><p>Only the current owner can create the request.</p></div><ArrowLeftRight size={19}/></div><form onSubmit={submit}><label>Property you own<select value={landId} onChange={e=>setLandId(e.target.value)}><option value="">Choose a property</option>{lands.filter(l=>wallet&&l.owner.toLowerCase()===wallet.account.toLowerCase()).map(l=><option key={String(l.id)} value={l.id}>{l.surveyNumber} · {l.location}</option>)}</select></label><label>Buyer wallet address<input value={buyer} onChange={e=>setBuyer(e.target.value)} placeholder="0x…"/></label><label>Agreed price (ETH)<input type="number" min="0.000000000000000001" step="any" value={price} onChange={e=>setPrice(e.target.value)} placeholder="1.25"/></label><div className="form-note"><ShieldCheck size={17}/><span>Buyer must deposit the exact agreed amount. Funds remain locked until registrar approval, rejection, or valid cancellation.</span></div><button className="button primary wide" disabled={loading||!wallet}><ArrowLeftRight size={16}/>Create transfer request</button></form></section>
    <section className="panel form-panel"><div className="panel-heading"><div><h2>Deposit purchase amount</h2><p>Only the wallet named as buyer can pay into escrow.</p></div><Wallet size={19}/></div><form onSubmit={e=>{e.preventDefault();act(async c=>{const request=await c.getTransferById(depositId);return c.depositPayment(depositId,{value:request.price});},"Payment deposited in escrow. Await registrar review.");}}><label>Transfer request ID<input type="number" min="1" value={depositId} onChange={e=>setDepositId(e.target.value)} placeholder="Request number"/></label><button className="button secondary wide" disabled={loading||!depositId||!wallet}><Wallet size={16}/>Deposit exact amount</button></form><div className="subtle-help">The app loads the agreed price from the contract and submits that exact ETH amount. The contract checks both amount and buyer wallet.</div></section></div>
    <section className="panel table-panel"><div className="panel-heading"><div><h2>{registrar?"Transfer review queue":"Your transfer history"}</h2><p>{registrar?"Registrar actions are enforced by the contract.":"Transactions involving the connected wallet"}</p></div><span className="badge neutral">{registrar?transfers.filter(t=>[1,2].includes(Number(t.status))).length:mine.length} records</span></div><TransferList transfers={registrar?transfers.filter(t=>[1,2].includes(Number(t.status))):mine} lands={lands} wallet={wallet} act={act} loading={loading} notify={notify} isRegistrar={registrar}/></section>
  </>;
}
function TransferList({transfers,lands,wallet,act,loading,notify,isRegistrar}) {
  if(!transfers.length) return <Empty text="No transfer requests to display."/>;
  return <div className="transfer-list">{transfers.slice().reverse().map(t=>{const id=Number(t.landId),land=lands.find(l=>Number(l.id)===id),requestId=Number(t.transferId); const isBuyer=wallet&&t.buyer.toLowerCase()===wallet.account.toLowerCase(); const isSeller=wallet&&t.seller.toLowerCase()===wallet.account.toLowerCase(); const canCancel=isSeller||(isBuyer&&t.paymentDeposited); return <article className="transfer-card" key={requestId}><div className="transfer-main"><div className="transfer-badge"><ArrowLeftRight size={18}/></div><div><div className="transfer-title">{land?.surveyNumber || `Land #${id}`} <span>· Request {requestId}</span></div><div className="transfer-desc">{short(t.seller)} <ChevronRight size={12}/> {short(t.buyer)} · {land?.location || "Property"}</div></div></div><div className="transfer-amount"><b>{Number(t.price)/1e18} ETH</b><small>{date(t.createdAt)}</small></div><span className={`badge s${Number(t.status)}`}>{statusLabels[Number(t.status)]}</span><div className="transfer-actions">{isRegistrar&&Number(t.status)===2&&<><button className="button primary small" disabled={loading} onClick={()=>act(c=>c.approveTransfer(requestId),"Transfer approved. Seller payment is available as escrow credit.")}>Approve</button><button className="button danger small" disabled={loading} onClick={()=>{const reason=window.prompt("Reason for rejection:");if(reason!==null)act(c=>c.rejectTransfer(requestId,reason),"Transfer rejected. Buyer refund is available as escrow credit.");}}>Reject</button></>}{canCancel&&[1,2].includes(Number(t.status))&&<button className="button secondary small" disabled={loading} onClick={()=>act(c=>c.cancelTransfer(requestId),"Transfer cancelled. Any buyer refund is available as escrow credit.")}>Cancel</button>}</div></article>;})}</div>;
}

function Administration({ wallet, registrar, lands, transfers, act, loading, notify }) {
  const [address,setAddress]=useState(""); const [registrars,setRegistrars]=useState([]); const [admin,setAdmin]=useState("");
  useEffect(()=>{let active=true;if(wallet)wallet.contract.administrator().then(value=>{if(active)setAdmin(value);}).catch(()=>{if(active)setAdmin("");});else setAdmin("");return()=>{active=false;};},[wallet]);
  useEffect(()=>{if(wallet)wallet.contract.getRegistrars().then(setRegistrars).catch(()=>{});},[wallet,lands]);
  return <><PageTitle title="Administration" eyebrow="SYSTEM GOVERNANCE" subtitle="Manage registrar access and review registry activity. Smart contract roles are the source of truth."/><div className="stat-grid"><Stat title="Administrator" value={admin?short(admin):"—"} note="Immutable contract deployer" icon={ShieldCheck} tint="violet"/><Stat title="Authorized registrars" value={registrars.length} note="Addresses configured on chain" icon={BadgeCheck}/><Stat title="Pending reviews" value={transfers.filter(t=>Number(t.status)===2).length} note="Awaiting registrar action" icon={ClipboardList} tint="amber"/><Stat title="Total land records" value={lands.length} note="Current registry count" icon={Landmark} tint="blue"/></div><section className="admin-grid"><div className="panel form-panel"><div className="panel-heading"><div><h2>Registrar permissions</h2><p>Only the deployer administrator can change access.</p></div><ShieldCheck size={19}/></div><div className="inline-form"><input value={address} onChange={e=>setAddress(e.target.value)} placeholder="Registrar wallet address"/><button className="button primary" disabled={loading||!wallet||!/^0x[a-fA-F0-9]{40}$/.test(address)} onClick={()=>act(c=>c.addRegistrar(address),"Registrar access granted.")}>Add registrar</button></div><div className="registrar-list">{registrars.map(a=><div key={a} className="registrar-row"><div className="avatar small-avatar"><ShieldCheck size={14}/></div><span className="mono">{a}</span><span className="badge s3">Authorized</span><button className="button danger small" disabled={loading||!wallet} onClick={()=>act(c=>c.removeRegistrar(a),"Registrar access removed.")}>Remove</button></div>)}</div></div><div className="panel form-panel"><div className="panel-heading"><div><h2>Role access</h2><p>Current wallet permissions</p></div><Fingerprint size={19}/></div><div className="role-summary"><div className="role-summary-icon"><Wallet size={19}/></div><div><b>{wallet?short(wallet.account):"No wallet connected"}</b><small>{wallet?registrar?"Administrator or authorized registrar":"Connected wallet; read access":"Connect a wallet to inspect permissions"}</small></div></div><div className="access-note"><ShieldCheck size={16}/>{wallet&&registrar?"Privileged contract access confirmed.":"Privileged operations remain unavailable until you connect an authorized wallet."}</div></div></section><section className="panel table-panel"><div className="panel-heading"><div><h2>Pending transfer review</h2><p>Registrars can approve or reject after checking documents.</p></div></div><TransferList transfers={transfers.filter(t=>[1,2].includes(Number(t.status)))} lands={lands} wallet={wallet} act={act} loading={loading} notify={notify} isRegistrar={registrar}/></section><section className="panel table-panel"><div className="panel-heading"><div><h2>All land records</h2><p>Current on-chain registry state</p></div></div><LandTable lands={lands}/></section></>;
}

export default App;
