import React from "react";
import { NavLink } from "react-router-dom";
import { Activity, ArrowLeftRight, BadgeCheck, ChevronRight, FilePlus2, House, Landmark } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Empty, LandTable, PageTitle, Stat } from "../components/RegistryUI.jsx";
import { date, number, short, statusLabels } from "../utils/formatters.js";
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
export default Dashboard;
