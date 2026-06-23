import { useState, useRef, useEffect } from "react";
import * as DB from "./lib/db";

// LIVE mode: set VITE_USE_SUPABASE=1 in .env to run against Supabase.
// Without it, the app runs on the built-in demo data below.
const LIVE = import.meta.env.VITE_USE_SUPABASE === "1";

const CAT_EMOJI = { Travel:"🌍", Events:"🎉", Gifts:"🎁", Housing:"🏡", Other:"🎯" };
const LIVE_BARS = ["#3B8EF5","#8B7BF0","#5AC8FA","#E07AC0"];

/** Map a DB group row + contribution rows into the shape the home cards render. */
function mapLiveGroup(row, contribRows, myId, idx) {
  const mine = contribRows.filter(c => c.group_id === row.id);
  const pot = mine.filter(c => c.status === "confirmed").reduce((a,c) => a + c.amount_cents, 0) / 100;
  const myRow = mine.find(c => c.member_id === myId);
  const started = new Date(row.started_at);
  const now = new Date();
  const monthsIn = Math.max(0, (now.getFullYear()-started.getFullYear())*12 + (now.getMonth()-started.getMonth()));
  const nextMonth = new Date(now.getFullYear(), now.getMonth()+1, 1);
  return {
    id: row.id, live: true,
    name: row.name, cat: row.category,
    goal: row.goal_cents/100, pot, monthly: row.monthly_cents/100,
    nextDue: nextMonth.toLocaleDateString(undefined,{month:"short",day:"numeric"}),
    daysLeft: Math.max(0, Math.ceil((nextMonth - now)/86400000)),
    myStatus: myRow && myRow.status === "confirmed" ? "paid" : "unpaid",
    alerts: 0, openVotes: 0,
    started: started.toLocaleDateString(undefined,{month:"short",year:"numeric"}),
    bar: LIVE_BARS[idx % LIVE_BARS.length],
    emoji: CAT_EMOJI[row.category] || CAT_EMOJI.Other,
    scene: row.scene || null,
    exitPolicy: row.exit_policy, joinPolicy: row.join_policy, monthsIn,
    treasurerId: row.treasurer_id,
    status: row.status === "completed" ? "completed" : undefined,
  };
}

// ── Design tokens — dark, blue accent, Sanduq branded ─────────
const C = {
  bg: "#070B14", surface: "#0E1521", surface2: "#131C2B",
  border: "#1E2A3D", border2: "#2A3950",
  // primary brand accent is now blue
  green: "#3B8EF5", greenLt: "rgba(59,142,245,0.14)", greenDk: "#2B6FD6",
  cyan: "#5AC8FA", cyanLt: "rgba(90,200,250,0.12)",
  purple: "#8B7BF0", purpleLt: "rgba(139,123,240,0.15)", purpleBright: "#A99BF5",
  blue: "#3B8EF5", blueLt: "rgba(59,142,245,0.12)",
  amber: "#F5A623", amberLt: "rgba(245,166,35,0.14)",
  red: "#F0556B", redLt: "rgba(240,85,107,0.12)",
  pink: "#E07AC0", pinkLt: "rgba(224,122,192,0.12)",
  text: "#FFFFFF", textMid: "#9BA8BD", textDim: "#6B7A90",
  white: "#FFFFFF",
};

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');`;

// ── Data ──────────────────────────────────────────────────────
const ME = { id: 1, name: "Jordan K.", initials: "JK", color: "#3B8EF5" };
const MCOLS = ["#3B8EF5","#5AC8FA","#8B7BF0","#F5A623","#E07AC0","#F0556B","#3DD6D0","#F0824D","#A99BF5","#60D9FA"];

const ALL_MEMBERS = {
  1: [
    { id:1, name:"Jordan K.", initials:"JK", status:"active", missed:0, contributed:1200, joined:"Jan 2025", isMe:true, color:MCOLS[0] },
    { id:2, name:"Marcus T.", initials:"MT", status:"active", missed:1, contributed:1100, joined:"Jan 2025", color:MCOLS[1] },
    { id:3, name:"Priya R.",  initials:"PR", status:"active", missed:0, contributed:1200, joined:"Jan 2025", color:MCOLS[4] },
    { id:4, name:"Devon A.",  initials:"DA", status:"warned", missed:2, contributed:900,  joined:"Feb 2025", color:MCOLS[3] },
    { id:5, name:"Sofia L.",  initials:"SL", status:"active", missed:0, contributed:1200, joined:"Jan 2025", color:MCOLS[6] },
  ],
  2: [
    { id:1, name:"Jordan K.", initials:"JK", status:"active", missed:0, contributed:1200, joined:"Mar 2025", isMe:true, color:MCOLS[0] },
    { id:6, name:"Sam W.",    initials:"SW", status:"active", missed:0, contributed:800, joined:"Mar 2025", color:MCOLS[5] },
    { id:7, name:"Chloe B.",  initials:"CB", status:"active", missed:0, contributed:800, joined:"Mar 2025", color:MCOLS[6] },
    { id:8, name:"Ravi M.",   initials:"RM", status:"active", missed:0, contributed:800, joined:"Apr 2025", color:MCOLS[7] },
  ],
  3: [
    { id:1,  name:"Jordan K.", initials:"JK", status:"active", missed:0, contributed:300, joined:"May 2025", isMe:true, color:MCOLS[0] },
    { id:9,  name:"Harry P.",  initials:"HP", status:"active", missed:0, contributed:300, joined:"May 2025", color:MCOLS[8] },
    { id:10, name:"Mei L.",    initials:"ML", status:"active", missed:0, contributed:300, joined:"May 2025", color:MCOLS[4] },
    { id:11, name:"Teo G.",    initials:"TG", status:"active", missed:0, contributed:300, joined:"May 2025", color:MCOLS[9] },
  ],
};

const SANDUQS = [
  { id:1, name:"Morocco Trip",        goal:12000, pot:5600, monthly:250, nextDue:"Jun 1", daysLeft:12, myStatus:"paid",   alerts:1, openVotes:2, started:"Jan 2025", bar:C.blue,    cat:"Travel", emoji:"🌍", scene:"morocco",    exitPolicy:"vote",   treasurerId:1, joinPolicy:"catchup", monthsIn:5 },
  { id:2, name:"Sam's Birthday Party",goal:3600,  pot:3600, monthly:200, nextDue:"—",     daysLeft:0,  myStatus:"paid",   alerts:0, openVotes:0, started:"Mar 2025", bar:C.purple,  cat:"Events", emoji:"🎉", scene:"birthday",   exitPolicy:"pot",    treasurerId:1, joinPolicy:"closed",  monthsIn:3 },
  { id:3, name:"Harry's Graduation",  goal:2000,  pot:600,  monthly:100, nextDue:"Jun 1", daysLeft:12, myStatus:"unpaid", alerts:0, openVotes:1, started:"May 2025", bar:C.cyan,    cat:"Events", emoji:"🎓", scene:"graduation", exitPolicy:"refund", treasurerId:9, joinPolicy:"prorata", monthsIn:1 },
];

const EXIT_POLICY_LABELS = {
  refund: "Contributions refunded on exit",
  pot:    "Contributions stay in the pot on exit",
  vote:   "Group votes on exit refunds",
};

const JOIN_POLICY_LABELS = {
  catchup: "Late joiners catch up on missed months",
  prorata: "Late joiners pay from join date · pro-rata shares",
  closed:  "Membership locked — no late joins",
};

const PAYMENTS_BY_GROUP = {
  1: [
    { id:1, member:ALL_MEMBERS[1][0], amount:250, status:"confirmed",  paidAt:"Jun 1" },
    { id:2, member:ALL_MEMBERS[1][1], amount:250, status:"unpaid",     paidAt:null },
    { id:3, member:ALL_MEMBERS[1][2], amount:250, status:"confirmed",  paidAt:"Jun 1" },
    { id:4, member:ALL_MEMBERS[1][3], amount:250, status:"missed",     paidAt:null },
    { id:5, member:ALL_MEMBERS[1][4], amount:250, status:"confirmed",  paidAt:"Jun 1" },
  ],
  2: [
    { id:1, member:ALL_MEMBERS[2][0], amount:200, status:"confirmed", paidAt:"Jun 1" },
    { id:2, member:ALL_MEMBERS[2][1], amount:200, status:"confirmed", paidAt:"Jun 3" },
    { id:3, member:ALL_MEMBERS[2][2], amount:200, status:"confirmed", paidAt:"Jun 2" },
    { id:4, member:ALL_MEMBERS[2][3], amount:200, status:"confirmed", paidAt:"Jun 1" },
  ],
  3: [
    { id:1, member:ALL_MEMBERS[3][0], amount:100, status:"unpaid",    paidAt:null },
    { id:2, member:ALL_MEMBERS[3][1], amount:100, status:"confirmed", paidAt:"Jun 1" },
    { id:3, member:ALL_MEMBERS[3][2], amount:100, status:"confirmed", paidAt:"Jun 2" },
    { id:4, member:ALL_MEMBERS[3][3], amount:100, status:"confirmed", paidAt:"Jun 1" },
  ],
};

const VOTES_BY_GROUP = {
  1: [
    { id:1, type:"amendment", title:"Increase monthly contribution to $300", proposedBy:"Jordan K.", deadline:"3 days left", yes:3, no:1, total:5, userVoted:false },
    { id:2, type:"payout",    title:"Release full pot to Priya (trip organizer)", proposedBy:"Marcus T.", deadline:"7 days left", yes:2, no:0, total:5, userVoted:true, userChoice:"yes" },
  ],
  2: [
    { id:1, type:"payout", title:"Release full pot to Sam W. for party costs", proposedBy:"Chloe B.", deadline:"Passed Jun 4", yes:3, no:0, total:4, userVoted:true, userChoice:"yes" },
  ],
  3: [{ id:1, type:"amendment", title:"Move party date to July 12th", proposedBy:"Mei L.", deadline:"5 days left", yes:1, no:0, total:4, userVoted:false }],
};

const ACTIVITY_FEED = [
  { id:1, icon:"✓", title:"Payment confirmed",      body:"Jordan confirmed your May payment of $250.",      time:"2h ago",   read:false, type:"payment",  group:"Morocco Trip" },
  { id:2, icon:"↑", title:"New vote opened",        body:"Mei proposed moving Harry's party date.",         time:"Yesterday",read:false, type:"vote",     group:"Harry's Graduation" },
  { id:3, icon:"!",  title:"Payment due soon",      body:"$200 to Sam's Birthday Party due in 16 days.",    time:"Jun 1",    read:false, type:"reminder", group:"Sam's Birthday Party" },
  { id:4, icon:"⚠", title:"Devon missed a payment", body:"2 of 3 allowed misses in Morocco Trip.",          time:"Jun 1",    read:true,  type:"warning",  group:"Morocco Trip" },
  { id:5, icon:"$", title:"Marcus marked payment",  body:"Confirm when you receive $250.",                  time:"May 28",   read:true,  type:"payment",  group:"Morocco Trip" },
  { id:6, icon:"+", title:"Teo joined group",       body:"Welcome Teo to Harry's Graduation.",              time:"May 20",   read:true,  type:"member",   group:"Harry's Graduation" },
];

const MESSAGES_BY_GROUP = {
  1: [
    { id:1, sender:ALL_MEMBERS[1][2], text:"Just paid my June contribution! 🎉", time:"9:32 AM", mine:false },
    { id:2, sender:ALL_MEMBERS[1][1], text:"Same, we're almost halfway to the goal", time:"9:40 AM", mine:false },
    { id:3, sender:ALL_MEMBERS[1][0], text:"Amazing progress everyone. Should we lock in the riad in Marrakech?", time:"10:05 AM", mine:true },
    { id:4, sender:ALL_MEMBERS[1][4], text:"Yes! I found one with a rooftop pool 😍", time:"10:12 AM", mine:false },
    { id:5, sender:ALL_MEMBERS[1][2], text:"Let's vote on it so it's official", time:"10:15 AM", mine:false },
  ],
  2: [
    { id:1, sender:ALL_MEMBERS[2][1], text:"What's the plan for Sam's cake?", time:"Yesterday", mine:false },
    { id:2, sender:ALL_MEMBERS[2][0], text:"I can pick it up from the bakery on 1st Ave", time:"Yesterday", mine:true },
  ],
  3: [
    { id:1, sender:ALL_MEMBERS[3][2], text:"So proud of Harry! 🎓", time:"2 days ago", mine:false },
    { id:2, sender:ALL_MEMBERS[3][0], text:"Let's make this graduation unforgettable", time:"2 days ago", mine:true },
  ],
};

const EXPENSES_BY_GROUP = {
  1: [
    { id:1, logger:ALL_MEMBERS[1][2], desc:"Riad deposit — Marrakech", amount:800, date:"May 28", status:"released", receipt:true },
    { id:2, logger:ALL_MEMBERS[1][0], desc:"Travel insurance (group)", amount:240, date:"May 30", status:"recorded", receipt:false },
  ],
  2: [
    { id:1, logger:ALL_MEMBERS[2][1], desc:"Balloons & streamers", amount:45, date:"Jun 2", status:"recorded", receipt:true },
    { id:2, logger:ALL_MEMBERS[2][2], desc:"Cake deposit — 1st Ave bakery", amount:60, date:"Jun 3", status:"released", receipt:true },
  ],
  3: [],
};

const FRIENDS = [
  { id:2,  name:"Marcus T.", initials:"MT", color:"#5AC8FA", mutual:3, status:"friend" },
  { id:3,  name:"Priya R.",  initials:"PR", color:"#E07AC0", mutual:2, status:"friend" },
  { id:5,  name:"Sofia L.",  initials:"SL", color:"#3DD6D0", mutual:4, status:"friend" },
  { id:6,  name:"Sam W.",    initials:"SW", color:"#F0556B", mutual:1, status:"friend" },
  { id:9,  name:"Harry P.",  initials:"HP", color:"#A99BF5", mutual:2, status:"friend" },
  { id:12, name:"Nina K.",   initials:"NK", color:"#F5A623", mutual:5, status:"request" },
  { id:13, name:"Omar D.",   initials:"OD", color:"#F0824D", mutual:1, status:"request" },
];

const DM_THREADS = [
  { id:1, friend:{ name:"Priya R.", initials:"PR", color:"#E07AC0" }, last:"Found an amazing riad btw!", time:"10m", unread:2,
    msgs:[
      { id:1, text:"Hey! Did you see the vote I opened?", time:"9:55 AM", mine:false },
      { id:2, text:"Just voted yes 👍", time:"10:01 AM", mine:true },
      { id:3, text:"Found an amazing riad btw!", time:"10:04 AM", mine:false },
    ]},
  { id:2, friend:{ name:"Sam W.", initials:"SW", color:"#F0556B" }, last:"Don't forget the cake pickup", time:"2h", unread:0,
    msgs:[
      { id:1, text:"Don't forget the cake pickup Saturday", time:"8:12 AM", mine:false },
      { id:2, text:"On it! 🎂", time:"8:30 AM", mine:true },
    ]},
  { id:3, friend:{ name:"Marcus T.", initials:"MT", color:"#5AC8FA" }, last:"You: Sounds good", time:"1d", unread:0,
    msgs:[
      { id:1, text:"Can we talk about bumping the monthly?", time:"Yesterday", mine:false },
      { id:2, text:"Sounds good", time:"Yesterday", mine:true },
    ]},
];

const CALENDAR_EVENTS = [
  { id:1, type:"due",  groupId:3, group:"Harry's Graduation",   title:"Payment due · $100",          date:"Jun 1", color:C.cyan },
  { id:2, type:"due",  groupId:1, group:"Morocco Trip",         title:"Payment due · $250",          date:"Jun 1", color:C.blue },
  { id:3, type:"due",  groupId:2, group:"Sam's Birthday Party", title:"Payment due · $200",          date:"Jun 5", color:C.purple },
  { id:4, type:"goal", groupId:2, group:"Sam's Birthday Party", title:"Goal reached (projected)",    date:"Aug 5", color:C.purple },
  { id:5, type:"goal", groupId:3, group:"Harry's Graduation",   title:"Goal reached (projected)",    date:"Oct 1", color:C.cyan },
  { id:6, type:"goal", groupId:1, group:"Morocco Trip",         title:"Goal reached (projected)",    date:"Mar 1 '26", color:C.blue },
];

const NOTIF_SETTINGS = [
  { id:"payment_reminder",  label:"Payment reminders",     desc:"3 days before each due date",      default:true  },
  { id:"payment_confirmed", label:"Payment confirmed",     desc:"When your payment is confirmed",   default:true  },
  { id:"missed_payment",    label:"Missed payment alerts", desc:"When someone misses a payment",    default:true  },
  { id:"vote_opened",       label:"New votes",             desc:"When a proposal is created",       default:true  },
  { id:"vote_closing",      label:"Vote closing soon",     desc:"24h before a vote expires",        default:false },
  { id:"vote_result",       label:"Vote results",          desc:"When a vote passes or fails",      default:true  },
  { id:"member_joined",     label:"Member activity",       desc:"When someone joins or leaves",     default:false },
];

const CATS = ["All","Travel","Events","Gifts","Housing"];

// Validate a money input: returns { valid, value, error }
const MAX_AMOUNT = 1000000;
function parseAmount(raw) {
  const n = Number(raw);
  if (raw === "" || raw == null) return { valid:false, value:0, error:null };
  if (!Number.isFinite(n)) return { valid:false, value:0, error:"Enter a valid number" };
  if (n <= 0) return { valid:false, value:0, error:"Amount must be more than $0" };
  if (n > MAX_AMOUNT) return { valid:false, value:0, error:"That amount looks too high" };
  return { valid:true, value:Math.round(n*100)/100, error:null };
}

// ── Primitives ─────────────────────────────────────────────────

function Avatar({ m, size=36, ring=false }) {
  return (
    <div style={{
      width:size, height:size, borderRadius:"50%", background:m.color, flexShrink:0,
      display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:size*0.36, fontWeight:700, color:"#070B14",
      boxShadow: ring ? `0 0 0 2px ${C.bg}` : "none",
      fontFamily:"'DM Sans',sans-serif", letterSpacing:0.2,
    }}>{m.initials}</div>
  );
}

function Bar({ pct, color, height=7 }) {
  return (
    <div style={{ height, borderRadius:99, background:C.surface2, overflow:"hidden" }}>
      <div style={{ height:"100%", borderRadius:99, background:color, width:`${Math.min(pct*100,100)}%`, transition:"width 1s cubic-bezier(.4,0,.2,1)" }} />
    </div>
  );
}

function Pill({ label, color, bg }) {
  return (
    <span style={{ display:"inline-flex", alignItems:"center", padding:"3px 9px", borderRadius:7, fontSize:11, fontWeight:600, color, background:bg, border:`1px solid ${color}44`, fontFamily:"'DM Sans',sans-serif" }}>
      {label}
    </span>
  );
}

function SurfaceCard({ children, style={}, onClick }) {
  return (
    <div onClick={onClick} style={{
      background:C.surface, border:`1px solid ${C.border}`, borderRadius:20,
      padding:18, marginBottom:12, cursor:onClick?"pointer":"default",
      transition:onClick?"transform .15s,border-color .15s":"none",
      ...style,
    }}
    onMouseEnter={onClick?e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.borderColor=C.border2}:null}
    onMouseLeave={onClick?e=>{e.currentTarget.style.transform="";e.currentTarget.style.borderColor=C.border}:null}
    >{children}</div>
  );
}

function Eyebrow({ children }) {
  return <div style={{ fontFamily:"'DM Mono',monospace", fontSize:10, fontWeight:500, color:C.textDim, letterSpacing:2, textTransform:"uppercase", marginBottom:8 }}>{children}</div>;
}

function Divider() { return <div style={{ height:1, background:C.border }} />; }

// ── Skeleton loading primitives ───────────────────────────────
function Sk({ w="100%", h=12, r=6, style={} }) {
  return <div style={{ width:w, height:h, borderRadius:r, background:`linear-gradient(90deg,${C.surface2} 25%,${C.border2} 37%,${C.surface2} 63%)`, backgroundSize:"400% 100%", animation:"shimmer 1.4s ease infinite", ...style }} />;
}

function SanduqCardSkeleton() {
  return (
    <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:22, marginBottom:16, overflow:"hidden" }}>
      <Sk h={150} r={0} />
      <div style={{ padding:16 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
          <Sk w={90} h={20} /><Sk w={70} h={20} />
        </div>
        <Sk h={7} r={99} style={{ marginBottom:14 }} />
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <Sk w={110} h={24} r={12} /><Sk w={60} h={16} />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon, title, body, action }) {
  return (
    <div style={{ textAlign:"center", padding:"44px 24px" }}>
      <div style={{ width:64, height:64, borderRadius:18, background:C.surface, border:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:30, margin:"0 auto 16px" }}>{icon}</div>
      <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:17, fontWeight:700, color:C.text }}>{title}</div>
      <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13.5, color:C.textMid, marginTop:6, lineHeight:1.5, maxWidth:280, marginLeft:"auto", marginRight:"auto" }}>{body}</div>
      {action}
    </div>
  );
}


// ── Logo mark — stacked "pool" forming an S-vault ─────────────
function Logo({ size = 38 }) {
  return (
    <div style={{ width:size, height:size, borderRadius:11, background:C.blue, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
      <svg width={size*0.62} height={size*0.62} viewBox="0 0 24 24" fill="none">
        {/* three pooled layers nested into a container */}
        <rect x="3" y="4" width="18" height="16" rx="4" stroke="#070B14" strokeWidth="2"/>
        <path d="M7 9.5h10" stroke="#070B14" strokeWidth="2" strokeLinecap="round"/>
        <path d="M7 14.5h10" stroke="#070B14" strokeWidth="2" strokeLinecap="round" opacity="0.55"/>
        <circle cx="12" cy="12" r="1.6" fill="#070B14"/>
      </svg>
    </div>
  );
}

function Wordmark({ size = 19 }) {
  return (
    <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:size, fontWeight:800, color:C.text, letterSpacing:-0.5 }}>
      Sanduq
    </span>
  );
}

// ── Nav line icons (Partiful-style) ───────────────────────────
function NavIcon({ name, active }) {
  const col = active ? C.blue : C.textDim;
  const sw = 2;
  const common = { width:26, height:26, viewBox:"0 0 24 24", fill:"none", stroke:col, strokeWidth:sw, strokeLinecap:"round", strokeLinejoin:"round" };
  if (name === "home") return (
    <svg {...common}><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/>{active && <rect x="9.5" y="13" width="5" height="7" rx="1" fill={col} stroke="none"/>}</svg>
  );
  if (name === "calendar") return (
    <svg {...common}><rect x="3.5" y="4.5" width="17" height="16" rx="3"/><path d="M3.5 9h17"/><path d="M8 2.5v4M16 2.5v4"/>{active && <circle cx="12" cy="14" r="2" fill={col} stroke="none"/>}</svg>
  );
  if (name === "explore") return (
    <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M12 3a14 14 0 0 0 0 18M12 3a14 14 0 0 1 0 18M3.5 9h17M3.5 15h17"/></svg>
  );
  if (name === "profile") return (
    <svg {...common}><circle cx="12" cy="8" r="4"/><path d="M4.5 20c0-4 3.5-6 7.5-6s7.5 2 7.5 6"/></svg>
  );
  if (name === "activity" || name === "bell") return (
    <svg {...common}><path d="M12 3a6 6 0 0 0-6 6c0 4-1.5 6-2.5 7h17C19.5 15 18 13 18 9a6 6 0 0 0-6-6Z"/><path d="M10 20a2 2 0 0 0 4 0"/>{active && <circle cx="12" cy="9" r="2.5" fill={col} stroke="none"/>}</svg>
  );
  return null;
}

// ── Illustrated poster scenes (CSS art) ───────────────────────
function Scene({ scene, height = 150 }) {
  const wrap = { position:"absolute", inset:0, overflow:"hidden" };

  if (scene === "morocco") {
    return (
      <div style={wrap}>
        {/* sky */}
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(180deg,#F6B45A 0%,#EE8B5B 45%,#C25E5E 100%)" }} />
        {/* sun */}
        <div style={{ position:"absolute", top:"22%", right:"16%", width:54, height:54, borderRadius:"50%", background:"radial-gradient(circle,#FFE9A8,#FFD166)", boxShadow:"0 0 40px rgba(255,209,102,0.7)" }} />
        {/* dunes */}
        <div style={{ position:"absolute", bottom:0, left:0, right:0, height:"58%", background:"linear-gradient(180deg,#C9743C,#9E5226)", clipPath:"ellipse(120% 100% at 30% 100%)" }} />
        <div style={{ position:"absolute", bottom:0, left:0, right:0, height:"42%", background:"linear-gradient(180deg,#A85A2C,#7C3E1E)", clipPath:"ellipse(120% 100% at 80% 100%)" }} />
        {/* archway silhouettes */}
        <div style={{ position:"absolute", bottom:"30%", left:"12%", width:30, height:46, background:"#5C2E18", borderRadius:"15px 15px 0 0" }} />
        <div style={{ position:"absolute", bottom:"30%", left:"20%", width:22, height:38, background:"#6B3820", borderRadius:"11px 11px 0 0" }} />
        <div style={{ position:"absolute", bottom:"30%", left:"26%", width:26, height:52, background:"#4D2614", borderRadius:"13px 13px 0 0" }} />
      </div>
    );
  }

  if (scene === "birthday") {
    return (
      <div style={wrap}>
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(160deg,#7B5BE0 0%,#B45CC4 55%,#E07AC0 100%)" }} />
        {/* confetti */}
        {[["12%","18%","#FFD166",0],["30%","52%","#5AC8FA",30],["48%","22%","#7BE0B0",-20],["66%","60%","#FF8FB0",15],["82%","30%","#FFD166",40],["22%","72%","#5AC8FA",-15],["74%","16%","#7BE0B0",25],["90%","58%","#FF8FB0",-30]].map((c,i)=>(
          <div key={i} style={{ position:"absolute", left:c[0], top:c[1], width:8, height:12, background:c[2], borderRadius:2, transform:`rotate(${c[3]}deg)`, opacity:0.95 }} />
        ))}
        {/* balloons */}
        <div style={{ position:"absolute", bottom:"18%", left:"16%", width:38, height:48, borderRadius:"50%", background:"radial-gradient(circle at 35% 30%,#FF9FC0,#F0556B)" }} />
        <div style={{ position:"absolute", bottom:"22%", left:"38%", width:34, height:44, borderRadius:"50%", background:"radial-gradient(circle at 35% 30%,#9FD8FF,#3B8EF5)" }} />
        <div style={{ position:"absolute", bottom:"16%", left:"60%", width:36, height:46, borderRadius:"50%", background:"radial-gradient(circle at 35% 30%,#FFE29F,#F5A623)" }} />
      </div>
    );
  }

  if (scene === "graduation") {
    return (
      <div style={wrap}>
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(170deg,#5AC8FA 0%,#3B8EF5 55%,#2B4FB0 100%)" }} />
        {/* sunburst rays */}
        <div style={{ position:"absolute", top:"-30%", left:"50%", width:"160%", height:"160%", transform:"translateX(-50%)", background:"repeating-conic-gradient(from 0deg at 50% 0%, rgba(255,255,255,0.08) 0deg 6deg, transparent 6deg 12deg)" }} />
        {/* mortarboard */}
        <div style={{ position:"absolute", top:"34%", left:"50%", transform:"translate(-50%,0)" }}>
          <div style={{ width:74, height:74, background:"#1A2235", transform:"rotate(45deg)", borderRadius:6, margin:"0 auto", boxShadow:"0 8px 20px rgba(0,0,0,0.3)" }} />
          <div style={{ width:30, height:18, background:"#2A3550", margin:"-14px auto 0", borderRadius:"0 0 6px 6px" }} />
          {/* tassel */}
          <div style={{ position:"absolute", top:0, left:"50%", width:2, height:34, background:"#FFD166" }} />
          <div style={{ position:"absolute", top:34, left:"calc(50% - 4px)", width:10, height:14, background:"#FFD166", borderRadius:"0 0 4px 4px" }} />
        </div>
      </div>
    );
  }

  // fallback gradient
  return <div style={{ ...wrap, background:`linear-gradient(135deg,${C.blue},${C.purple})` }} />;
}

function Toggle({ on, onChange }) {
  return (
    <div onClick={onChange} style={{ width:42, height:24, borderRadius:12, background:on?C.green:C.border, position:"relative", cursor:"pointer", transition:"background .2s", flexShrink:0 }}>
      <div style={{ position:"absolute", top:3, left:on?21:3, width:18, height:18, borderRadius:"50%", background:on?"#070B14":"#fff", transition:"left .2s", boxShadow:"0 1px 3px rgba(0,0,0,.4)" }} />
    </div>
  );
}

function Sheet({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.65)", display:"flex", alignItems:"flex-end", zIndex:300, animation:"fadeIn .2s ease" }}>
      <div onClick={e=>e.stopPropagation()} style={{ width:"100%", background:C.surface, borderRadius:"24px 24px 0 0", padding:"28px 20px 48px", maxHeight:"88vh", overflowY:"auto", animation:"slideUp .32s cubic-bezier(.32,.72,0,1)", border:`1px solid ${C.border2}`, borderBottom:"none" }}>
        {children}
      </div>
    </div>
  );
}

function PrimaryBtn({ children, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ width:"100%", padding:15, borderRadius:14, border:"none", background:disabled?C.border:C.green, color:disabled?C.textDim:"#070B14", fontFamily:"'DM Sans',sans-serif", fontSize:15, fontWeight:700, cursor:disabled?"default":"pointer", boxShadow:disabled?"none":`0 4px 16px ${C.green}44`, transition:"opacity .15s, transform .1s" }}
      onMouseDown={e=>!disabled&&(e.currentTarget.style.transform="scale(.97)")}
      onMouseUp={e=>e.currentTarget.style.transform=""}
    >{children}</button>
  );
}

// ── Payments Tab ───────────────────────────────────────────────

function PaymentsTab({ group, monthly, members, payments, onMarkSent, onConfirmReceipt, onDispute, onMarkUnpaid, expenses, setExpenses, showLogExpense, setShowLogExpense, expForm, setExpForm, isTreasurer, treasurer }) {
  const cycleMonthly = monthly ?? group.monthly;
  const [showModal, setShowModal] = useState(false);
  const [payStep, setPayStep] = useState("confirm");
  const [method, setMethod] = useState("bank");
  const myPayment = payments.find(p => p.member.isMe);
  const confirmed = payments.filter(p => p.status === "confirmed").length;
  const pendingPayments = payments.filter(p => p.status === "pending");
  const incomingTotal = pendingPayments.reduce((a,p) => a + p.amount, 0);
  const bar = group.bar;

  function handlePay() {
    setPayStep("processing");
    setTimeout(() => {
      setPayStep("done");
      setTimeout(() => { onMarkSent(myPayment.id); setShowModal(false); setPayStep("confirm"); }, 2200);
    }, 1400);
  }

  const SM = {
    confirmed: { label:"Confirmed by both",  color:C.green,   bg:C.greenLt },
    pending:   { label:"Sent · awaiting confirm", color:C.amber, bg:C.amberLt },
    disputed:  { label:"Disputed",           color:C.red,     bg:C.redLt },
    unpaid:    { label:"Not paid",           color:C.textMid, bg:C.surface2 },
    missed:    { label:"Missed",             color:C.red,     bg:C.redLt },
  };

  const TX = [
    { month:"May 2025", amount:group.monthly, method:"Venmo · to treasurer", date:"May 1" },
    { month:"Apr 2025", amount:group.monthly, method:"Cash App · to treasurer", date:"Apr 1" },
    { month:"Mar 2025", amount:group.monthly, method:"Venmo · to treasurer", date:"Mar 1" },
  ];

  return (
    <div>
      {/* Cycle hero */}
      <div style={{ background:`linear-gradient(135deg,${C.surface2},${C.surface})`, border:`1px solid ${C.border2}`, borderRadius:18, padding:18, marginBottom:12 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:C.textDim, letterSpacing:2, textTransform:"uppercase", marginBottom:6 }}>June 2025</div>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:30, fontWeight:500, color:C.text, letterSpacing:-1 }}>
              ${confirmed * cycleMonthly}<span style={{ fontSize:14, color:C.textDim }}> / ${members.length * cycleMonthly}</span>
            </div>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.textMid, marginTop:4 }}>{confirmed} of {members.length} members paid</div>
          </div>
          <div style={{ background:"rgba(255,255,255,.06)", borderRadius:12, padding:"8px 14px", textAlign:"center" }}>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:20, fontWeight:500, color:C.text }}>{Math.round((confirmed/members.length)*100)}%</div>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:10, color:C.textDim }}>received</div>
          </div>
        </div>
        <div style={{ marginTop:14 }}><Bar pct={confirmed/members.length} color={bar} /></div>
      </div>

      {/* My payment CTA */}
      {myPayment && (myPayment.status === "unpaid" || myPayment.status === "missed") && (
        <div style={{ background:C.greenLt, border:`1.5px solid ${C.green}44`, borderRadius:16, padding:16, marginBottom:12 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:700, color:C.text }}>Your contribution is due</div>
              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:24, fontWeight:500, color:C.green, marginTop:2 }}>${myPayment.amount}</div>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.textMid, marginTop:2 }}>Send to {treasurer?.name?.split(" ")[0] || "treasurer"} · Due {group.nextDue}</div>
            </div>
            <button onClick={()=>setShowModal(true)} style={{ padding:"12px 20px", borderRadius:12, border:"none", background:C.green, color:"#070B14", fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:700, cursor:"pointer", boxShadow:`0 4px 14px ${C.green}55`, transition:"transform .1s" }}
              onMouseDown={e=>e.currentTarget.style.transform="scale(.95)"}
              onMouseUp={e=>e.currentTarget.style.transform=""}>
              Send
            </button>
          </div>
        </div>
      )}
      {myPayment && myPayment.status === "pending" && (
        <div style={{ background:C.amberLt, border:`1px solid ${C.amber}44`, borderRadius:16, padding:"14px 16px", marginBottom:12, display:"flex", gap:12, alignItems:"center" }}>
          <div style={{ width:30, height:30, borderRadius:"50%", background:C.amber, display:"flex", alignItems:"center", justifyContent:"center", color:"#070B14", fontSize:14, flexShrink:0 }}>⏳</div>
          <div>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:700, color:C.text }}>Waiting for confirmation</div>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.textMid, marginTop:1 }}>You marked ${myPayment.amount} as sent · {treasurer?.name?.split(" ")[0]} will confirm receipt</div>
          </div>
        </div>
      )}
      {myPayment && myPayment.status === "confirmed" && (
        <div style={{ background:C.greenLt, border:`1px solid ${C.green}33`, borderRadius:16, padding:"14px 16px", marginBottom:12, display:"flex", gap:12, alignItems:"center" }}>
          <div style={{ width:30, height:30, borderRadius:"50%", background:C.green, display:"flex", alignItems:"center", justifyContent:"center", color:"#070B14", fontSize:15, fontWeight:700, flexShrink:0 }}>✓</div>
          <div>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:700, color:C.text }}>June contribution confirmed</div>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.textMid, marginTop:1 }}>${myPayment.amount} · received by {treasurer?.name?.split(" ")[0]}</div>
          </div>
        </div>
      )}

      {myPayment && myPayment.status === "disputed" && (
        <div style={{ background:C.redLt, border:`1px solid ${C.red}44`, borderRadius:16, padding:"14px 16px", marginBottom:12 }}>
          <div style={{ display:"flex", gap:12, alignItems:"center", marginBottom:12 }}>
            <div style={{ width:30, height:30, borderRadius:"50%", background:C.red, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:15, fontWeight:700, flexShrink:0 }}>!</div>
            <div>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:700, color:C.text }}>Payment in dispute</div>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.textMid, marginTop:1 }}>{treasurer?.name?.split(" ")[0]} hasn't matched your ${myPayment.amount}. Double-check you sent it, then re-flag so they can re-check.</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={()=>onMarkSent(myPayment.id)} style={{ flex:1, padding:11, borderRadius:10, background:C.amber, border:"none", fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:700, color:"#070B14", cursor:"pointer" }}>I did send it — re-flag</button>
            <button onClick={()=>onMarkUnpaid(myPayment.id)} style={{ flex:1, padding:11, borderRadius:10, background:"none", border:`1px solid ${C.border2}`, fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:600, color:C.textMid, cursor:"pointer" }}>I'll send again</button>
          </div>
        </div>
      )}

      {/* Member status */}
      <SurfaceCard>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
          <Eyebrow>Member status</Eyebrow>
          {isTreasurer && <Pill label="You're treasurer" color={C.blue} bg={C.blueLt} />}
        </div>
        {payments.map((p,i) => {
          const s = SM[p.status] || SM.unpaid;
          return (
            <div key={p.id}>
              <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 0" }}>
                <Avatar m={p.member} size={36} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                    <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:600, color:C.text }}>{p.member.name}</span>
                    {p.member.isMe && <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, color:C.textDim }}>· you</span>}
                  </div>
                  <Pill label={s.label} color={s.color} bg={s.bg} />
                  {/* Two-key handshake indicator */}
                  {(p.status==="pending"||p.status==="confirmed") && (
                    <div style={{ display:"flex", gap:10, marginTop:6 }}>
                      <span style={{ display:"inline-flex", alignItems:"center", gap:3, fontFamily:"'DM Sans',sans-serif", fontSize:11, color:C.green }}>✓ {p.member.isMe?"you":p.member.name.split(" ")[0]} sent</span>
                      <span style={{ display:"inline-flex", alignItems:"center", gap:3, fontFamily:"'DM Sans',sans-serif", fontSize:11, color:p.status==="confirmed"?C.green:C.textDim }}>{p.status==="confirmed"?"✓":"○"} {treasurer?.name?.split(" ")[0]} confirmed</span>
                    </div>
                  )}
                </div>
                {/* Treasurer confirm / dispute on a pending payment */}
                {isTreasurer && p.status === "pending" && !p.member.isMe ? (
                  <div style={{ display:"flex", flexDirection:"column", gap:6, flexShrink:0 }}>
                    <button onClick={()=>onConfirmReceipt(p.id)} style={{ padding:"8px 13px", borderRadius:9, background:C.green, border:"none", fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:700, color:"#070B14", cursor:"pointer", minHeight:34 }}>Confirm</button>
                    <button onClick={()=>onDispute(p.id)} style={{ padding:"6px 13px", borderRadius:9, background:"none", border:`1px solid ${C.red}55`, fontFamily:"'DM Sans',sans-serif", fontSize:11, fontWeight:600, color:C.red, cursor:"pointer" }}>Not received</button>
                  </div>
                ) : isTreasurer && p.status === "disputed" && !p.member.isMe ? (
                  <div style={{ display:"flex", flexDirection:"column", gap:6, flexShrink:0 }}>
                    <button onClick={()=>onConfirmReceipt(p.id)} style={{ padding:"8px 13px", borderRadius:9, background:C.green, border:"none", fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:700, color:"#070B14", cursor:"pointer", minHeight:34 }}>It arrived</button>
                    <button onClick={()=>onMarkUnpaid(p.id)} style={{ padding:"6px 13px", borderRadius:9, background:"none", border:`1px solid ${C.border2}`, fontFamily:"'DM Sans',sans-serif", fontSize:11, fontWeight:600, color:C.textMid, cursor:"pointer" }}>Mark unpaid</button>
                  </div>
                ) : (
                  <div style={{ fontFamily:"'DM Mono',monospace", fontSize:14, fontWeight:500, color:p.status==="confirmed"?C.green:p.status==="pending"?C.amber:p.status==="disputed"?C.red:C.textDim, flexShrink:0 }}>
                    {p.status==="confirmed"||p.status==="pending"||p.status==="disputed"?`$${p.amount}`:"—"}
                  </div>
                )}
              </div>
              {i < payments.length-1 && <Divider />}
            </div>
          );
        })}
      </SurfaceCard>

      {/* Tx history */}
      <SurfaceCard>
        <Eyebrow>Your history</Eyebrow>
        {TX.map((tx,i) => (
          <div key={i}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 0" }}>
              <div>
                <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:600, color:C.text }}>{tx.month}</div>
                <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.textMid, marginTop:2 }}>{tx.method} · {tx.date}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontFamily:"'DM Mono',monospace", fontSize:14, fontWeight:500, color:C.green }}>${tx.amount}</div>
                <Pill label="✓✓ Both confirmed" color={C.green} bg={C.greenLt} />
              </div>
            </div>
            {i < TX.length-1 && <Divider />}
          </div>
        ))}
      </SurfaceCard>

      {/* Expense ledger */}
      <SurfaceCard>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
          <Eyebrow>Expense ledger</Eyebrow>
          <button onClick={()=>setShowLogExpense(true)} style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:600, color:C.blue, background:"none", border:"none", cursor:"pointer", marginBottom:8 }}>+ Log expense</button>
        </div>
        <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.textDim, marginBottom:10 }}>Any member can record a purchase. The treasurer marks it reimbursed after sending the money back.</div>
        {expenses.length===0 && (
          <div style={{ textAlign:"center", padding:"18px 0", fontFamily:"'DM Sans',sans-serif", fontSize:13, color:C.textDim }}>No expenses recorded yet</div>
        )}
        {expenses.map((e,i) => (
          <div key={e.id}>
            <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 0" }}>
              <Avatar m={e.logger} size={34} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:600, color:C.text }}>{e.desc}</span>
                  {e.receipt
                    ? <span title="Receipt attached" style={{ fontSize:11, color:C.green }}>📎</span>
                    : <span title="No receipt" style={{ fontSize:11, color:C.textDim }}>○</span>}
                </div>
                <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.textDim, marginTop:2 }}>Logged by {e.logger.isMe?"you":e.logger.name} · {e.date}{e.receipt?"":" · no receipt"}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontFamily:"'DM Mono',monospace", fontSize:14, fontWeight:500, color:C.red }}>-${e.amount}</div>
                {e.status==="released"
                  ? <Pill label="Reimbursed" color={C.green} bg={C.greenLt} />
                  : isTreasurer
                    ? <button onClick={()=>setExpenses(xs=>xs.map(x=>x.id===e.id?{...x,status:"released"}:x))} style={{ padding:"5px 11px", borderRadius:8, background:C.blue, border:"none", fontFamily:"'DM Sans',sans-serif", fontSize:11, fontWeight:700, color:"#fff", cursor:"pointer", marginTop:3 }}>Mark reimbursed</button>
                    : <Pill label="Awaiting reimburse" color={C.amber} bg={C.amberLt} />}
              </div>
            </div>
            {i<expenses.length-1 && <Divider />}
          </div>
        ))}
        {expenses.length>0 && (
          <div style={{ display:"flex", justifyContent:"space-between", paddingTop:12, borderTop:`1px solid ${C.border}`, marginTop:4 }}>
            <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:C.textMid, fontWeight:600 }}>Total recorded</span>
            <span style={{ fontFamily:"'DM Mono',monospace", fontSize:14, fontWeight:500, color:C.text }}>${expenses.reduce((a,e)=>a+e.amount,0)}</span>
          </div>
        )}
      </SurfaceCard>

      {/* Log expense sheet */}
      <Sheet open={showLogExpense} onClose={()=>setShowLogExpense(false)}>
        <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:20, fontWeight:700, color:C.text, marginBottom:4 }}>Log an expense</div>
        <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:C.textMid, marginBottom:20 }}>Record a purchase made for {group.name}</div>
        <div style={{ background:C.surface2, borderRadius:14, padding:16, marginBottom:12 }}>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:C.textDim, letterSpacing:2, textTransform:"uppercase", marginBottom:8 }}>What was it?</div>
          <input value={expForm.desc} onChange={e=>setExpForm(f=>({...f,desc:e.target.value}))} placeholder="e.g. Balloons & streamers" style={{ width:"100%", border:"none", background:"none", fontFamily:"'DM Sans',sans-serif", fontSize:16, fontWeight:600, color:C.text, padding:0 }} />
        </div>
        <div style={{ background:C.surface2, borderRadius:14, padding:16, marginBottom:16 }}>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:C.textDim, letterSpacing:2, textTransform:"uppercase", marginBottom:8 }}>Amount</div>
          <div style={{ display:"flex", alignItems:"center", gap:4 }}>
            <span style={{ fontFamily:"'DM Mono',monospace", fontSize:24, color:C.textDim }}>$</span>
            <input type="number" value={expForm.amount} onChange={e=>setExpForm(f=>({...f,amount:e.target.value}))} placeholder="0" style={{ flex:1, border:"none", background:"none", fontFamily:"'DM Mono',monospace", fontSize:24, fontWeight:500, color:C.text, padding:0 }} />
          </div>
        </div>
        {/* Receipt attach */}
        <button onClick={()=>setExpForm(f=>({...f,receipt:!f.receipt}))} style={{ display:"flex", alignItems:"center", gap:12, width:"100%", padding:"14px 16px", borderRadius:12, marginBottom:16, background:expForm.receipt?C.greenLt:C.surface2, border:`1.5px dashed ${expForm.receipt?C.green:C.border2}`, cursor:"pointer", textAlign:"left" }}>
          <div style={{ fontSize:20 }}>{expForm.receipt?"📎":"📷"}</div>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:600, color:expForm.receipt?C.green:C.text }}>{expForm.receipt?"Receipt attached":"Attach a receipt"}</div>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.textDim, marginTop:1 }}>{expForm.receipt?"receipt-photo.jpg":"Recommended — builds group trust"}</div>
          </div>
        </button>
        {(() => {
          const amt = parseAmount(expForm.amount);
          return <>
            {expForm.amount !== "" && amt.error && (
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12.5, color:C.red, marginBottom:12, paddingLeft:2 }}>{amt.error}</div>
            )}
            <PrimaryBtn onClick={()=>{
              if (!expForm.desc.trim() || !amt.valid) return;
              setExpenses(xs=>[...xs, { id:Date.now(), logger:{...members.find(m=>m.isMe), isMe:true}, desc:expForm.desc.trim(), amount:amt.value, date:"Today", status:"recorded", receipt:!!expForm.receipt }]);
              setExpForm({ desc:"", amount:"" });
              setShowLogExpense(false);
            }} disabled={!expForm.desc.trim() || !amt.valid}>Record expense</PrimaryBtn>
          </>;
        })()}
        <button onClick={()=>setShowLogExpense(false)} style={{ width:"100%", padding:12, marginTop:8, background:"none", border:"none", fontFamily:"'DM Sans',sans-serif", fontSize:14, color:C.textMid, cursor:"pointer" }}>Cancel</button>
      </Sheet>

      {/* Pay sheet — peer-to-peer send */}
      <Sheet open={showModal} onClose={()=>payStep==="confirm"&&setShowModal(false)}>
        {payStep==="confirm" && myPayment && <>
          <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:20, fontWeight:700, color:C.text, marginBottom:4 }}>Send your contribution</div>
          <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:C.textMid, marginBottom:20 }}>Pay {treasurer?.name} directly, then mark it as sent</div>

          <div style={{ background:C.surface2, borderRadius:14, padding:18, marginBottom:14, textAlign:"center" }}>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.textMid, marginBottom:6 }}>Amount</div>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:42, fontWeight:500, color:C.text, letterSpacing:-2 }}>${myPayment.amount}</div>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.textDim, marginTop:6 }}>June 2025 · {group.name}</div>
          </div>

          {/* Treasurer handle */}
          <div style={{ background:C.surface2, borderRadius:14, padding:"14px 16px", marginBottom:8, display:"flex", alignItems:"center", gap:12 }}>
            <Avatar m={treasurer} size={40} />
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:600, color:C.text }}>{treasurer?.name} <span style={{ fontSize:11, color:C.textDim, fontWeight:400 }}>· treasurer</span></div>
              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:13, color:C.blue, marginTop:1 }}>@{(treasurer?.name||"treasurer").toLowerCase().replace(/[^a-z]/g,"")}-sanduq</div>
            </div>
            <button onClick={()=>{ navigator.clipboard&&navigator.clipboard.writeText("@"+(treasurer?.name||"treasurer").toLowerCase().replace(/[^a-z]/g,"")+"-sanduq"); }} style={{ padding:"7px 12px", borderRadius:9, background:C.surface, border:`1px solid ${C.border}`, fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:600, color:C.textMid, cursor:"pointer" }}>Copy</button>
          </div>

          {/* App links */}
          <div style={{ display:"flex", gap:8, marginBottom:18 }}>
            {[{ n:"Venmo", c:"#3D95CE" },{ n:"Cash App", c:"#00D632" },{ n:"Zelle", c:"#6D1ED4" }].map(app => (
              <button key={app.n} style={{ flex:1, padding:"11px 0", borderRadius:11, background:C.surface2, border:`1px solid ${C.border}`, fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:600, color:C.text, cursor:"pointer" }}>
                <span style={{ color:app.c }}>●</span> {app.n}
              </button>
            ))}
          </div>

          <PrimaryBtn onClick={handlePay}>I've sent ${myPayment.amount}</PrimaryBtn>
          <button onClick={()=>setShowModal(false)} style={{ width:"100%", padding:12, marginTop:8, background:"none", border:"none", fontFamily:"'DM Sans',sans-serif", fontSize:14, color:C.textMid, cursor:"pointer" }}>Cancel</button>
        </>}
        {payStep==="processing" && (
          <div style={{ textAlign:"center", padding:"28px 0 12px" }}>
            <div style={{ width:64, height:64, borderRadius:"50%", background:C.amberLt, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px" }}>
              <div style={{ width:28, height:28, borderRadius:"50%", border:`3px solid ${C.amberLt}`, borderTopColor:C.amber, animation:"spin .7s linear infinite" }} />
            </div>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:20, fontWeight:700, color:C.text }}>Marking as sent...</div>
          </div>
        )}
        {payStep==="done" && (
          <div style={{ textAlign:"center", padding:"28px 0 12px" }}>
            <div style={{ width:64, height:64, borderRadius:"50%", background:C.amberLt, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px", fontSize:28, animation:"pop .4s ease" }}>⏳</div>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:20, fontWeight:700, color:C.text }}>Marked as sent</div>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:C.textMid, marginTop:8, lineHeight:1.5 }}>{treasurer?.name?.split(" ")[0]} will confirm once your ${myPayment?.amount} lands. You'll get a notification.</div>
          </div>
        )}
      </Sheet>
    </div>
  );
}

// ── Group Screen ───────────────────────────────────────────────

function GroupScreen({ group: g, onBack, onComplete }) {
  const [tab, setTab] = useState("overview");
  const [votes, setVotes] = useState(VOTES_BY_GROUP[g.id] || []);
  const [payments, setPayments] = useState(PAYMENTS_BY_GROUP[g.id] || []);
  const [showPropose, setShowPropose] = useState(false);
  const [messages, setMessages] = useState(MESSAGES_BY_GROUP[g.id] || []);
  const [draft, setDraft] = useState("");
  const [expenses, setExpenses] = useState(EXPENSES_BY_GROUP[g.id] || []);
  const [showLogExpense, setShowLogExpense] = useState(false);
  const [expForm, setExpForm] = useState({ desc:"", amount:"" });
  const [paidOut, setPaidOut] = useState(g.status === "completed");
  const [showPayout, setShowPayout] = useState(false);
  const [payoutMode, setPayoutMode] = useState("single");
  const [payoutRecipient, setPayoutRecipient] = useState(null);
  const [payoutStep, setPayoutStep] = useState("choose");
  // Payout distribution: list of {memberId, amount, confirmed} once treasurer records it
  const [distribution, setDistribution] = useState(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteView, setInviteView] = useState("share");
  const [linkCopied, setLinkCopied] = useState(false);
  const [showLeave, setShowLeave] = useState(false);
  const [treasurerId, setTreasurerId] = useState(g.treasurerId);
  const [groupMonthly, setGroupMonthly] = useState(g.monthly);
  const [groupGoal, setGroupGoal] = useState(g.goal);
  const [amendKind, setAmendKind] = useState(null); // "monthly" | "goal" | null
  const [amendValue, setAmendValue] = useState("");
  const [showSuccession, setShowSuccession] = useState(false);
  const [successionMode, setSuccessionMode] = useState("handoff"); // "handoff" (treasurer steps down) | "force" (member removes)
  const [nominee, setNominee] = useState(null);
  const members = ALL_MEMBERS[g.id] || [];
  const me = members.find(m => m.isMe);
  const isTreasurer = me && me.id === treasurerId;
  const MISS_LIMIT = 3;
  const [misses, setMisses] = useState(Object.fromEntries(members.map(m => [m.id, m.missed || 0])));
  const memberStatus = (id) => {
    const n = misses[id] || 0;
    if (n >= MISS_LIMIT) return { key:"removed", label:"Removed", color:C.textDim, bg:C.surface2 };
    if (n > 0) return { key:"warned", label:`${n}/${MISS_LIMIT} missed`, color:C.amber, bg:C.amberLt };
    return { key:"active", label:"Active", color:C.green, bg:C.greenLt };
  };
  const atRisk = members.filter(m => (misses[m.id]||0) === MISS_LIMIT-1);
  const treasurer = members.find(m => m.id === treasurerId);
  const pendingToOldTreasurer = payments.filter(p => p.status === "pending").length;
  const pct = g.pot / groupGoal;
  const goalReached = g.pot >= groupGoal && !paidOut && !distribution;
  const allConfirmed = distribution && distribution.every(d => d.confirmed);

  function executePayout() {
    setPayoutStep("processing");
    setTimeout(() => {
      // Build the distribution record the recipients will confirm against
      const totalContrib = members.reduce((a,m)=>a+m.contributed,0) || 1;
      const dist = payoutMode === "single"
        ? [{ memberId: payoutRecipient, amount: g.goal, confirmed: false }]
        : payoutMode === "prorata"
          ? members.map(m => ({ memberId: m.id, amount: Math.round(g.goal * (m.contributed/totalContrib)), confirmed: false }))
          : members.map(m => ({ memberId: m.id, amount: Math.round(g.goal/members.length), confirmed: false }));
      setDistribution(dist);
      setPayoutStep("done");
      setTimeout(() => {
        setShowPayout(false);
        setPayoutStep("choose");
      }, 2600);
    }, 1600);
  }

  function confirmReceipt(memberId) {
    const next = distribution.map(d => d.memberId===memberId ? { ...d, confirmed:true } : d);
    setDistribution(next);
    if (next.every(d => d.confirmed)) {
      setPaidOut(true);
      onComplete && onComplete();
    }
  }

  function sendMsg() {
    if (!draft.trim()) return;
    setMessages(ms => [...ms, { id:Date.now(), sender:ME, text:draft.trim(), time:"Now", mine:true }]);
    setDraft("");
  }

  function handleVote(id, choice) {
    setVotes(vs => vs.map(v => {
      if (v.id !== id) return v;
      const updated = { ...v, userVoted:true, userChoice:choice, yes:choice==="yes"?v.yes+1:v.yes };
      const needed = Math.ceil(members.length/2 + 0.01);
      // Execute on majority
      if (updated.yes >= needed && !updated.passed) {
        if (updated.type === "succession" && updated.nomineeId) {
          setTreasurerId(updated.nomineeId);
          updated.passed = true;
        }
        if (updated.type === "amendment" && updated.amend) {
          if (updated.amend.kind === "monthly") setGroupMonthly(updated.amend.value);
          if (updated.amend.kind === "goal") setGroupGoal(updated.amend.value);
          updated.passed = true;
        }
      }
      return updated;
    }));
  }

  function proposeAmendment() {
    const amt = parseAmount(amendValue);
    if (!amendKind || !amt.valid) return;
    setVotes(vs => [{
      id: Date.now(),
      type: "amendment",
      title: amendKind === "monthly"
        ? `Change monthly contribution to $${amt.value.toLocaleString()}`
        : `Change the goal to $${amt.value.toLocaleString()}`,
      proposedBy: me?.name || "You",
      deadline: "5 days left",
      yes: 1, no: 0, total: members.length,
      userVoted: true, userChoice: "yes",
      amend: { kind: amendKind, value: amt.value },
    }, ...vs]);
    setAmendKind(null);
    setAmendValue("");
    setShowPropose(false);
    setTab("votes");
  }

  function proposeSuccession() {
    if (!nominee) return;
    const nomineeMember = members.find(m => m.id === nominee);
    // Forced changes start with the proposer's own yes; handoffs imply the treasurer's consent as a yes
    setVotes(vs => [{
      id: Date.now(),
      type: "succession",
      title: successionMode === "handoff"
        ? `${treasurer?.name} is stepping down — make ${nomineeMember?.name} the new treasurer`
        : `Replace ${treasurer?.name} as treasurer with ${nomineeMember?.name}`,
      proposedBy: me?.name || "You",
      deadline: "5 days left",
      yes: 1, no: 0, total: members.length,
      userVoted: true, userChoice: "yes",
      nomineeId: nominee,
    }, ...vs]);
    setShowSuccession(false);
    setNominee(null);
    setTab("votes");
  }

  return (
    <div style={{ minHeight:"100vh", background:C.bg, paddingBottom:32 }}>
      {/* Poster banner */}
      <div style={{ position:"relative", height:200, padding:"52px 20px 16px", display:"flex", flexDirection:"column", justifyContent:"space-between", overflow:"hidden" }}>
        <Scene scene={g.scene} height={200} />
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(180deg,rgba(0,0,0,0.15) 30%,rgba(0,0,0,0.5) 100%)" }} />
        <button onClick={onBack} style={{ position:"relative", alignSelf:"flex-start", background:"rgba(0,0,0,0.28)", backdropFilter:"blur(4px)", border:"none", borderRadius:20, padding:"7px 14px 7px 10px", color:"#fff", fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>← Back</button>
        <div style={{ position:"relative", display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
          <div>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:30, fontWeight:800, color:"#fff", letterSpacing:-0.8, lineHeight:1.05, textShadow:"0 2px 14px rgba(0,0,0,0.4)" }}>{g.name}</div>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:"rgba(255,255,255,0.9)", marginTop:5, fontWeight:500 }}>{members.length} members · Since {g.started}</div>
          </div>
          <span style={{ fontSize:44, lineHeight:1, filter:"drop-shadow(0 2px 8px rgba(0,0,0,0.4))" }}>{g.emoji}</span>
        </div>
      </div>

      {/* Progress + tabs */}
      <div style={{ background:C.bg, padding:"16px 20px 0", borderBottom:`1px solid ${C.border}` }}>
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:"14px 16px", marginBottom:0, marginTop:-44, position:"relative", zIndex:2, boxShadow:"0 8px 24px rgba(0,0,0,0.3)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
            <span style={{ fontFamily:"'DM Mono',monospace", fontSize:24, fontWeight:500, color:C.text }}>${g.pot.toLocaleString()}</span>
            <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:C.textMid, alignSelf:"flex-end" }}>of ${groupGoal.toLocaleString()}</span>
          </div>
          <Bar pct={pct} color={g.bar} />
          <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.textMid, marginTop:8 }}>{Math.round(pct*100)}% funded · ${(groupGoal-g.pot).toLocaleString()} to go</div>
        </div>
        {/* Tabs */}
        <div style={{ display:"flex", marginTop:16 }}>
          {["overview","payments","votes","members","chat"].map(t => (
            <button key={t} onClick={()=>setTab(t)} style={{ flex:1, padding:"13px 4px", background:"none", border:"none", borderBottom:tab===t?`2px solid ${g.bar}`:"2px solid transparent", fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:tab===t?700:500, color:tab===t?g.bar:C.textDim, cursor:"pointer", textTransform:"capitalize", transition:"all .2s" }}>{t}</button>
          ))}
        </div>
      </div>

      <div style={{ padding:"20px 16px" }}>
        {/* Goal reached banner */}
        {goalReached && (
          <div style={{ background:`linear-gradient(135deg,${C.purple}33,${C.blue}22)`, border:`1.5px solid ${C.purple}66`, borderRadius:18, padding:"18px", marginBottom:14, position:"relative", overflow:"hidden" }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ fontSize:34 }}>🏆</div>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:17, fontWeight:800, color:C.text }}>Goal reached!</div>
                <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12.5, color:C.textMid, marginTop:2, lineHeight:1.4 }}>
                  The pot hit ${g.goal.toLocaleString()}. A payout vote has passed — the treasurer can now distribute funds.
                </div>
              </div>
            </div>
            {isTreasurer ? (
              <button onClick={()=>{ setPayoutRecipient(members.find(m=>m.name==="Sam W.")?.id ?? members[1].id); setShowPayout(true); }} style={{ width:"100%", marginTop:14, padding:14, borderRadius:12, background:C.purple, border:"none", fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:700, color:"#fff", cursor:"pointer", boxShadow:`0 4px 14px ${C.purple}55` }}>
                Distribute the pot
              </button>
            ) : (
              <div style={{ marginTop:14, padding:"12px 14px", borderRadius:12, background:"rgba(255,255,255,0.04)", border:`1px dashed ${C.border2}`, fontFamily:"'DM Sans',sans-serif", fontSize:13, color:C.textMid, textAlign:"center" }}>
                Awaiting distribution by {treasurer?.name} (treasurer)
              </div>
            )}
          </div>
        )}

        {/* Distribution awaiting confirmation — two-sided payout handshake */}
        {distribution && !paidOut && (
          <div style={{ background:`linear-gradient(135deg,${C.amber}22,${C.surface})`, border:`1.5px solid ${C.amber}55`, borderRadius:18, padding:"18px", marginBottom:14 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
              <div style={{ fontSize:22 }}>🤝</div>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:16, fontWeight:800, color:C.text }}>Confirming the payout</div>
            </div>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12.5, color:C.textMid, lineHeight:1.45, marginBottom:14 }}>
              {treasurer?.name?.split(" ")[0]} recorded sending the funds. Each recipient confirms once the money lands — the Sanduq closes when everyone has.
            </div>
            {distribution.map((d,i) => {
              const m = members.find(x=>x.id===d.memberId);
              const isMine = m?.isMe;
              return (
                <div key={d.memberId}>
                  <div style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0" }}>
                    <Avatar m={m} size={34} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:600, color:C.text }}>{m?.name}{isMine?" · you":""}</div>
                      <div style={{ fontFamily:"'DM Mono',monospace", fontSize:12, color:C.textMid }}>${d.amount.toLocaleString()}</div>
                    </div>
                    {d.confirmed ? (
                      <Pill label="Received ✓" color={C.green} bg={C.greenLt} />
                    ) : isMine ? (
                      <button onClick={()=>confirmReceipt(d.memberId)} style={{ padding:"8px 14px", borderRadius:10, background:C.green, border:"none", fontFamily:"'DM Sans',sans-serif", fontSize:12.5, fontWeight:700, color:"#070B14", cursor:"pointer", minHeight:36 }}>I received it</button>
                    ) : (
                      <Pill label="Awaiting" color={C.amber} bg={C.amberLt} />
                    )}
                  </div>
                  {i<distribution.length-1 && <Divider />}
                </div>
              );
            })}
            <div style={{ marginTop:12, fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.textDim, textAlign:"center" }}>
              {distribution.filter(d=>d.confirmed).length} of {distribution.length} confirmed
            </div>
          </div>
        )}

        {/* Completed banner */}
        {paidOut && (
          <div style={{ background:C.greenLt, border:`1px solid ${C.green}44`, borderRadius:18, padding:"16px 18px", marginBottom:14, display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:34, height:34, borderRadius:"50%", background:C.green, display:"flex", alignItems:"center", justifyContent:"center", color:"#070B14", fontSize:16, fontWeight:800, flexShrink:0 }}>✓</div>
            <div>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:15, fontWeight:800, color:C.text }}>Sanduq completed</div>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12.5, color:C.textMid, marginTop:1 }}>${g.goal.toLocaleString()} distributed · confirmed by all recipients · archived</div>
            </div>
          </div>
        )}

        {/* OVERVIEW */}
        {tab==="overview" && (
          <div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
              {[
                { label:"Monthly due", value:`$${groupMonthly}`, sub:"per member" },
                { label:"Next payment", value:g.nextDue, sub:`${g.daysLeft} days away` },
                { label:"Active votes", value:String(votes.length), sub:votes.length?"need attention":"all clear" },
                { label:"Your total", value:`$${members.find(m=>m.isMe)?.contributed?.toLocaleString()||0}`, sub:"contributed" },
              ].map(s => (
                <SurfaceCard key={s.label} style={{ marginBottom:0 }}>
                  <Eyebrow>{s.label}</Eyebrow>
                  <div style={{ fontFamily:"'DM Mono',monospace", fontSize:22, fontWeight:500, color:C.text }}>{s.value}</div>
                  <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.textMid, marginTop:3 }}>{s.sub}</div>
                </SurfaceCard>
              ))}
            </div>
            {atRisk.length > 0 && (
              <div style={{ background:C.amberLt, border:`1px solid ${C.amber}44`, borderRadius:14, padding:"14px 16px", display:"flex", gap:12, alignItems:"flex-start", marginBottom:12 }}>
                <div style={{ width:28, height:28, borderRadius:"50%", background:C.amber, display:"flex", alignItems:"center", justifyContent:"center", color:"#070B14", fontSize:13, fontWeight:700, flexShrink:0 }}>!</div>
                <div>
                  <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:700, color:C.text }}>{atRisk.map(m=>m.name).join(", ")} {atRisk.length>1?"have":"has"} missed {MISS_LIMIT-1} payments</div>
                  <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:C.textMid, marginTop:2 }}>One more miss triggers auto-removal with a pro-rata refund</div>
                </div>
              </div>
            )}
            <SurfaceCard>
              <Eyebrow>Group rules</Eyebrow>
              {[EXIT_POLICY_LABELS[g.exitPolicy] + " (set by creator)", JOIN_POLICY_LABELS[g.joinPolicy] + " (set by creator)", "3 missed payments = auto-removal + pro-rata refund","All changes require a simple majority vote"].map((r,i,arr) => (
                <div key={i}>
                  <div style={{ display:"flex", gap:10, padding:"10px 0", alignItems:"flex-start" }}>
                    <div style={{ width:5, height:5, borderRadius:"50%", background:g.bar, marginTop:6, flexShrink:0 }} />
                    <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:C.textMid, lineHeight:1.5 }}>{r}</div>
                  </div>
                  {i<arr.length-1 && <Divider />}
                </div>
              ))}
            </SurfaceCard>
          </div>
        )}

        {/* PAYMENTS */}
        {tab==="payments" && (
          <PaymentsTab group={g} monthly={groupMonthly} members={members} payments={payments}
            onMarkSent={id=>setPayments(ps=>ps.map(p=>p.id===id?{...p,status:"pending",paidAt:"Just now"}:p))}
            onConfirmReceipt={id=>setPayments(ps=>ps.map(p=>p.id===id?{...p,status:"confirmed",confirmedAt:"Just now"}:p))}
            onDispute={id=>setPayments(ps=>ps.map(p=>p.id===id?{...p,status:"disputed"}:p))}
            onMarkUnpaid={id=>setPayments(ps=>ps.map(p=>p.id===id?{...p,status:"unpaid",paidAt:null}:p))}
            expenses={expenses} setExpenses={setExpenses} showLogExpense={showLogExpense} setShowLogExpense={setShowLogExpense} expForm={expForm} setExpForm={setExpForm} isTreasurer={isTreasurer} treasurer={treasurer} />
        )}

        {/* VOTES */}
        {tab==="votes" && (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <div>
                <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:20, fontWeight:700, color:C.text }}>Votes</div>
                <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.textMid, marginTop:2 }}>Majority = {Math.ceil(members.length/2+.01)} of {members.length}</div>
              </div>
              <button onClick={()=>setShowPropose(true)} style={{ padding:"10px 18px", borderRadius:20, background:g.bar, border:"none", fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:600, color:"#070B14", cursor:"pointer", boxShadow:`0 4px 12px ${g.bar}44`, transition:"transform .1s" }}
                onMouseDown={e=>e.currentTarget.style.transform="scale(.95)"} onMouseUp={e=>e.currentTarget.style.transform=""}>
                + Propose
              </button>
            </div>
            {votes.length===0 && (
              <SurfaceCard style={{ textAlign:"center", padding:"40px 18px" }}>
                <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:15, fontWeight:600, color:C.textMid }}>No active votes</div>
                <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:C.textDim, marginTop:4 }}>Propose a change to get started</div>
              </SurfaceCard>
            )}
            {votes.map(v => {
              const needed = Math.ceil(members.length/2+.01);
              const passing = v.yes >= needed;
              const vc = v.type==="payout" ? g.bar : v.type==="succession" ? C.amber : C.purple;
              const vLabel = v.type==="payout" ? "Payout" : v.type==="succession" ? "Treasurer change" : "Amendment";
              const vBg = v.type==="payout" ? C.greenLt : v.type==="succession" ? C.amberLt : C.purpleLt;
              return (
                <SurfaceCard key={v.id}>
                  <Pill label={vLabel} color={vc} bg={vBg} />
                  <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:16, fontWeight:700, color:C.text, marginTop:10, marginBottom:4, lineHeight:1.35 }}>{v.title}</div>
                  <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.textDim, marginBottom:14 }}>by {v.proposedBy} · {v.deadline}{v.passed?" · passed ✓":""}</div>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                    <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.textMid }}>{v.yes}/{v.total} in favor</span>
                    <span style={{ fontFamily:"'DM Mono',monospace", fontSize:12, fontWeight:500, color:passing?C.green:C.textDim }}>{passing?"Passing ✓":`${needed-v.yes} more needed`}</span>
                  </div>
                  <Bar pct={v.yes/v.total} color={passing?C.green:vc} />
                  <div style={{ marginTop:14 }}>
                    {v.userVoted
                      ? <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:C.textMid }}>You voted <span style={{ fontWeight:700, color:v.userChoice==="yes"?C.green:C.red }}>{v.userChoice}</span></div>
                      : <div style={{ display:"flex", gap:8 }}>
                          {[{ch:"yes",label:"Yes",color:C.green,bg:C.greenLt},{ch:"no",label:"No",color:C.red,bg:C.redLt}].map(b => (
                            <button key={b.ch} onClick={()=>handleVote(v.id,b.ch)} style={{ flex:1, padding:11, borderRadius:10, background:b.bg, border:`1.5px solid ${b.color}44`, fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:700, color:b.color, cursor:"pointer", transition:"transform .1s" }}
                              onMouseDown={e=>e.currentTarget.style.transform="scale(.95)"} onMouseUp={e=>e.currentTarget.style.transform=""}>{b.label}</button>
                          ))}
                          <button onClick={()=>handleVote(v.id,"abstain")} style={{ padding:"11px 16px", borderRadius:10, background:C.surface2, border:`1.5px solid ${C.border}`, fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:700, color:C.textDim, cursor:"pointer" }}>Skip</button>
                        </div>
                    }
                  </div>
                </SurfaceCard>
              );
            })}
            <Sheet open={showPropose} onClose={()=>{ setShowPropose(false); setAmendKind(null); setAmendValue(""); }}>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:20, fontWeight:700, color:C.text, marginBottom:4 }}>New Proposal</div>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:C.textMid, marginBottom:20 }}>Requires {Math.ceil(members.length/2+.01)} of {members.length} to pass</div>
              {!amendKind ? (
                <>
                  {[
                    { k:"monthly", label:"Change monthly contribution", sub:`Currently $${groupMonthly}/member` },
                    { k:"goal",    label:"Change the goal amount",      sub:`Currently $${groupGoal.toLocaleString()}` },
                  ].map(opt => (
                    <button key={opt.k} onClick={()=>{ setAmendKind(opt.k); setAmendValue(""); }} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", width:"100%", padding:"15px 16px", marginBottom:8, background:C.surface2, border:`1px solid ${C.border}`, borderRadius:12, fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:500, color:C.text, cursor:"pointer", transition:"background .15s", textAlign:"left" }}
                      onMouseEnter={e=>e.currentTarget.style.background=C.border} onMouseLeave={e=>e.currentTarget.style.background=C.surface2}>
                      <span><div>{opt.label}</div><div style={{ fontSize:12, color:C.textDim, marginTop:2 }}>{opt.sub}</div></span>
                      <span style={{ color:C.textDim }}>›</span>
                    </button>
                  ))}
                  <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.textDim, textAlign:"center", marginTop:8, lineHeight:1.5 }}>For an early payout, use "Distribute" once the goal is reached. To change the treasurer, use the Treasurer card in Members.</div>
                </>
              ) : (() => {
                const amt = parseAmount(amendValue);
                return (
                  <>
                    <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:700, color:C.text, marginBottom:12 }}>{amendKind==="monthly"?"New monthly contribution":"New goal amount"}</div>
                    <div style={{ background:C.surface2, borderRadius:14, padding:16, marginBottom:8 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                        <span style={{ fontFamily:"'DM Mono',monospace", fontSize:28, color:C.textDim }}>$</span>
                        <input autoFocus type="number" value={amendValue} onChange={e=>setAmendValue(e.target.value)} placeholder={amendKind==="monthly"?String(groupMonthly):String(groupGoal)} style={{ flex:1, border:"none", background:"none", fontFamily:"'DM Mono',monospace", fontSize:28, fontWeight:500, color:C.text, padding:0, outline:"none" }} />
                      </div>
                    </div>
                    {amendValue!=="" && amt.error && <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12.5, color:C.red, marginBottom:12 }}>{amt.error}</div>}
                    <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12.5, color:C.textMid, marginBottom:16, lineHeight:1.45 }}>If this passes, every member's {amendKind==="monthly"?"monthly contribution":"shared goal"} changes to the new amount. Opens with your vote in favor.</div>
                    <PrimaryBtn onClick={proposeAmendment} disabled={!amt.valid}>Open vote</PrimaryBtn>
                    <button onClick={()=>{ setAmendKind(null); setAmendValue(""); }} style={{ width:"100%", padding:12, marginTop:8, background:"none", border:"none", fontFamily:"'DM Sans',sans-serif", fontSize:14, color:C.textMid, cursor:"pointer" }}>Back</button>
                  </>
                );
              })()}
            </Sheet>
          </div>
        )}

        {/* MEMBERS */}
        {tab==="members" && (
          <div>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:20, fontWeight:700, color:C.text, marginBottom:4 }}>Members</div>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:C.textMid, marginBottom:14 }}>{members.length} members · {Math.ceil(members.length/2+.01)} votes to pass</div>
            <SurfaceCard>
              {members.map((m,i) => {
                const s = memberStatus(m.id);
                const n = misses[m.id] || 0;
                const removed = s.key === "removed";
                return (
                  <div key={m.id}>
                    <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 0", opacity:removed?0.55:1 }}>
                      <Avatar m={m} size={40} />
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
                          <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:600, color:C.text }}>{m.name}</span>
                          {m.isMe && <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, color:C.textDim }}>· you</span>}
                          {m.id===treasurerId && <Pill label="Treasurer" color={C.blue} bg={C.blueLt} />}
                        </div>
                        <Pill label={s.label} color={s.color} bg={s.bg} />
                        {/* Treasurer miss controls */}
                        {isTreasurer && !m.isMe && !removed && (
                          <div style={{ display:"flex", gap:8, marginTop:7 }}>
                            <button onClick={()=>setMisses(x=>({...x,[m.id]:(x[m.id]||0)+1}))} style={{ padding:"4px 10px", borderRadius:7, background:C.redLt, border:`1px solid ${C.red}44`, fontFamily:"'DM Sans',sans-serif", fontSize:11, fontWeight:600, color:C.red, cursor:"pointer" }}>Mark missed</button>
                            {n>0 && <button onClick={()=>setMisses(x=>({...x,[m.id]:Math.max(0,(x[m.id]||0)-1)}))} style={{ padding:"4px 10px", borderRadius:7, background:"none", border:`1px solid ${C.border2}`, fontFamily:"'DM Sans',sans-serif", fontSize:11, fontWeight:600, color:C.textMid, cursor:"pointer" }}>Forgive</button>}
                          </div>
                        )}
                      </div>
                      <div style={{ fontFamily:"'DM Mono',monospace", fontSize:15, fontWeight:500, color:C.text }}>${m.contributed.toLocaleString()}</div>
                    </div>
                    {i<members.length-1 && <Divider />}
                  </div>
                );
              })}
            </SurfaceCard>
            <button onClick={()=>{ setInviteView("share"); setShowInvite(true); }} style={{ width:"100%", padding:14, background:C.surface, border:`1.5px dashed ${g.bar}66`, borderRadius:14, fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:600, color:g.bar, cursor:"pointer" }}>+ Invite a member</button>

            {/* Treasurer card + succession */}
            <SurfaceCard style={{ marginTop:12 }}>
              <Eyebrow>Treasurer</Eyebrow>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
                <Avatar m={treasurer} size={40} />
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:600, color:C.text }}>{treasurer?.name}{treasurer?.isMe?" · you":""}</div>
                  <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.textMid, marginTop:1 }}>Collects contributions and records payouts</div>
                </div>
              </div>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.textDim, lineHeight:1.45, marginBottom:12 }}>
                Changing the treasurer always needs a majority vote. {isTreasurer ? "You can hand off the role to another member." : "If the treasurer is unresponsive, any member can propose a replacement."}
              </div>
              {isTreasurer ? (
                <button onClick={()=>{ setSuccessionMode("handoff"); setNominee(null); setShowSuccession(true); }} style={{ width:"100%", padding:12, borderRadius:12, background:C.surface2, border:`1px solid ${C.border2}`, fontFamily:"'DM Sans',sans-serif", fontSize:13.5, fontWeight:600, color:C.text, cursor:"pointer" }}>Step down as treasurer</button>
              ) : (
                <button onClick={()=>{ setSuccessionMode("force"); setNominee(null); setShowSuccession(true); }} style={{ width:"100%", padding:12, borderRadius:12, background:C.surface2, border:`1px solid ${C.border2}`, fontFamily:"'DM Sans',sans-serif", fontSize:13.5, fontWeight:600, color:C.amber, cursor:"pointer" }}>Propose a treasurer change</button>
              )}
            </SurfaceCard>

            {/* Leave group */}
            <button onClick={()=>setShowLeave(true)} style={{ width:"100%", padding:13, marginTop:10, background:"none", border:"none", fontFamily:"'DM Sans',sans-serif", fontSize:13.5, fontWeight:600, color:C.textDim, cursor:"pointer" }}>Leave this Sanduq</button>

            <Sheet open={showLeave} onClose={()=>setShowLeave(false)}>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:20, fontWeight:700, color:C.text, marginBottom:4 }}>Leave {g.name}?</div>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:C.textMid, marginBottom:18 }}>Here's what happens to your ${members.find(m=>m.isMe)?.contributed?.toLocaleString()||0} based on this group's exit policy.</div>
              <div style={{ background:C.surface2, borderRadius:14, padding:"16px", marginBottom:16, display:"flex", gap:12, alignItems:"flex-start" }}>
                <div style={{ fontSize:24 }}>{g.exitPolicy==="refund"?"💸":g.exitPolicy==="pot"?"🤝":"🗳️"}</div>
                <div>
                  <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:700, color:C.text }}>
                    {g.exitPolicy==="refund"?"You'll be refunded":g.exitPolicy==="pot"?"Contributions stay in the pot":"The group will vote"}
                  </div>
                  <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12.5, color:C.textMid, marginTop:3, lineHeight:1.5 }}>
                    {g.exitPolicy==="refund"
                      ? `The treasurer will send back your $${members.find(m=>m.isMe)?.contributed?.toLocaleString()||0} (minus any spent funds, pro-rata).`
                      : g.exitPolicy==="pot"
                        ? "Your contributions remain with the group and won't be returned. This was set by the creator when the group started."
                        : "A majority vote will decide whether you're refunded. You'll be notified of the outcome."}
                  </div>
                </div>
              </div>
              <button onClick={()=>{ setShowLeave(false); onBack(); }} style={{ width:"100%", padding:15, borderRadius:14, background:C.redLt, border:`1px solid ${C.red}55`, fontFamily:"'DM Sans',sans-serif", fontSize:15, fontWeight:700, color:C.red, cursor:"pointer" }}>Leave Sanduq</button>
              <button onClick={()=>setShowLeave(false)} style={{ width:"100%", padding:12, marginTop:8, background:"none", border:"none", fontFamily:"'DM Sans',sans-serif", fontSize:14, color:C.textMid, cursor:"pointer" }}>Stay in group</button>
            </Sheet>

            {/* Treasurer succession sheet */}
            <Sheet open={showSuccession} onClose={()=>setShowSuccession(false)}>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:20, fontWeight:700, color:C.text, marginBottom:4 }}>
                {successionMode==="handoff" ? "Hand off treasurer role" : "Propose a treasurer change"}
              </div>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:C.textMid, marginBottom:16, lineHeight:1.45 }}>
                {successionMode==="handoff"
                  ? "Pick who should take over. The group votes to approve — it takes effect once a majority says yes."
                  : "Choose who should take over collecting funds. This opens a vote; a majority decides."}
              </div>

              {/* Pending-funds warning */}
              {pendingToOldTreasurer > 0 && (
                <div style={{ background:C.amberLt, border:`1px solid ${C.amber}44`, borderRadius:12, padding:"12px 14px", marginBottom:16, display:"flex", gap:10 }}>
                  <span style={{ fontSize:16 }}>⚠️</span>
                  <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12.5, color:C.text, lineHeight:1.45 }}>
                    {pendingToOldTreasurer} payment{pendingToOldTreasurer>1?"s are":" is"} still pending with {treasurer?.name?.split(" ")[0]}. Resolve {pendingToOldTreasurer>1?"those":"that"} first, or those members may need to resend to the new treasurer.
                  </div>
                </div>
              )}

              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:600, color:C.textMid, marginBottom:10 }}>New treasurer</div>
              {members.filter(m => m.id !== treasurerId).map(m => (
                <button key={m.id} onClick={()=>setNominee(m.id)} style={{ display:"flex", alignItems:"center", gap:12, width:"100%", padding:"11px 13px", borderRadius:12, marginBottom:7, background:nominee===m.id?C.blueLt:C.surface2, border:`1.5px solid ${nominee===m.id?C.blue:C.border}`, cursor:"pointer", textAlign:"left", transition:"all .15s" }}>
                  <Avatar m={m} size={36} />
                  <div style={{ flex:1 }}>
                    <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:600, color:C.text }}>{m.name}{m.isMe?" · you":""}</span>
                  </div>
                  <div style={{ width:18, height:18, borderRadius:"50%", border:`2px solid ${nominee===m.id?C.blue:C.border}`, background:nominee===m.id?C.blue:"none", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    {nominee===m.id && <div style={{ width:6, height:6, borderRadius:"50%", background:"#fff" }} />}
                  </div>
                </button>
              ))}

              <div style={{ marginTop:8 }}>
                <PrimaryBtn onClick={proposeSuccession} disabled={!nominee}>
                  {successionMode==="handoff" ? "Open handoff vote" : "Open replacement vote"}
                </PrimaryBtn>
              </div>
              <button onClick={()=>setShowSuccession(false)} style={{ width:"100%", padding:12, marginTop:8, background:"none", border:"none", fontFamily:"'DM Sans',sans-serif", fontSize:14, color:C.textMid, cursor:"pointer" }}>Cancel</button>
            </Sheet>
          </div>
        )}

        {/* CHAT */}
        {tab==="chat" && (
          <div style={{ display:"flex", flexDirection:"column", minHeight:"calc(100vh - 380px)" }}>
            <div style={{ flex:1 }}>
              {messages.map((m,i) => {
                const prev = messages[i-1];
                const showName = !m.mine && (!prev || prev.sender.id !== m.sender.id);
                return (
                  <div key={m.id} style={{ display:"flex", flexDirection:"column", alignItems:m.mine?"flex-end":"flex-start", marginBottom:10 }}>
                    {showName && <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, color:C.textDim, margin:"0 0 3px 40px" }}>{m.sender.name}</div>}
                    <div style={{ display:"flex", alignItems:"flex-end", gap:8, flexDirection:m.mine?"row-reverse":"row", maxWidth:"85%" }}>
                      {!m.mine ? <Avatar m={m.sender} size={28} /> : <div style={{ width:0 }} />}
                      <div style={{ background:m.mine?C.blue:C.surface, color:m.mine?"#fff":C.text, border:m.mine?"none":`1px solid ${C.border}`, borderRadius:m.mine?"16px 16px 4px 16px":"16px 16px 16px 4px", padding:"10px 14px", fontFamily:"'DM Sans',sans-serif", fontSize:14, lineHeight:1.4 }}>
                        {m.text}
                        <div style={{ fontSize:10, color:m.mine?"rgba(255,255,255,0.7)":C.textDim, marginTop:3, textAlign:"right" }}>{m.time}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Composer */}
            <div style={{ display:"flex", gap:8, alignItems:"center", marginTop:14, position:"sticky", bottom:16 }}>
              <input value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendMsg()} placeholder="Message the group..." style={{ flex:1, padding:"13px 16px", borderRadius:24, border:`1px solid ${C.border}`, background:C.surface, fontFamily:"'DM Sans',sans-serif", fontSize:14, color:C.text }} />
              <button onClick={sendMsg} style={{ width:46, height:46, borderRadius:"50%", background:draft.trim()?C.blue:C.surface2, border:"none", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0, transition:"background .15s" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={draft.trim()?"#fff":C.textDim} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z"/></svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Payout sheet */}
      <Sheet open={showPayout} onClose={()=>payoutStep==="choose"&&setShowPayout(false)}>
        {payoutStep==="choose" && (
          <>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:20, fontWeight:700, color:C.text, marginBottom:4 }}>Distribute the pot</div>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:C.textMid, marginBottom:18 }}>${g.goal.toLocaleString()} ready to distribute</div>

            <div style={{ background:C.purpleLt, border:`1px solid ${C.purple}44`, borderRadius:12, padding:"11px 14px", marginBottom:16, display:"flex", gap:9, alignItems:"center" }}>
              <span style={{ fontSize:15 }}>🗳️</span>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12.5, color:C.purpleBright, lineHeight:1.4 }}>Vote passed 3–0: <strong>Release full pot to Sam W.</strong></div>
            </div>

            <div style={{ display:"flex", gap:8, marginBottom:14 }}>
              {[{id:"single",label:"One person"},{id:"split",label:"Equal split"},{id:"prorata",label:"Pro-rata"}].map(m => (
                <button key={m.id} onClick={()=>setPayoutMode(m.id)} style={{ flex:1, padding:11, borderRadius:11, background:payoutMode===m.id?C.blueLt:C.surface2, border:`1.5px solid ${payoutMode===m.id?C.blue:C.border}`, fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:700, color:payoutMode===m.id?C.blue:C.textMid, cursor:"pointer", transition:"all .15s" }}>{m.label}</button>
              ))}
            </div>

            {payoutMode==="single" ? (
              <div style={{ marginBottom:18 }}>
                <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:600, color:C.textMid, marginBottom:9 }}>Send full pot to</div>
                {members.map(m => (
                  <button key={m.id} onClick={()=>setPayoutRecipient(m.id)} style={{ display:"flex", alignItems:"center", gap:12, width:"100%", padding:"11px 13px", borderRadius:12, marginBottom:7, background:payoutRecipient===m.id?C.blueLt:C.surface2, border:`1.5px solid ${payoutRecipient===m.id?C.blue:C.border}`, cursor:"pointer", textAlign:"left", transition:"all .15s" }}>
                    <Avatar m={m} size={34} />
                    <div style={{ flex:1 }}>
                      <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:600, color:C.text }}>{m.name}</span>
                      {m.isMe && <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, color:C.textDim }}> · you</span>}
                    </div>
                    {payoutRecipient===m.id && <span style={{ fontFamily:"'DM Mono',monospace", fontSize:14, fontWeight:500, color:C.blue }}>${g.goal.toLocaleString()}</span>}
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ marginBottom:18 }}>
                {payoutMode==="prorata" && (
                  <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.textMid, marginBottom:9, lineHeight:1.45 }}>Each member receives back in proportion to what they put in.</div>
                )}
                <div style={{ background:C.surface2, borderRadius:14, padding:"6px 16px" }}>
                  {(() => {
                    const totalContrib = members.reduce((a,m)=>a+m.contributed,0) || 1;
                    return members.map((m,i) => {
                      const share = payoutMode==="prorata"
                        ? Math.round(g.goal * (m.contributed/totalContrib))
                        : Math.round(g.goal/members.length);
                      return (
                        <div key={m.id}>
                          <div style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 0" }}>
                            <Avatar m={m} size={32} />
                            <div style={{ flex:1 }}>
                              <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:600, color:C.text }}>{m.name}{m.isMe?" · you":""}</span>
                              {payoutMode==="prorata" && <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, color:C.textDim, marginTop:1 }}>put in ${m.contributed.toLocaleString()} · {Math.round(m.contributed/totalContrib*100)}%</div>}
                            </div>
                            <span style={{ fontFamily:"'DM Mono',monospace", fontSize:14, fontWeight:500, color:C.green }}>${share.toLocaleString()}</span>
                          </div>
                          {i<members.length-1 && <Divider />}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}

            <PrimaryBtn onClick={executePayout} disabled={payoutMode==="single" && !payoutRecipient}>
              {payoutMode==="single"
                ? `Send $${g.goal.toLocaleString()} to ${members.find(m=>m.id===payoutRecipient)?.name?.split(" ")[0] || "..."}`
                : payoutMode==="prorata"
                  ? `Distribute $${g.goal.toLocaleString()} pro-rata`
                  : `Split $${g.goal.toLocaleString()} ${members.length} ways`}
            </PrimaryBtn>
            <button onClick={()=>setShowPayout(false)} style={{ width:"100%", padding:12, marginTop:8, background:"none", border:"none", fontFamily:"'DM Sans',sans-serif", fontSize:14, color:C.textMid, cursor:"pointer" }}>Cancel</button>
          </>
        )}

        {payoutStep==="processing" && (
          <div style={{ textAlign:"center", padding:"28px 0 12px" }}>
            <div style={{ width:64, height:64, borderRadius:"50%", background:C.purpleLt, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px" }}>
              <div style={{ width:28, height:28, borderRadius:"50%", border:`3px solid ${C.purpleLt}`, borderTopColor:C.purple, animation:"spin .7s linear infinite" }} />
            </div>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:20, fontWeight:700, color:C.text }}>Recording payout...</div>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:C.textMid, marginTop:8 }}>Logging the distribution</div>
          </div>
        )}

        {payoutStep==="done" && (
          <div style={{ textAlign:"center", padding:"28px 0 12px", position:"relative", overflow:"hidden" }}>
            {["#3B8EF5","#8B7BF0","#E07AC0","#F5A623","#22C58B","#5AC8FA","#F0556B","#A99BF5","#F0824D","#3B8EF5","#E07AC0","#F5A623"].map((c,i) => (
              <div key={i} style={{ position:"absolute", top:-14, left:`${6+i*8}%`, width:8, height:13, background:c, borderRadius:2, animation:`confettiFall ${1.6+(i%4)*0.4}s ${i*0.09}s ease-in infinite`, transform:`rotate(${i*32}deg)` }} />
            ))}
            <div style={{ width:68, height:68, borderRadius:"50%", background:C.amberLt, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 18px", fontSize:30, animation:"pop .45s ease" }}>🤝</div>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:22, fontWeight:800, color:C.text }}>Payout recorded</div>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13.5, color:C.textMid, marginTop:8, lineHeight:1.5 }}>
              {payoutMode==="single"
                ? `Send $${g.goal.toLocaleString()} to ${members.find(m=>m.id===payoutRecipient)?.name} via your linked app. They'll confirm receipt to close the Sanduq.`
                : payoutMode==="prorata"
                  ? `Send each member their pro-rata share (shown in the group). Each confirms receipt to close the Sanduq.`
                  : `Send each member their $${(g.goal/members.length).toLocaleString(undefined,{maximumFractionDigits:0})} share. Each confirms receipt to close the Sanduq.`}
            </div>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.textDim, marginTop:6 }}>Awaiting recipient confirmation</div>
          </div>
        )}
      </Sheet>

      {/* Invite sheet */}
      <Sheet open={showInvite} onClose={()=>setShowInvite(false)}>
        <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:20, fontWeight:700, color:C.text, marginBottom:4 }}>Invite to {g.name}</div>
        <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:C.textMid, marginBottom:14 }}>New members see the goal, rules, and join terms before they accept.</div>

        {g.joinPolicy === "closed" ? (
          <div style={{ background:C.surface2, border:`1px solid ${C.border2}`, borderRadius:14, padding:"22px 18px", textAlign:"center" }}>
            <div style={{ fontSize:30, marginBottom:10 }}>🔒</div>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:15, fontWeight:700, color:C.text }}>This Sanduq is locked</div>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:C.textMid, marginTop:6, lineHeight:1.5 }}>The creator closed membership when the first month began. No new members can join this group.</div>
          </div>
        ) : <>

        {/* Join terms — what the invitee will be agreeing to */}
        <div style={{ background:g.joinPolicy==="catchup"?C.amberLt:C.blueLt, border:`1px solid ${g.joinPolicy==="catchup"?C.amber:C.blue}44`, borderRadius:12, padding:"12px 14px", marginBottom:14, display:"flex", gap:10, alignItems:"flex-start" }}>
          <span style={{ fontSize:16 }}>{g.joinPolicy==="catchup"?"⏰":"⚖️"}</span>
          <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12.5, color:C.text, lineHeight:1.5 }}>
            {g.joinPolicy==="catchup"
              ? <>Joining {g.monthsIn} month{g.monthsIn>1?"s":""} in: new members make a one-time catch-up of <strong>${(g.monthsIn*groupMonthly).toLocaleString()}</strong> ({g.monthsIn} × ${groupMonthly}) so everyone holds an equal stake.</>
              : <>New members pay from their join date — no back-pay. Payout shares stay <strong>proportional to what each person contributed</strong>.</>}
          </div>
        </div>

        {/* Share link */}
        <div style={{ background:C.surface2, border:`1px solid ${C.border}`, borderRadius:12, padding:"12px 14px", display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={C.textMid} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          <span style={{ flex:1, fontFamily:"'DM Mono',monospace", fontSize:12.5, color:C.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>sanduq.app/j/{g.name.toLowerCase().replace(/[^a-z]/g,"").slice(0,8)}-x9f2</span>
          <button onClick={()=>{ setLinkCopied(true); setTimeout(()=>setLinkCopied(false),1600); }} style={{ padding:"7px 13px", borderRadius:9, background:linkCopied?C.greenLt:C.surface, border:`1px solid ${linkCopied?C.green:C.border}`, fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:700, color:linkCopied?C.green:C.textMid, cursor:"pointer", flexShrink:0 }}>{linkCopied?"Copied ✓":"Copy"}</button>
        </div>

        {/* Share via apps */}
        <div style={{ display:"flex", gap:8, marginBottom:20 }}>
          {[{n:"Messages",c:C.green},{n:"WhatsApp",c:"#25D366"},{n:"More",c:C.textMid}].map(s => (
            <button key={s.n} style={{ flex:1, padding:"11px 0", borderRadius:11, background:C.surface2, border:`1px solid ${C.border}`, fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:600, color:C.text, cursor:"pointer" }}>
              <span style={{ color:s.c }}>●</span> {s.n}
            </button>
          ))}
        </div>

        {/* Invite from friends */}
        <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:600, color:C.textMid, marginBottom:10 }}>Add from your friends</div>
        {FRIENDS.filter(f=>f.status==="friend" && !members.some(m=>m.name===f.name)).map(f => (
          <div key={f.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"9px 0" }}>
            <Avatar m={f} size={36} />
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:600, color:C.text }}>{f.name}</div>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.textDim }}>{f.mutual} mutual friends</div>
            </div>
            <button onClick={e=>{ e.currentTarget.textContent="Invited"; e.currentTarget.disabled=true; e.currentTarget.style.opacity="0.5"; }} style={{ padding:"7px 14px", borderRadius:9, background:g.bar, border:"none", fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:700, color:"#070B14", cursor:"pointer" }}>Invite</button>
          </div>
        ))}
        </>}
      </Sheet>
    </div>
  );
}

function CreateScreen({ onBack, onCreate }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name:"", goal:"", monthly:"", cat:"", exitPolicy:"pot", joinPolicy:"catchup" });
  const [createBusy, setCreateBusy] = useState(false);
  const [createErr, setCreateErr] = useState(null);
  async function handleCreate() {
    if (!onCreate) { onBack(); return; }
    if (createBusy) return;
    setCreateErr(null); setCreateBusy(true);
    try { await onCreate(form); }
    catch (e) { setCreateErr(e.message); setCreateBusy(false); return; }
    setCreateBusy(false);
    onBack();
  }
  const upd = (k,v) => setForm(f=>({...f,[k]:v}));
  const can1 = form.name.trim().length > 0 && form.cat;
  const goalAmt = parseAmount(form.goal);
  const monthlyAmt = parseAmount(form.monthly);
  const can2 = goalAmt.valid && monthlyAmt.valid && monthlyAmt.value <= goalAmt.value;
  const months = can2 ? Math.ceil(goalAmt.value/(monthlyAmt.value*3)) : null;

  const EXIT_OPTIONS = [
    { id:"refund", label:"Refund on exit",  desc:"Members get their contributions back if they leave" },
    { id:"pot",    label:"Stays in pot",    desc:"Contributions remain with the group" },
    { id:"vote",   label:"Group votes",     desc:"Each exit refund is decided by majority vote" },
  ];

  const JOIN_OPTIONS = [
    { id:"catchup", label:"Catch up to join",  desc:"Late joiners back-pay the months they missed" },
    { id:"prorata", label:"Pay from join date", desc:"No back-pay — payout shares stay proportional to contributions" },
    { id:"closed",  label:"Locked at start",    desc:"No new members once the first month begins" },
  ];

  return (
    <div style={{ minHeight:"100vh", background:C.bg }}>
      <div style={{ background:`linear-gradient(160deg,${C.surface2},${C.bg})`, padding:"52px 20px 24px", borderBottom:`1px solid ${C.border}` }}>
        <button onClick={onBack} style={{ background:"rgba(255,255,255,.08)", border:"none", borderRadius:20, padding:"7px 14px 7px 10px", color:C.textMid, fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:6, marginBottom:20 }}>← Back</button>
        <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:26, fontWeight:800, color:C.text, marginBottom:20 }}>
          {step===1?"Name your Sanduq":step===2?"Set the rules":"Review & create"}
        </div>
        <div style={{ display:"flex", gap:6 }}>
          {[1,2,3].map(s => <div key={s} style={{ flex:1, height:3, borderRadius:3, background:s<=step?C.green:"rgba(255,255,255,.12)", transition:"all .3s" }} />)}
        </div>
      </div>
      <div style={{ padding:"24px 16px" }}>
        {step===1 && (
          <div>
            <SurfaceCard>
              <Eyebrow>Group name</Eyebrow>
              <input value={form.name} onChange={e=>upd("name",e.target.value)} placeholder="e.g. Morocco Trip, New Apartment..." autoFocus style={{ width:"100%", border:"none", background:"none", fontFamily:"'DM Sans',sans-serif", fontSize:18, fontWeight:600, color:C.text, padding:0 }} />
            </SurfaceCard>
            <SurfaceCard>
              <Eyebrow>Category</Eyebrow>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {["Travel","Events","Gifts","Housing","Other"].map(c => (
                  <button key={c} onClick={()=>upd("cat",c)} style={{ padding:"9px 16px", borderRadius:20, fontSize:13, fontWeight:600, background:form.cat===c?C.blue:C.surface2, color:form.cat===c?"#fff":C.textMid, border:`1px solid ${form.cat===c?C.blue:C.border}`, cursor:"pointer", transition:"all .15s", fontFamily:"'DM Sans',sans-serif" }}>{c}</button>
                ))}
              </div>
            </SurfaceCard>
            <PrimaryBtn onClick={()=>can1&&setStep(2)} disabled={!can1}>Continue</PrimaryBtn>
          </div>
        )}
        {step===2 && (
          <div>
            {[{label:"Total goal",key:"goal",hint:"How much is your group saving toward?"},{label:"Monthly per member",key:"monthly",hint:"How much does each member pay monthly?"}].map(f => (
              <SurfaceCard key={f.key}>
                <Eyebrow>{f.label}</Eyebrow>
                <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                  <span style={{ fontFamily:"'DM Mono',monospace", fontSize:28, color:C.textDim }}>$</span>
                  <input type="number" value={form[f.key]} onChange={e=>upd(f.key,e.target.value)} placeholder="0" style={{ flex:1, border:"none", background:"none", fontFamily:"'DM Mono',monospace", fontSize:28, fontWeight:500, color:C.text, padding:0, outline:"none" }} />
                </div>
                <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.textDim, marginTop:6 }}>{f.hint}</div>
                {form[f.key] !== "" && (f.key==="goal" ? goalAmt.error : monthlyAmt.error) && (
                  <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12.5, color:C.red, marginTop:6 }}>{f.key==="goal" ? goalAmt.error : monthlyAmt.error}</div>
                )}
              </SurfaceCard>
            ))}
            {goalAmt.valid && monthlyAmt.valid && monthlyAmt.value > goalAmt.value && (
              <div style={{ background:C.redLt, border:`1px solid ${C.red}33`, borderRadius:12, padding:"12px 16px", marginBottom:12 }}>
                <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:C.red, fontWeight:600 }}>Monthly contribution can't be more than the total goal.</div>
              </div>
            )}
            {months && (
              <div style={{ background:C.greenLt, border:`1px solid ${C.green}33`, borderRadius:12, padding:"12px 16px", marginBottom:12 }}>
                <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:C.green, fontWeight:600 }}>With 3 members, you'd reach your goal in <strong>{months} months</strong></div>
              </div>
            )}
            <SurfaceCard>
              <Eyebrow>What happens when someone exits?</Eyebrow>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.textDim, marginBottom:12 }}>You decide as the creator. This rule is shown to everyone before they join.</div>
              {EXIT_OPTIONS.map(opt => (
                <button key={opt.id} onClick={()=>upd("exitPolicy",opt.id)} style={{ display:"flex", alignItems:"center", gap:12, width:"100%", padding:13, borderRadius:12, marginBottom:8, background:form.exitPolicy===opt.id?C.blueLt:C.surface2, border:`1.5px solid ${form.exitPolicy===opt.id?C.blue:C.border}`, textAlign:"left", cursor:"pointer", transition:"all .15s" }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:600, color:C.text }}>{opt.label}</div>
                    <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.textMid, marginTop:2 }}>{opt.desc}</div>
                  </div>
                  <div style={{ width:18, height:18, borderRadius:"50%", border:`2px solid ${form.exitPolicy===opt.id?C.blue:C.border}`, background:form.exitPolicy===opt.id?C.blue:"none", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    {form.exitPolicy===opt.id && <div style={{ width:6, height:6, borderRadius:"50%", background:"#fff" }} />}
                  </div>
                </button>
              ))}
            </SurfaceCard>
            <SurfaceCard>
              <Eyebrow>Who can join after you start?</Eyebrow>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.textDim, marginBottom:12 }}>Late joiners see these terms on their invite before accepting.</div>
              {JOIN_OPTIONS.map(opt => (
                <button key={opt.id} onClick={()=>upd("joinPolicy",opt.id)} style={{ display:"flex", alignItems:"center", gap:12, width:"100%", padding:13, borderRadius:12, marginBottom:8, background:form.joinPolicy===opt.id?C.blueLt:C.surface2, border:`1.5px solid ${form.joinPolicy===opt.id?C.blue:C.border}`, textAlign:"left", cursor:"pointer", transition:"all .15s" }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:600, color:C.text }}>{opt.label}</div>
                    <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.textMid, marginTop:2 }}>{opt.desc}</div>
                  </div>
                  <div style={{ width:18, height:18, borderRadius:"50%", border:`2px solid ${form.joinPolicy===opt.id?C.blue:C.border}`, background:form.joinPolicy===opt.id?C.blue:"none", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    {form.joinPolicy===opt.id && <div style={{ width:6, height:6, borderRadius:"50%", background:"#fff" }} />}
                  </div>
                </button>
              ))}
            </SurfaceCard>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={()=>setStep(1)} style={{ flex:1, padding:15, borderRadius:14, background:C.surface, border:`1px solid ${C.border}`, fontFamily:"'DM Sans',sans-serif", fontSize:15, fontWeight:600, color:C.textMid, cursor:"pointer" }}>Back</button>
              <div style={{ flex:2 }}><PrimaryBtn onClick={()=>can2&&setStep(3)} disabled={!can2}>Continue</PrimaryBtn></div>
            </div>
          </div>
        )}
        {step===3 && (
          <div>
            <SurfaceCard>
              <Eyebrow>Review</Eyebrow>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
                <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:20, fontWeight:700, color:C.text }}>{form.name}</div>
                {form.cat && <Pill label={form.cat} color={C.blue} bg={C.blueLt} />}
              </div>
              <Divider />
              {[{l:"Total goal",v:`$${goalAmt.value.toLocaleString()}`},{l:"Monthly per member",v:`$${monthlyAmt.value.toLocaleString()}`},{l:"Payment schedule",v:"1st of every month"},{l:"Min. members",v:"3"},{l:"Governance",v:"Simple majority"},{l:"Exit policy",v:EXIT_OPTIONS.find(o=>o.id===form.exitPolicy)?.label},{l:"Join policy",v:JOIN_OPTIONS.find(o=>o.id===form.joinPolicy)?.label},{l:"Your role",v:"Treasurer"}].map((r,i,arr) => (
                <div key={r.l}>
                  <div style={{ display:"flex", justifyContent:"space-between", padding:"12px 0" }}>
                    <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:C.textMid }}>{r.l}</span>
                    <span style={{ fontFamily:"'DM Mono',monospace", fontSize:13, fontWeight:500, color:C.text }}>{r.v}</span>
                  </div>
                  {i<arr.length-1 && <Divider />}
                </div>
              ))}
            </SurfaceCard>
            <div style={{ background:C.greenLt, border:`1px solid ${C.green}33`, borderRadius:12, padding:"12px 16px", marginBottom:14 }}>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:C.green, lineHeight:1.5 }}>Members send contributions directly to the treasurer. Sanduq tracks every payment, vote, and expense — but never holds your money.</div>
            </div>
            {createErr && (
              <div style={{ background:C.redLt, border:`1px solid ${C.red}44`, borderRadius:12, padding:"12px 16px", marginBottom:12 }}>
                <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:C.red }}>{createErr}</div>
              </div>
            )}
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={()=>setStep(2)} style={{ flex:1, padding:15, borderRadius:14, background:C.surface, border:`1px solid ${C.border}`, fontFamily:"'DM Sans',sans-serif", fontSize:15, fontWeight:600, color:C.textMid, cursor:"pointer" }}>Back</button>
              <div style={{ flex:2 }}><PrimaryBtn onClick={handleCreate} disabled={createBusy}>{createBusy ? "Creating…" : "Create Sanduq 🎉"}</PrimaryBtn></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Onboarding (phone-first) ───────────────────────────────────

function Onboarding({ onDone, invite }) {
  const [step, setStep] = useState("welcome"); // welcome | phone | code | profile
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(["","","","","",""]);
  const [name, setName] = useState("");
  const [avatarColor, setAvatarColor] = useState("#3B8EF5");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const codeRefs = useRef([]);

  const fmtPhone = (v) => {
    const d = v.replace(/\D/g,"").slice(0,10);
    if (d.length<=3) return d;
    if (d.length<=6) return `(${d.slice(0,3)}) ${d.slice(3)}`;
    return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
  };
  const phoneValid = LIVE ? /^\S+@\S+\.\S+$/.test(email) : phone.replace(/\D/g,"").length === 10;
  const codeValid = code.every(c=>c!=="");
  const initials = name.trim() ? name.trim().split(/\s+/).map(w=>w[0]).slice(0,2).join("").toUpperCase() : "?";

  async function sendCode() {
    if (!phoneValid || busy) return;
    setErr(null);
    if (!LIVE) { setStep("code"); return; }
    setBusy(true);
    try { await DB.sendLoginCode(email.trim()); setStep("code"); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function verifyCode() {
    if (!codeValid || busy) return;
    setErr(null);
    if (!LIVE) { setStep("profile"); return; }
    setBusy(true);
    try { await DB.verifyLoginCode(email.trim(), code.join("")); setStep("profile"); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function finishProfile() {
    if (!name.trim() || busy) return;
    setErr(null);
    if (LIVE) {
      setBusy(true);
      try { await DB.updateDisplayName(name.trim()); }
      catch (e) { setErr(e.message); setBusy(false); return; }
      setBusy(false);
    }
    onDone({ name:name.trim(), initials, color:avatarColor });
  }

  function setCodeAt(i,v) {
    if (!/^\d?$/.test(v)) return;
    const next = [...code]; next[i] = v; setCode(next);
    if (v && i<5) codeRefs.current[i+1]?.focus();
  }

  // WELCOME
  if (step === "welcome") {
    return (
      <div style={{ minHeight:"100vh", background:C.bg, display:"flex", flexDirection:"column", justifyContent:"space-between", padding:"0 24px 40px" }}>
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", textAlign:"center" }}>
          <div style={{ marginBottom:28 }}><Logo size={72} /></div>
          <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:34, fontWeight:800, color:C.text, letterSpacing:-1, marginBottom:12 }}>Sanduq</div>
          {invite ? (
            <div style={{ background:C.blueLt, border:`1px solid ${C.blue}55`, borderRadius:16, padding:"16px 18px", maxWidth:320, marginBottom:6 }}>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:15, color:C.text, lineHeight:1.5 }}>
                You've been invited to join<br/><strong style={{ fontSize:17 }}>{invite.name}</strong>
              </div>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12.5, color:C.textMid, marginTop:8, lineHeight:1.45 }}>
                {invite.join_policy === "catchup"
                  ? `Saving $${(invite.monthly_cents/100).toLocaleString()}/month · joining ${invite.months_in} month${invite.months_in===1?"":"s"} in means a one-time catch-up of $${((invite.monthly_cents/100)*invite.months_in).toLocaleString()}.`
                  : invite.join_policy === "prorata"
                    ? `Saving $${(invite.monthly_cents/100).toLocaleString()}/month · you pay from today, shares stay proportional.`
                    : `Saving $${(invite.monthly_cents/100).toLocaleString()}/month toward $${(invite.goal_cents/100).toLocaleString()}.`}
              </div>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.textDim, marginTop:8 }}>Create your account to join.</div>
            </div>
          ) : (
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:16, color:C.textMid, lineHeight:1.55, maxWidth:300 }}>
              Save together, decide together. Group savings for trips, gifts, and the moments that matter.
            </div>
          )}
          {/* mini feature row */}
          {!invite && (
          <div style={{ display:"flex", gap:18, marginTop:34 }}>
            {[{e:"🎯",l:"Shared goals"},{e:"🗳️",l:"Group votes"},{e:"🔒",l:"No custody"}].map(f => (
              <div key={f.l} style={{ textAlign:"center" }}>
                <div style={{ fontSize:24, marginBottom:6 }}>{f.e}</div>
                <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11.5, color:C.textDim, fontWeight:600 }}>{f.l}</div>
              </div>
            ))}
          </div>
          )}
        </div>
        <div>
          <PrimaryBtn onClick={()=>setStep("phone")}>Get started</PrimaryBtn>
          <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.textDim, textAlign:"center", marginTop:14, lineHeight:1.5 }}>
            By continuing you agree to our Terms & Privacy Policy.
          </div>
        </div>
      </div>
    );
  }

  // PHONE (LIVE mode: email-code login for development)
  if (step === "phone") {
    return (
      <div style={{ minHeight:"100vh", background:C.bg, padding:"52px 24px 40px", display:"flex", flexDirection:"column" }}>
        <button onClick={()=>setStep("welcome")} style={{ alignSelf:"flex-start", background:C.surface, border:`1px solid ${C.border}`, borderRadius:20, padding:"7px 13px", color:C.textMid, fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:600, cursor:"pointer", marginBottom:32 }}>← Back</button>
        <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:26, fontWeight:800, color:C.text, marginBottom:8 }}>{LIVE ? "What's your email?" : "What's your number?"}</div>
        <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, color:C.textMid, marginBottom:28, lineHeight:1.5 }}>{LIVE ? "We'll email you a sign-in code. No passwords to remember." : "We'll text a code to verify it's you. No passwords to remember."}</div>
        {LIVE ? (
          <div style={{ background:C.surface, border:`1.5px solid ${phoneValid?C.blue:C.border}`, borderRadius:14, padding:"16px 18px", transition:"border-color .2s" }}>
            <input autoFocus value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" inputMode="email" type="email" style={{ width:"100%", border:"none", background:"none", fontFamily:"'DM Mono',monospace", fontSize:17, color:C.text }} />
          </div>
        ) : (
          <div style={{ background:C.surface, border:`1.5px solid ${phoneValid?C.blue:C.border}`, borderRadius:14, padding:"16px 18px", display:"flex", alignItems:"center", gap:10, transition:"border-color .2s" }}>
            <span style={{ fontFamily:"'DM Mono',monospace", fontSize:18, color:C.textMid }}>🇺🇸 +1</span>
            <input autoFocus value={phone} onChange={e=>setPhone(fmtPhone(e.target.value))} placeholder="(555) 000-0000" inputMode="numeric" style={{ flex:1, border:"none", background:"none", fontFamily:"'DM Mono',monospace", fontSize:18, color:C.text, letterSpacing:0.5 }} />
          </div>
        )}
        {err && <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:C.red, marginTop:12 }}>{err}</div>}
        <div style={{ flex:1 }} />
        <PrimaryBtn onClick={sendCode} disabled={!phoneValid || busy}>{busy ? "Sending…" : "Send code"}</PrimaryBtn>
      </div>
    );
  }

  // CODE
  if (step === "code") {
    return (
      <div style={{ minHeight:"100vh", background:C.bg, padding:"52px 24px 40px", display:"flex", flexDirection:"column" }}>
        <button onClick={()=>setStep("phone")} style={{ alignSelf:"flex-start", background:C.surface, border:`1px solid ${C.border}`, borderRadius:20, padding:"7px 13px", color:C.textMid, fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:600, cursor:"pointer", marginBottom:32 }}>← Back</button>
        <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:26, fontWeight:800, color:C.text, marginBottom:8 }}>Enter the code</div>
        <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, color:C.textMid, marginBottom:28, lineHeight:1.5 }}>Sent to {LIVE ? email : `+1 ${phone}`}. <span onClick={()=>setStep("phone")} style={{ color:C.blue, cursor:"pointer", fontWeight:600 }}>Change</span></div>
        <div style={{ display:"flex", gap:8, justifyContent:"space-between" }}>
          {code.map((c,i) => (
            <input key={i} ref={el=>codeRefs.current[i]=el} value={c} onChange={e=>setCodeAt(i,e.target.value)}
              onKeyDown={e=>{ if(e.key==="Backspace"&&!c&&i>0) codeRefs.current[i-1]?.focus(); }}
              inputMode="numeric" maxLength={1} autoFocus={i===0}
              style={{ width:48, height:58, textAlign:"center", borderRadius:12, border:`1.5px solid ${c?C.blue:C.border}`, background:C.surface, fontFamily:"'DM Mono',monospace", fontSize:24, fontWeight:500, color:C.text, transition:"border-color .15s" }} />
          ))}
        </div>
        {err && <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:C.red, marginTop:14, textAlign:"center" }}>{err}</div>}
        <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:C.textDim, marginTop:18, textAlign:"center" }}>
          Didn't get it? <span onClick={LIVE ? sendCode : undefined} style={{ color:C.blue, cursor:"pointer", fontWeight:600 }}>{LIVE ? "Resend code" : "Resend in 0:24"}</span>
        </div>
        <div style={{ flex:1 }} />
        <PrimaryBtn onClick={verifyCode} disabled={!codeValid || busy}>{busy ? "Verifying…" : "Verify"}</PrimaryBtn>
      </div>
    );
  }

  // PROFILE
  return (
    <div style={{ minHeight:"100vh", background:C.bg, padding:"52px 24px 40px", display:"flex", flexDirection:"column" }}>
      <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:26, fontWeight:800, color:C.text, marginBottom:8 }}>Set up your profile</div>
      <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, color:C.textMid, marginBottom:32, lineHeight:1.5 }}>This is how your friends will recognize you.</div>

      {/* Avatar preview */}
      <div style={{ display:"flex", justifyContent:"center", marginBottom:14 }}>
        <div style={{ width:96, height:96, borderRadius:"50%", background:avatarColor, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans',sans-serif", fontSize:36, fontWeight:700, color:"#070B14" }}>{initials}</div>
      </div>
      {/* Color picker */}
      <div style={{ display:"flex", gap:10, justifyContent:"center", marginBottom:28 }}>
        {["#3B8EF5","#8B7BF0","#E07AC0","#22C58B","#F5A623","#F0556B"].map(col => (
          <button key={col} onClick={()=>setAvatarColor(col)} style={{ width:30, height:30, borderRadius:"50%", background:col, border:avatarColor===col?`2.5px solid ${C.text}`:"2.5px solid transparent", cursor:"pointer", transition:"border .15s" }} />
        ))}
      </div>

      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:"16px 18px" }}>
        <div style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:C.textDim, letterSpacing:2, textTransform:"uppercase", marginBottom:8 }}>Your name</div>
        <input autoFocus value={name} onChange={e=>setName(e.target.value)} placeholder="First & last name" style={{ width:"100%", border:"none", background:"none", fontFamily:"'DM Sans',sans-serif", fontSize:17, fontWeight:600, color:C.text }} />
      </div>

      <div style={{ flex:1 }} />
      {err && <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:C.red, marginBottom:12, textAlign:"center" }}>{err}</div>}
      <PrimaryBtn onClick={finishProfile} disabled={!name.trim() || busy}>{busy ? "Saving…" : "Start using Sanduq"}</PrimaryBtn>
    </div>
  );
}

// ── Live group screen (Supabase-backed) ───────────────────────

function LiveGroupScreen({ group, myId, onBack, onChanged }) {
  const [detail, setDetail] = useState(null);
  const [err, setErr] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [copied, setCopied] = useState(false);
  // Edit + close
  const [editing, setEditing] = useState(false);
  const [edName, setEdName] = useState("");
  const [edCat, setEdCat] = useState("Other");
  const [edGoal, setEdGoal] = useState("");
  const [edMonthly, setEdMonthly] = useState("");
  const [edBusy, setEdBusy] = useState(false);
  const [edErr, setEdErr] = useState(null);
  const [confirmClose, setConfirmClose] = useState(false);
  // Invite a friend
  const [showFriendPicker, setShowFriendPicker] = useState(false);
  const [friendList, setFriendList] = useState([]);
  const [invitingId, setInvitingId] = useState(null);
  const [inviteFriendErr, setInviteFriendErr] = useState(null);
  // Expenses
  const [showExpense, setShowExpense] = useState(false);
  const [expDesc, setExpDesc] = useState("");
  const [expAmt, setExpAmt] = useState("");
  const [expBusy, setExpBusy] = useState(false);
  const [expErr, setExpErr] = useState(null);
  // Votes
  const [showPropose, setShowPropose] = useState(false);
  const [voteKind, setVoteKind] = useState("monthly");
  const [voteVal, setVoteVal] = useState("");
  const [voteBusy, setVoteBusy] = useState(false);
  const [voteErr, setVoteErr] = useState(null);
  const [ballotBusy, setBallotBusy] = useState(null);
  const [tab, setTab] = useState("overview");

  async function propose() {
    const cents = Math.round(parseFloat(voteVal) * 100);
    if (!cents || cents <= 0 || voteBusy) return;
    setVoteBusy(true); setVoteErr(null);
    try {
      await DB.proposeAmendment(group.id, voteKind, cents);
      await load(); onChanged && onChanged();
      setShowPropose(false); setVoteVal("");
    } catch (e) { setVoteErr(e.message); }
    finally { setVoteBusy(false); }
  }
  async function castBallot(voteId, choice) {
    setBallotBusy(voteId); setVoteErr(null);
    try {
      await DB.rpc.castBallot(voteId, choice);
      await load(); onChanged && onChanged();
    } catch (e) { setVoteErr(e.message); }
    finally { setBallotBusy(null); }
  }

  async function logExpense() {
    const cents = Math.round(parseFloat(expAmt) * 100);
    if (!expDesc.trim() || !cents || cents <= 0 || expBusy) return;
    setExpBusy(true); setExpErr(null);
    try {
      await DB.logExpense(group.id, expDesc.trim(), cents);
      await load(); onChanged && onChanged();
      setShowExpense(false); setExpDesc(""); setExpAmt("");
    } catch (e) { setExpErr(e.message); }
    finally { setExpBusy(false); }
  }

  async function openFriendPicker() {
    setShowFriendPicker(true); setInviteFriendErr(null);
    try {
      const fr = await DB.fetchMyFriends();
      setFriendList(fr.filter(f => f.status === "accepted"));
    } catch (e) { setInviteFriendErr(e.message); }
  }
  async function inviteFriend(friendId) {
    setInvitingId(friendId); setInviteFriendErr(null);
    try {
      await DB.inviteFriendToGroup(group.id, friendId);
      await load(); onChanged && onChanged();
      setFriendList(list => list.filter(f => f.other_id !== friendId));
    } catch (e) { setInviteFriendErr(e.message); }
    finally { setInvitingId(null); }
  }

  function openEdit() {
    setEdName(g.name); setEdCat(g.category);
    setEdGoal(String(g.goal_cents/100)); setEdMonthly(String(g.monthly_cents/100));
    setEdErr(null); setEditing(true);
  }
  async function saveMeta() {
    setEdBusy(true); setEdErr(null);
    try {
      await DB.editGroupMeta(group.id, edName.trim(), edCat);
      const memberCount = detail.members.filter(m=>!m.removed).length;
      // Only attempt terms update if solo-ish (server enforces < 3 too)
      if (memberCount < 3) {
        const goalC = Math.round(parseFloat(edGoal)*100);
        const monC = Math.round(parseFloat(edMonthly)*100);
        if (goalC && monC && (goalC !== g.goal_cents || monC !== g.monthly_cents)) {
          await DB.editGroupTerms(group.id, goalC, monC);
        }
      }
      await load(); onChanged && onChanged();
      setEditing(false);
    } catch (e) { setEdErr(e.message); }
    finally { setEdBusy(false); }
  }
  async function doClose() {
    setEdBusy(true); setEdErr(null);
    try { await DB.closeGroup(group.id); onChanged && onChanged(); onBack(); }
    catch (e) { setEdErr(e.message); setEdBusy(false); }
  }

  async function load() {
    try { setDetail(await DB.fetchGroupDetail(group.id)); }
    catch (e) { setErr(e.message); }
  }

  useEffect(() => {
    load();
    const unsub = DB.subscribeToGroup(group.id, load);
    return unsub;
  }, [group.id]);

  async function act(fn, id) {
    setErr(null); setBusyId(id);
    try { await fn(); await load(); onChanged && onChanged(); }
    catch (e) { setErr(e.message); }
    finally { setBusyId(null); }
  }

  const g = detail?.group;
  const isTreasurer = g && g.treasurer_id === myId;
  const cycleKey = detail ? [...new Set(detail.contributions.map(c=>c.cycle))].sort().reverse()[0] : null;
  const cycleRows = detail ? detail.contributions.filter(c => c.cycle === cycleKey) : [];
  const potCents = detail ? detail.contributions.filter(c=>c.status==="confirmed").reduce((a,c)=>a+c.amount_cents,0) : 0;
  const profileOf = (id) => detail?.members.find(m => m.member_id === id)?.profiles;
  const missingRows = detail ? detail.members.filter(m => !m.removed && !cycleRows.some(c => c.member_id === m.member_id)).length : 0;

  // Overview-tab derived values
  const myConfirmedCents = detail ? detail.contributions.filter(c=>c.member_id===myId && c.status==="confirmed").reduce((a,c)=>a+c.amount_cents,0) : 0;
  const openVotesCount = detail ? detail.votes.filter(v=>v.status==="open").length : 0;
  const nextDue = (() => { const n=new Date(); const d=new Date(n.getFullYear(), n.getMonth()+1, 1); const days=Math.ceil((d-n)/86400000); return { label:d.toLocaleDateString(undefined,{month:"short",day:"numeric"}), days }; })();
  const flaggedMembers = detail ? detail.members.filter(m=>!m.removed && m.misses>0) : [];
  // Category-tinted header gradient
  const catColor = (() => {
    const c = g?.category;
    if (c==="Travel") return ["#E8A04A","#7A4B1E"];
    if (c==="Events") return ["#8B7BF0","#3A2E6E"];
    if (c==="Gifts") return ["#E07AC0","#6E2E58"];
    if (c==="Housing") return ["#4AB0A0","#1E4A44"];
    return ["#3B8EF5","#1E3A5E"];
  })();

  const statusPill = (s) => ({
    unpaid:      { label:"Not paid", color:C.textMid, bg:C.surface2 },
    marked_sent: { label:"Sent · awaiting confirm", color:C.amber, bg:C.amberLt },
    confirmed:   { label:"Confirmed by both", color:C.green, bg:C.greenLt },
    disputed:    { label:"Disputed", color:C.red, bg:C.redLt },
    missed:      { label:"Missed", color:C.red, bg:C.redLt },
  }[s] || { label:s, color:C.textMid, bg:C.surface2 });

  return (
    <div style={{ minHeight:"100vh", background:C.bg, paddingBottom:40 }}>
      <style>{`${FONTS}*{box-sizing:border-box;margin:0;padding:0}button{cursor:pointer;font-family:'DM Sans',sans-serif}input{outline:none}`}</style>

      {/* Gradient cover header */}
      <div style={{ position:"relative", background:`linear-gradient(155deg, ${catColor[0]}, ${catColor[1]})`, padding:"52px 20px 70px", overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0, background:"radial-gradient(circle at 80% 20%, rgba(255,255,255,.18), transparent 60%)" }} />
        <button onClick={onBack} style={{ position:"relative", background:"rgba(0,0,0,.25)", border:"none", borderRadius:20, padding:"7px 14px 7px 10px", color:"#fff", fontSize:13, fontWeight:600, display:"flex", alignItems:"center", gap:6, marginBottom:18 }}>← Back</button>
        <div style={{ position:"relative", display:"flex", alignItems:"flex-start", gap:12 }}>
          <div style={{ fontSize:34, lineHeight:1 }}>{group.emoji}</div>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:28, fontWeight:800, color:"#fff", letterSpacing:-0.8, lineHeight:1.1, textShadow:"0 2px 12px rgba(0,0,0,.3)" }}>{group.name}</div>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:"rgba(255,255,255,.85)", marginTop:4 }}>Started {group.started} · {detail ? detail.members.filter(m=>!m.removed).length : "…"} member{detail && detail.members.filter(m=>!m.removed).length===1?"":"s"}</div>
          </div>
          {isTreasurer && (
            <button onClick={openEdit} title="Edit Sanduq" style={{ width:40, height:40, borderRadius:"50%", background:"rgba(0,0,0,.25)", border:"none", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0 }}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>
            </button>
          )}
        </div>
      </div>

      {/* Progress card overlapping the header */}
      {detail && (
        <div style={{ margin:"-52px 16px 0", position:"relative", background:C.surface, border:`1px solid ${C.border}`, borderRadius:18, padding:"18px 20px", boxShadow:"0 8px 30px rgba(0,0,0,.35)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:10 }}>
            <span style={{ fontFamily:"'DM Mono',monospace", fontSize:30, fontWeight:500, color:C.text, letterSpacing:-1 }}>${(potCents/100).toLocaleString()}</span>
            <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, color:C.textMid }}>of ${(g.goal_cents/100).toLocaleString()}</span>
          </div>
          <Bar pct={Math.min(1, potCents/g.goal_cents)} color={catColor[0]} h={7} />
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:8 }}>
            <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12.5, fontWeight:600, color:catColor[0] }}>{Math.round(100*potCents/g.goal_cents)}% funded</span>
            <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12.5, color:C.textMid }}>${((g.goal_cents-potCents)/100).toLocaleString()} to go</span>
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display:"flex", gap:4, padding:"18px 12px 0", overflowX:"auto", borderBottom:`1px solid ${C.border}` }}>
        {[["overview","Overview"],["payments","Payments"],["votes","Votes"],["members","Members"],["chat","Chat"]].map(([k,lbl]) => (
          <button key={k} onClick={()=>setTab(k)} style={{ position:"relative", padding:"10px 16px 14px", background:"none", border:"none", cursor:"pointer", whiteSpace:"nowrap", fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:tab===k?700:500, color:tab===k?C.blue:C.textMid }}>
            {lbl}
            {tab===k && <div style={{ position:"absolute", bottom:-1, left:12, right:12, height:2, borderRadius:2, background:C.blue }} />}
          </button>
        ))}
      </div>

      {editing && (() => {
        const memberCount = detail ? detail.members.filter(m=>!m.removed).length : 0;
        const canEditTerms = memberCount < 3;
        return (
        <div onClick={()=>!edBusy&&setEditing(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.6)", zIndex:100, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:C.surface, borderTopLeftRadius:24, borderTopRightRadius:24, padding:"22px 20px 32px", width:"100%", maxWidth:440, maxHeight:"88vh", overflowY:"auto", border:`1px solid ${C.border}` }}>
            <div style={{ width:38, height:4, borderRadius:2, background:C.border2, margin:"0 auto 18px" }} />
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:19, fontWeight:800, color:C.text, marginBottom:18 }}>Edit Sanduq</div>

            <label style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:600, color:C.textMid }}>Name</label>
            <input value={edName} onChange={e=>setEdName(e.target.value)} style={{ width:"100%", marginTop:6, marginBottom:14, background:C.surface2, border:`1px solid ${C.border}`, borderRadius:11, padding:"12px 14px", fontFamily:"'DM Sans',sans-serif", fontSize:15, color:C.text }} />

            <label style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:600, color:C.textMid }}>Category</label>
            <div style={{ display:"flex", gap:7, flexWrap:"wrap", marginTop:6, marginBottom:16 }}>
              {["Travel","Events","Gifts","Housing","Other"].map(c => (
                <button key={c} onClick={()=>setEdCat(c)} style={{ padding:"8px 14px", borderRadius:18, background:edCat===c?C.blue:C.surface2, border:`1px solid ${edCat===c?C.blue:C.border}`, fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:600, color:edCat===c?"#fff":C.textMid, cursor:"pointer" }}>{c}</button>
              ))}
            </div>

            <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:16, marginBottom:4 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                <label style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:600, color:C.textMid }}>Financial terms</label>
                {!canEditTerms && <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, color:C.amber }}>Needs a vote ({memberCount} members)</span>}
              </div>
              {canEditTerms ? (
                <div style={{ display:"flex", gap:10 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, color:C.textDim, marginBottom:4 }}>Goal ($)</div>
                    <input value={edGoal} onChange={e=>setEdGoal(e.target.value)} inputMode="decimal" style={{ width:"100%", background:C.surface2, border:`1px solid ${C.border}`, borderRadius:11, padding:"12px 14px", fontFamily:"'DM Mono',monospace", fontSize:15, color:C.text }} />
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, color:C.textDim, marginBottom:4 }}>Monthly ($)</div>
                    <input value={edMonthly} onChange={e=>setEdMonthly(e.target.value)} inputMode="decimal" style={{ width:"100%", background:C.surface2, border:`1px solid ${C.border}`, borderRadius:11, padding:"12px 14px", fontFamily:"'DM Mono',monospace", fontSize:15, color:C.text }} />
                  </div>
                </div>
              ) : (
                <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12.5, color:C.textMid, lineHeight:1.5, background:C.surface2, borderRadius:11, padding:"12px 14px" }}>
                  Goal ${(g.goal_cents/100).toLocaleString()} · ${(g.monthly_cents/100).toLocaleString()}/mo. With 3+ members, changing these affects everyone's obligations, so it goes through a group vote in the Votes tab.
                </div>
              )}
            </div>

            {edErr && <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12.5, color:C.red, marginTop:12 }}>{edErr}</div>}

            <button onClick={saveMeta} disabled={edBusy||!edName.trim()} style={{ width:"100%", marginTop:18, padding:14, borderRadius:13, background:C.blue, border:"none", fontFamily:"'DM Sans',sans-serif", fontSize:15, fontWeight:700, color:"#fff", cursor:"pointer", opacity:(edBusy||!edName.trim())?0.5:1 }}>{edBusy?"Saving…":"Save changes"}</button>

            <div style={{ borderTop:`1px solid ${C.border}`, marginTop:22, paddingTop:18 }}>
              {!confirmClose ? (
                <button onClick={()=>setConfirmClose(true)} style={{ width:"100%", padding:13, borderRadius:13, background:"none", border:`1px solid ${C.red}55`, fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:600, color:C.red, cursor:"pointer" }}>Close this Sanduq</button>
              ) : (
                <div style={{ background:C.redLt, border:`1px solid ${C.red}44`, borderRadius:13, padding:16 }}>
                  <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:C.text, lineHeight:1.5, marginBottom:12 }}>
                    Closing archives this Sanduq. Members can no longer pay or vote, but every record and the full history is preserved — nothing is deleted. This can't be undone from here.
                  </div>
                  <div style={{ display:"flex", gap:10 }}>
                    <button onClick={()=>setConfirmClose(false)} disabled={edBusy} style={{ flex:1, padding:12, borderRadius:11, background:C.surface2, border:`1px solid ${C.border}`, fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:600, color:C.textMid, cursor:"pointer" }}>Keep it</button>
                    <button onClick={doClose} disabled={edBusy} style={{ flex:1, padding:12, borderRadius:11, background:C.red, border:"none", fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:700, color:"#fff", cursor:"pointer" }}>{edBusy?"Closing…":"Close Sanduq"}</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        );
      })()}

      <div style={{ padding:16 }}>
        {err && (
          <div style={{ background:C.redLt, border:`1px solid ${C.red}44`, borderRadius:12, padding:"12px 14px", marginBottom:12, fontFamily:"'DM Sans',sans-serif", fontSize:13, color:C.red }}>{err}</div>
        )}

        {!detail ? (
          <div>
            <SanduqCardSkeleton />
            <SanduqCardSkeleton />
          </div>
        ) : <>

        {/* ===== OVERVIEW TAB ===== */}
        {tab==="overview" && (<>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
            <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:"16px 18px" }}>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, fontWeight:600, color:C.textDim, letterSpacing:1, textTransform:"uppercase" }}>Monthly Due</div>
              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:26, fontWeight:500, color:C.text, marginTop:8, letterSpacing:-0.5 }}>${(g.monthly_cents/100).toLocaleString()}</div>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12.5, color:C.textMid, marginTop:4 }}>per member</div>
            </div>
            <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:"16px 18px" }}>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, fontWeight:600, color:C.textDim, letterSpacing:1, textTransform:"uppercase" }}>Next Payment</div>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:24, fontWeight:800, color:C.text, marginTop:8, letterSpacing:-0.5 }}>{nextDue.label}</div>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12.5, color:C.textMid, marginTop:4 }}>{nextDue.days} day{nextDue.days===1?"":"s"} away</div>
            </div>
            <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:"16px 18px" }}>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, fontWeight:600, color:C.textDim, letterSpacing:1, textTransform:"uppercase" }}>Active Votes</div>
              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:26, fontWeight:500, color:openVotesCount>0?C.purpleBright:C.text, marginTop:8 }}>{openVotesCount}</div>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12.5, color:C.textMid, marginTop:4 }}>{openVotesCount>0?"need attention":"none open"}</div>
            </div>
            <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:"16px 18px" }}>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, fontWeight:600, color:C.textDim, letterSpacing:1, textTransform:"uppercase" }}>Your Total</div>
              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:26, fontWeight:500, color:C.text, marginTop:8, letterSpacing:-0.5 }}>${(myConfirmedCents/100).toLocaleString()}</div>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12.5, color:C.textMid, marginTop:4 }}>contributed</div>
            </div>
          </div>

          {flaggedMembers.map(m => (
            <div key={m.member_id} style={{ display:"flex", gap:12, alignItems:"center", background:C.amberLt, border:`1px solid ${C.amber}44`, borderRadius:14, padding:"14px 16px", marginBottom:12 }}>
              <div style={{ width:30, height:30, borderRadius:"50%", background:C.amber, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:16, fontWeight:800, color:"#070B14" }}>!</div>
              <div>
                <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:700, color:C.text }}>{(m.profiles?.display_name)||"A member"} has missed {m.misses} payment{m.misses>1?"s":""}</div>
                <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12.5, color:C.textMid, marginTop:2 }}>{m.misses>=2?"One more miss triggers auto-removal with a pro-rata refund":"Catch-up owed before the next cycle"}</div>
              </div>
            </div>
          ))}

          <SurfaceCard>
            <Eyebrow>Group Rules</Eyebrow>
            <div style={{ marginTop:10 }}>
              {[
                g.exit_policy==="vote" ? "Group votes on exit refunds (set by creator)" : "Exit refunds follow the set policy",
                g.join_policy==="catchup" ? "Late joiners catch up on missed months (set by creator)" : "New members pay from their join date",
                "3 missed payments = auto-removal + pro-rata refund",
                "Changes to terms require a simple majority vote",
              ].map((r,i,arr) => (
                <div key={i}>
                  <div style={{ display:"flex", gap:10, padding:"11px 0" }}>
                    <div style={{ width:6, height:6, borderRadius:"50%", background:catColor[0], marginTop:7, flexShrink:0 }} />
                    <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, color:C.textMid, lineHeight:1.5 }}>{r}</div>
                  </div>
                  {i<arr.length-1 && <Divider />}
                </div>
              ))}
            </div>
          </SurfaceCard>
        </>)}

        {/* ===== PAYMENTS TAB: current cycle ===== */}
        {tab==="payments" && (<>
        {/* Current cycle — the two-key handshake, live */}
        <SurfaceCard>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
            <Eyebrow>{cycleKey ? new Date(cycleKey+"T00:00:00").toLocaleDateString(undefined,{month:"long",year:"numeric"}) : "Current cycle"}</Eyebrow>
            {isTreasurer && <Pill label="You're treasurer" color={C.blue} bg={C.blueLt} />}
          </div>
          {cycleRows.length === 0 && (
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:C.textMid, padding:"10px 0" }}>No contribution rows yet for this cycle.</div>
          )}
          {cycleRows.map((row, i) => {
            const p = profileOf(row.member_id);
            const mineRow = row.member_id === myId;
            const s = statusPill(row.status);
            const busy = busyId === row.id;
            return (
              <div key={row.id}>
                <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 0" }}>
                  <div style={{ width:36, height:36, borderRadius:"50%", background:p?.avatar_color || C.blue, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:700, color:"#070B14", flexShrink:0 }}>
                    {(p?.display_name || "?").split(/\s+/).map(w=>w[0]).slice(0,2).join("").toUpperCase()}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:600, color:C.text }}>{p?.display_name || "Member"}{mineRow ? " · you" : ""}{row.member_id === g.treasurer_id ? "  💼" : ""}</div>
                    <Pill label={s.label} color={s.color} bg={s.bg} />
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:6, alignItems:"flex-end", flexShrink:0 }}>
                    <div style={{ fontFamily:"'DM Mono',monospace", fontSize:13, color:C.textMid }}>${(row.amount_cents/100).toLocaleString()}</div>
                    {mineRow && (row.status === "unpaid" || row.status === "missed") && (
                      <button disabled={busy} onClick={()=>act(()=>DB.rpc.markSent(row.id), row.id)} style={{ padding:"8px 13px", borderRadius:9, background:C.green, border:"none", fontSize:12, fontWeight:700, color:"#070B14", minHeight:34, opacity:busy?0.6:1 }}>{busy?"…":"I've sent it"}</button>
                    )}
                    {mineRow && row.status === "disputed" && (
                      <div style={{ display:"flex", gap:6 }}>
                        <button disabled={busy} onClick={()=>act(()=>DB.rpc.markSent(row.id), row.id)} style={{ padding:"7px 11px", borderRadius:9, background:C.amber, border:"none", fontSize:11.5, fontWeight:700, color:"#070B14" }}>Re-flag sent</button>
                        <button disabled={busy} onClick={()=>act(()=>DB.rpc.resetUnpaid(row.id), row.id)} style={{ padding:"7px 11px", borderRadius:9, background:"none", border:`1px solid ${C.border2}`, fontSize:11.5, fontWeight:600, color:C.textMid }}>I'll resend</button>
                      </div>
                    )}
                    {isTreasurer && !mineRow && row.status === "marked_sent" && (
                      <div style={{ display:"flex", gap:6 }}>
                        <button disabled={busy} onClick={()=>act(()=>DB.rpc.confirmReceipt(row.id), row.id)} style={{ padding:"8px 13px", borderRadius:9, background:C.green, border:"none", fontSize:12, fontWeight:700, color:"#070B14", minHeight:34 }}>{busy?"…":"Confirm"}</button>
                        <button disabled={busy} onClick={()=>act(()=>DB.rpc.dispute(row.id), row.id)} style={{ padding:"7px 11px", borderRadius:9, background:"none", border:`1px solid ${C.red}55`, fontSize:11.5, fontWeight:600, color:C.red }}>Not received</button>
                      </div>
                    )}
                    {isTreasurer && !mineRow && row.status === "disputed" && (
                      <div style={{ display:"flex", gap:6 }}>
                        <button disabled={busy} onClick={()=>act(()=>DB.rpc.confirmReceipt(row.id), row.id)} style={{ padding:"7px 11px", borderRadius:9, background:C.green, border:"none", fontSize:11.5, fontWeight:700, color:"#070B14" }}>It arrived</button>
                        <button disabled={busy} onClick={()=>act(()=>DB.rpc.resetUnpaid(row.id), row.id)} style={{ padding:"7px 11px", borderRadius:9, background:"none", border:`1px solid ${C.border2}`, fontSize:11.5, fontWeight:600, color:C.textMid }}>Mark unpaid</button>
                      </div>
                    )}
                  </div>
                </div>
                {i < cycleRows.length-1 && <Divider />}
              </div>
            );
          })}
          {isTreasurer && missingRows > 0 && (
            <button onClick={()=>act(()=>DB.openCycle(group.id), "cycle")} style={{ width:"100%", marginTop:10, padding:12, borderRadius:12, background:C.surface2, border:`1px solid ${C.border2}`, fontSize:13, fontWeight:600, color:C.text }}>Open this month's cycle for {missingRows} member{missingRows>1?"s":""}</button>
          )}
        </SurfaceCard>
        </>)}

        {/* ===== MEMBERS TAB ===== */}
        {tab==="members" && (
        <SurfaceCard>
          <Eyebrow>Members · {detail.members.filter(m=>!m.removed).length}</Eyebrow>
          <div style={{ marginTop:8 }}>
            {detail.members.filter(m=>!m.removed).map((m, i, arr) => {
              const prof = m.profiles || {};
              const isMe = m.member_id === myId;
              const isTreas = m.member_id === g.treasurer_id;
              return (
                <div key={m.member_id}>
                  <div style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0" }}>
                    <div style={{ width:38, height:38, borderRadius:"50%", background:prof.avatar_color||C.blue, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:700, color:"#070B14" }}>{(prof.display_name||"?").slice(0,2).toUpperCase()}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:600, color:C.text }}>{prof.display_name||"Member"}{isMe?" (you)":""}</div>
                      {m.catchup_owed_cents > 0 && <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.amber, marginTop:1 }}>Catch-up owed: ${(m.catchup_owed_cents/100).toLocaleString()}</div>}
                    </div>
                    {isTreas && <Pill label="Treasurer" color={C.blue} bg={C.blueLt} />}
                    {m.misses > 0 && <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, color:C.red }}>{m.misses} miss{m.misses>1?"es":""}</span>}
                  </div>
                  {i<arr.length-1 && <Divider />}
                </div>
              );
            })}
          </div>
        </SurfaceCard>
        )}

        {/* ===== PAYMENTS TAB: expenses ===== */}
        {tab==="payments" && (<>
        {/* Expenses */}
        <SurfaceCard>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <Eyebrow>Expenses</Eyebrow>
            {isTreasurer && !showExpense && <button onClick={()=>setShowExpense(true)} style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:600, color:C.blue, background:"none", border:"none", cursor:"pointer" }}>+ Log expense</button>}
          </div>

          {showExpense && (
            <div style={{ marginTop:10, marginBottom:8, padding:14, background:C.surface2, borderRadius:12, border:`1px solid ${C.border}` }}>
              <input value={expDesc} onChange={e=>setExpDesc(e.target.value)} placeholder="What was it for?" style={{ width:"100%", marginBottom:8, background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"11px 13px", fontFamily:"'DM Sans',sans-serif", fontSize:14, color:C.text }} />
              <div style={{ display:"flex", gap:8 }}>
                <input value={expAmt} onChange={e=>setExpAmt(e.target.value)} inputMode="decimal" placeholder="Amount $" style={{ flex:1, background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"11px 13px", fontFamily:"'DM Mono',monospace", fontSize:14, color:C.text }} />
                <button onClick={logExpense} disabled={!expDesc.trim()||!expAmt||expBusy} style={{ padding:"0 16px", borderRadius:10, background:C.blue, border:"none", fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:700, color:"#fff", cursor:"pointer", opacity:(!expDesc.trim()||!expAmt||expBusy)?0.5:1 }}>{expBusy?"…":"Log"}</button>
              </div>
              {expErr && <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.red, marginTop:8 }}>{expErr}</div>}
              <button onClick={()=>{ setShowExpense(false); setExpDesc(""); setExpAmt(""); setExpErr(null); }} style={{ marginTop:8, fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.textMid, background:"none", border:"none", cursor:"pointer" }}>Cancel</button>
            </div>
          )}

          {detail.expenses.length === 0 ? (
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:C.textDim, padding:"10px 0", textAlign:"center" }}>No expenses logged yet.</div>
          ) : (
            <div style={{ marginTop:8 }}>
              {detail.expenses.map((ex, i, arr) => (
                <div key={ex.id}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0" }}>
                    <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, color:C.text }}>{ex.description}</div>
                    <div style={{ fontFamily:"'DM Mono',monospace", fontSize:14, fontWeight:500, color:C.text }}>${(ex.amount_cents/100).toLocaleString()}</div>
                  </div>
                  {i<arr.length-1 && <Divider />}
                </div>
              ))}
            </div>
          )}
        </SurfaceCard>
        </>)}

        {/* ===== VOTES TAB ===== */}
        {tab==="votes" && (
        <SurfaceCard>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <Eyebrow>Votes</Eyebrow>
            {!showPropose && <button onClick={()=>setShowPropose(true)} style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:600, color:C.blue, background:"none", border:"none", cursor:"pointer" }}>+ Propose</button>}
          </div>

          {showPropose && (
            <div style={{ marginTop:10, marginBottom:10, padding:14, background:C.surface2, borderRadius:12, border:`1px solid ${C.border}` }}>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.textMid, marginBottom:8 }}>Propose a change. It passes when a majority of members vote yes.</div>
              <div style={{ display:"flex", gap:7, marginBottom:10 }}>
                {[["monthly","Monthly amount"],["goal","Goal"]].map(([k,lbl]) => (
                  <button key={k} onClick={()=>setVoteKind(k)} style={{ flex:1, padding:"9px 0", borderRadius:9, background:voteKind===k?C.blue:C.surface, border:`1px solid ${voteKind===k?C.blue:C.border}`, fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:600, color:voteKind===k?"#fff":C.textMid, cursor:"pointer" }}>{lbl}</button>
                ))}
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <input value={voteVal} onChange={e=>setVoteVal(e.target.value)} inputMode="decimal" placeholder={voteKind==="monthly"?`New monthly $ (now $${(g.monthly_cents/100).toLocaleString()})`:`New goal $ (now $${(g.goal_cents/100).toLocaleString()})`} style={{ flex:1, background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"11px 13px", fontFamily:"'DM Mono',monospace", fontSize:14, color:C.text }} />
                <button onClick={propose} disabled={!voteVal||voteBusy} style={{ padding:"0 16px", borderRadius:10, background:C.blue, border:"none", fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:700, color:"#fff", cursor:"pointer", opacity:(!voteVal||voteBusy)?0.5:1 }}>{voteBusy?"…":"Propose"}</button>
              </div>
              {voteErr && <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.red, marginTop:8 }}>{voteErr}</div>}
              <button onClick={()=>{ setShowPropose(false); setVoteVal(""); setVoteErr(null); }} style={{ marginTop:8, fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.textMid, background:"none", border:"none", cursor:"pointer" }}>Cancel</button>
            </div>
          )}

          {detail.votes.length === 0 && !showPropose ? (
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:C.textDim, padding:"10px 0", textAlign:"center" }}>No votes yet. Propose a change to the monthly amount or goal.</div>
          ) : (
            <div style={{ marginTop:8 }}>
              {detail.votes.map((v, i, arr) => {
                const ballots = v.ballots || [];
                const yes = ballots.filter(b=>b.choice==="yes").length;
                const no = ballots.filter(b=>b.choice==="no").length;
                const needed = Math.floor(detail.members.filter(m=>!m.removed).length/2)+1;
                const iVoted = ballots.some(b=>b.member_id===myId);
                const open = v.status==="open";
                return (
                  <div key={v.id}>
                    <div style={{ padding:"12px 0" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10 }}>
                        <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:600, color:C.text }}>{v.title}</div>
                        <Pill label={v.status==="executed"?"Passed":v.status==="open"?"Open":v.status==="failed"?"Failed":v.status} color={v.status==="executed"?C.green:v.status==="open"?C.blue:C.textMid} bg={v.status==="executed"?C.greenLt:v.status==="open"?C.blueLt:C.surface2} />
                      </div>
                      <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.textMid, marginTop:4 }}>{yes} yes · {no} no · {needed} needed to pass</div>
                      {open && !iVoted && (
                        <div style={{ display:"flex", gap:8, marginTop:10 }}>
                          <button onClick={()=>castBallot(v.id,"yes")} disabled={ballotBusy===v.id} style={{ flex:1, padding:10, borderRadius:10, background:C.green, border:"none", fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:700, color:"#070B14", cursor:"pointer" }}>Yes</button>
                          <button onClick={()=>castBallot(v.id,"no")} disabled={ballotBusy===v.id} style={{ flex:1, padding:10, borderRadius:10, background:C.surface2, border:`1px solid ${C.border}`, fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:600, color:C.text, cursor:"pointer" }}>No</button>
                          <button onClick={()=>castBallot(v.id,"abstain")} disabled={ballotBusy===v.id} style={{ padding:"10px 14px", borderRadius:10, background:C.surface2, border:`1px solid ${C.border}`, fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:600, color:C.textMid, cursor:"pointer" }}>Abstain</button>
                        </div>
                      )}
                      {open && iVoted && <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.green, marginTop:8 }}>✓ You voted</div>}
                    </div>
                    {i<arr.length-1 && <Divider />}
                  </div>
                );
              })}
            </div>
          )}
        </SurfaceCard>
        )}

        {/* ===== PAYMENTS TAB: invite + audit ===== */}
        {tab==="payments" && (<>
        {/* Invite link */}
        <SurfaceCard>
          <Eyebrow>Invite</Eyebrow>
          <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:C.textMid, lineHeight:1.5, marginBottom:10 }}>
            {g.join_policy === "closed"
              ? "This group is locked, so new members can't join."
              : "Share this link. Tapping it shows them the group and walks them through creating an account, then drops them right in."}
          </div>
          {g.join_policy !== "closed" && (() => {
            const link = `${window.location.origin}/?join=${group.id}`;
            return (
              <>
                <div style={{ display:"flex", gap:8, alignItems:"center", background:C.surface2, border:`1px solid ${C.border}`, borderRadius:12, padding:"11px 13px", marginBottom:8 }}>
                  <span style={{ flex:1, fontFamily:"'DM Mono',monospace", fontSize:11.5, color:C.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{link}</span>
                  <button onClick={()=>{ navigator.clipboard?.writeText(link); setCopied(true); setTimeout(()=>setCopied(false),1500); }} style={{ padding:"6px 12px", borderRadius:8, background:copied?C.greenLt:C.surface, border:`1px solid ${copied?C.green:C.border}`, fontSize:12, fontWeight:700, color:copied?C.green:C.textMid }}>{copied?"Copied ✓":"Copy"}</button>
                </div>
                <button onClick={async ()=>{
                  const text = `Join my Sanduq "${g.name}" so we can save together: ${link}`;
                  if (navigator.share) { try { await navigator.share({ title:`Join ${g.name} on Sanduq`, text, url:link }); } catch {} }
                  else { navigator.clipboard?.writeText(link); setCopied(true); setTimeout(()=>setCopied(false),1500); }
                }} style={{ width:"100%", padding:12, borderRadius:12, background:group.bar, border:"none", fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:700, color:"#070B14", cursor:"pointer" }}>Share invite</button>

                {isTreasurer && (
                  <div style={{ marginTop:14, paddingTop:14, borderTop:`1px solid ${C.border}` }}>
                    {!showFriendPicker ? (
                      <button onClick={openFriendPicker} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, width:"100%", padding:12, borderRadius:12, background:C.surface2, border:`1px solid ${C.border2}`, fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:600, color:C.text, cursor:"pointer" }}>
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/></svg>
                        Add a friend directly
                      </button>
                    ) : (
                      <div>
                        <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.textMid, marginBottom:8 }}>Tap a friend to add them to this Sanduq.</div>
                        {friendList.length === 0 ? (
                          <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:C.textDim, textAlign:"center", padding:"10px 0" }}>No friends to add yet. Connect with friends on your Profile first.</div>
                        ) : (
                          friendList.map(f => (
                            <div key={f.other_id} style={{ display:"flex", alignItems:"center", gap:12, padding:"8px 0" }}>
                              <div style={{ width:36, height:36, borderRadius:"50%", background:f.avatar_color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:"#070B14" }}>{(f.display_name||"?").slice(0,2).toUpperCase()}</div>
                              <div style={{ flex:1, fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:600, color:C.text }}>{f.display_name}</div>
                              <button onClick={()=>inviteFriend(f.other_id)} disabled={invitingId===f.other_id} style={{ padding:"7px 14px", borderRadius:9, background:C.blue, border:"none", fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:700, color:"#fff", cursor:"pointer", opacity:invitingId===f.other_id?0.5:1 }}>{invitingId===f.other_id?"Adding…":"Add"}</button>
                            </div>
                          ))
                        )}
                        {inviteFriendErr && <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.red, marginTop:6 }}>{inviteFriendErr}</div>}
                        <button onClick={()=>setShowFriendPicker(false)} style={{ marginTop:8, fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.textMid, background:"none", border:"none", cursor:"pointer" }}>Done</button>
                      </div>
                    )}
                  </div>
                )}
              </>
            );
          })()}
        </SurfaceCard>

        {/* Audit trail */}
        <SurfaceCard>
          <Eyebrow>Audit trail · append-only</Eyebrow>
          {detail.audit.length === 0 && <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:C.textMid, padding:"8px 0" }}>Events will appear here as money moves.</div>}
          {detail.audit.slice(0,10).map((a,i) => (
            <div key={a.id}>
              <div style={{ display:"flex", justifyContent:"space-between", gap:10, padding:"9px 0" }}>
                <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11.5, color:C.textMid }}>{a.action} · {a.table_name}</span>
                <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11.5, color:C.textDim, flexShrink:0 }}>{new Date(a.at).toLocaleTimeString(undefined,{hour:"numeric",minute:"2-digit"})}</span>
              </div>
              {i < Math.min(9, detail.audit.length-1) && <Divider />}
            </div>
          ))}
        </SurfaceCard>
        </>)}

        {/* ===== CHAT TAB (placeholder) ===== */}
        {tab==="chat" && (
          <div style={{ textAlign:"center", padding:"50px 20px" }}>
            <div style={{ fontSize:40, marginBottom:14 }}>💬</div>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:17, fontWeight:700, color:C.text, marginBottom:6 }}>Group chat is coming soon</div>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13.5, color:C.textMid, lineHeight:1.5, maxWidth:280, margin:"0 auto" }}>Soon you'll be able to coordinate payments and plans with your group right here.</div>
          </div>
        )}
        </>}
      </div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [booting, setBooting] = useState(LIVE);
  const [loading, setLoading] = useState(false);
  const [screen, setScreen] = useState("home");
  const [activeGroup, setActiveGroup] = useState(null);
  const [activeLiveGroup, setActiveLiveGroup] = useState(null);
  const [myId, setMyId] = useState(null);
  const [me, setMe] = useState(ME); // real signed-in identity {name, initials, color}
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameErr, setNameErr] = useState(null);
  // Payment handles
  const [handles, setHandles] = useState([]);
  const [handleApp, setHandleApp] = useState("Venmo");
  const [handleVal, setHandleVal] = useState("");
  const [handleBusy, setHandleBusy] = useState(false);
  const [handleErr, setHandleErr] = useState(null);
  const [addingHandle, setAddingHandle] = useState(false);
  // Friends
  const [friends, setFriends] = useState([]);
  const [myCode, setMyCode] = useState(null);
  const [friendCodeInput, setFriendCodeInput] = useState("");
  const [friendBusy, setFriendBusy] = useState(false);
  const [friendErr, setFriendErr] = useState(null);
  const [friendMsg, setFriendMsg] = useState(null);
  const [codeCopied, setCodeCopied] = useState(false);
  // Calendar
  const [calEvents, setCalEvents] = useState([]);
  const [calTab, setCalTab] = useState("upcoming");
  const [calLoading, setCalLoading] = useState(false);
  // Notifications
  const [notifsOpen, setNotifsOpen] = useState(false);
  const [notifList, setNotifList] = useState([]);
  const [notifUnread, setNotifUnread] = useState(0);

  async function loadNotifications() {
    if (!LIVE) return;
    try {
      const list = await DB.fetchNotifications();
      setNotifList(list);
      setNotifUnread(list.filter(n => n.unread).length);
    } catch (e) { console.error(e); }
  }
  async function openNotifications() {
    setNotifsOpen(true);
    await loadNotifications();
    try { await DB.markNotificationsSeen(); setNotifUnread(0); } catch {}
  }

  async function loadCalendar() {
    if (!LIVE) return;
    setCalLoading(true);
    try { const ev = await DB.fetchCalendar(); setCalEvents(ev); }
    catch (e) { console.error(e); }
    finally { setCalLoading(false); }
  }

  async function loadFriends() {
    if (!LIVE) return;
    try {
      const [fr, code] = await Promise.all([DB.fetchMyFriends(), DB.fetchMyFriendCode()]);
      setFriends(fr); setMyCode(code);
    } catch (e) { console.error(e); }
  }
  async function addFriend() {
    const c = friendCodeInput.trim();
    if (!c || friendBusy) return;
    setFriendBusy(true); setFriendErr(null); setFriendMsg(null);
    try {
      await DB.sendFriendRequest(c);
      setFriendCodeInput("");
      setFriendMsg("Request sent!");
      await loadFriends();
    } catch (e) { setFriendErr(e.message); }
    finally { setFriendBusy(false); }
  }
  async function respondToFriend(fid, accept) {
    setFriendBusy(true); setFriendErr(null);
    try { await DB.respondFriend(fid, accept); await loadFriends(); }
    catch (e) { setFriendErr(e.message); }
    finally { setFriendBusy(false); }
  }

  async function saveHandles(next) {
    setHandleBusy(true); setHandleErr(null);
    try {
      if (LIVE) await DB.updatePaymentHandles(next);
      setHandles(next);
      setAddingHandle(false); setHandleVal("");
    } catch (e) { setHandleErr(e.message); }
    finally { setHandleBusy(false); }
  }
  function addHandle() {
    const v = handleVal.trim();
    if (!v) return;
    const next = [...handles.filter(h => h.app !== handleApp), { app: handleApp, handle: v }];
    saveHandles(next);
  }
  function removeHandle(app) {
    saveHandles(handles.filter(h => h.app !== app));
  }

  async function saveName() {
    const n = nameDraft.trim();
    if (!n || savingName) return;
    setSavingName(true); setNameErr(null);
    try {
      if (LIVE) await DB.updateDisplayName(n);
      setMe(makeIdentity(n, me.color));
      setEditingName(false);
    } catch (e) {
      setNameErr(e.message);
    } finally {
      setSavingName(false);
    }
  }
  const [sanduqs, setSanduqs] = useState(LIVE ? [] : SANDUQS);
  const [joinCode, setJoinCode] = useState("");
  const [joinErr, setJoinErr] = useState(null);
  const [joinBusy, setJoinBusy] = useState(false);
  // Invite-link flow: a ?join=GROUP_ID in the URL
  const [pendingInvite, setPendingInvite] = useState(null); // {id, name, ...} or null
  const [inviteJoining, setInviteJoining] = useState(false);

  function makeIdentity(name, color) {
    const initials = (name || "?").trim().split(/\s+/).map(w=>w[0]).slice(0,2).join("").toUpperCase();
    return { id: 1, name: name || "Member", initials, color: color || "#3B8EF5" };
  }

  async function loadLive() {
    const [rows, contribs, uid, profile] = await Promise.all([
      DB.fetchMyGroups(), DB.fetchContribRows(), DB.currentUserId(), DB.fetchMyProfile(),
    ]);
    setMyId(uid);
    if (profile) { setMe(makeIdentity(profile.display_name, profile.avatar_color)); setHandles(profile.payment_handles || []); }
    try { const fr = await DB.fetchMyFriends(); setFriends(fr); } catch {}
    try { const nl = await DB.fetchNotifications(); setNotifList(nl); setNotifUnread(nl.filter(n=>n.unread).length); } catch {}
    setSanduqs(rows.map((r, i) => mapLiveGroup(r, contribs, uid, i)));
  }

  // Read an invite id from the URL (?join=GROUP_ID), survive sign-in.
  function readInviteId() {
    try { return new URLSearchParams(window.location.search).get("join"); }
    catch { return null; }
  }
  function clearInviteFromUrl() {
    try { window.history.replaceState({}, "", window.location.pathname); } catch {}
  }

  async function acceptInvite(groupId) {
    setInviteJoining(true); setJoinErr(null);
    try {
      await DB.joinGroup(groupId);
      await loadLive();
      setPendingInvite(null);
      clearInviteFromUrl();
    } catch (e) {
      setJoinErr(e.message);
    } finally {
      setInviteJoining(false);
    }
  }

  useEffect(() => {
    if (!LIVE) return;
    (async () => {
      const inviteId = readInviteId();
      try {
        const session = await DB.currentSession();
        if (session) {
          await loadLive();
          setAuthed(true);
          // Already signed in and arriving on an invite link → join right away.
          if (inviteId) await acceptInvite(inviteId);
        } else if (inviteId) {
          // Not signed in yet — fetch the group name to show on the welcome screen,
          // and remember it so we can auto-join after sign-up.
          const info = await DB.fetchInviteInfo(inviteId);
          if (info) setPendingInvite(info);
        }
      } catch (e) { console.error(e); }
      finally { setBooting(false); }
    })();
  }, []);

  useEffect(() => { if (screen === "profile" && LIVE) loadFriends(); }, [screen]);
  useEffect(() => { if (screen === "calendar" && LIVE) loadCalendar(); }, [screen]);
  useEffect(() => {
    if (screen === "notifications" && LIVE) {
      (async () => { await loadNotifications(); try { await DB.markNotificationsSeen(); setNotifUnread(0); } catch {} })();
    }
  }, [screen]);

  async function handleJoin() {
    let code = joinCode.trim();
    // Accept a full invite link or a bare id
    const m = code.match(/[?&]join=([0-9a-fA-F-]{36})/);
    if (m) code = m[1];
    if (!code || joinBusy) return;
    setJoinErr(null); setJoinBusy(true);
    try { await DB.joinGroup(code); setJoinCode(""); await loadLive(); }
    catch (e) { setJoinErr(e.message); }
    finally { setJoinBusy(false); }
  }

  const markCompleted = (id) => setSanduqs(ss => ss.map(s => s.id===id ? { ...s, status:"completed", openVotes:0 } : s));
  const [activeDM, setActiveDM] = useState(null);
  const [dmThreads, setDmThreads] = useState(DM_THREADS);
  const [dmDraft, setDmDraft] = useState("");
  const [notifs, setNotifs] = useState(ACTIVITY_FEED);
  const [cat, setCat] = useState("All");
  const [channel, setChannel] = useState("sms");
  const [phone, setPhone] = useState("+1 (555) 012-3456");
  const [email, setEmail] = useState("jordan@email.com");
  const [toggles, setToggles] = useState(Object.fromEntries(NOTIF_SETTINGS.map(n=>[n.id,n.default])));

  const unread = notifs.filter(n => !n.read).length;
  const totalSaved = sanduqs.reduce((a,g) => a+g.pot, 0);
  const totalGoal  = sanduqs.reduce((a,g) => a+g.goal, 0);
  const overallPct = totalGoal > 0 ? totalSaved / totalGoal : 0;
  const shown = cat==="All" ? sanduqs : sanduqs.filter(g=>g.cat===cat);

  const NC = { payment:{color:C.green,bg:C.greenLt}, vote:{color:C.purple,bg:C.purpleLt}, warning:{color:C.amber,bg:C.amberLt}, reminder:{color:C.cyan,bg:C.cyanLt}, member:{color:C.blue,bg:C.blueLt} };

  if (booting) return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <style>{`${FONTS}*{box-sizing:border-box;margin:0;padding:0}`}</style>
      <Logo size={56} />
    </div>
  );

  if (!authed) return (
    <div>
      <style>{`${FONTS}*{box-sizing:border-box;margin:0;padding:0}button{cursor:pointer;font-family:'DM Sans',sans-serif}input{outline:none}`}</style>
      <Onboarding invite={pendingInvite} onDone={async (profile)=>{
        if (profile && profile.name) setMe(makeIdentity(profile.name, profile.color));
        setLoading(true); setAuthed(true);
        if (LIVE) {
          try { await loadLive(); } catch (e) { console.error(e); }
          setLoading(false);
          // Auto-join the group they were invited to.
          if (pendingInvite) { try { await acceptInvite(pendingInvite.id); } catch (e) { console.error(e); } }
        }
        else setTimeout(()=>setLoading(false),1100);
      }} />
    </div>
  );

  if (activeLiveGroup) return (
    <div>
      <style>{`${FONTS}*{box-sizing:border-box;margin:0;padding:0}button{cursor:pointer;font-family:'DM Sans',sans-serif}input{outline:none}@keyframes shimmer{0%{background-position:100% 0}100%{background-position:0 0}}`}</style>
      <LiveGroupScreen group={activeLiveGroup} myId={myId} onBack={()=>setActiveLiveGroup(null)} onChanged={loadLive} />
    </div>
  );

  if (activeGroup) return (
    <div>
      <style>{`${FONTS}*{box-sizing:border-box;margin:0;padding:0}button{cursor:pointer;font-family:'DM Sans',sans-serif}input{outline:none}@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}@keyframes spin{to{transform:rotate(360deg)}}@keyframes pop{0%{transform:scale(0)}60%{transform:scale(1.2)}100%{transform:scale(1)}}@keyframes confettiFall{0%{transform:translateY(-14px) rotate(0deg);opacity:1}85%{opacity:1}100%{transform:translateY(340px) rotate(540deg);opacity:0}}@keyframes shimmer{0%{background-position:100% 0}100%{background-position:0 0}}`}</style>
      <GroupScreen key={activeGroup.id} group={activeGroup} onBack={()=>setActiveGroup(null)} onComplete={()=>markCompleted(activeGroup.id)} />
    </div>
  );

  if (screen==="create") return (
    <div>
      <style>{`${FONTS}*{box-sizing:border-box;margin:0;padding:0}button{cursor:pointer;font-family:'DM Sans',sans-serif}input{outline:none}@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
      <CreateScreen onBack={()=>setScreen("home")} onCreate={LIVE ? async (form) => {
        const goal = parseAmount(form.goal);
        const monthly = parseAmount(form.monthly);
        if (!goal.valid || !monthly.valid) throw new Error("Check the goal and monthly amounts");
        await DB.createGroup({
          name: form.name.trim(), category: form.cat || "Other",
          goalCents: Math.round(goal.value * 100), monthlyCents: Math.round(monthly.value * 100),
          joinPolicy: form.joinPolicy, exitPolicy: form.exitPolicy,
        });
        await loadLive();
      } : undefined} />
    </div>
  );

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:C.bg, minHeight:"100vh", paddingBottom:90 }}>
      <style>{`${FONTS}*{box-sizing:border-box;margin:0;padding:0}button{cursor:pointer;font-family:'DM Sans',sans-serif}input{outline:none}::-webkit-scrollbar{width:0;height:0}@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}@keyframes spin{to{transform:rotate(360deg)}}@keyframes pop{0%{transform:scale(0)}60%{transform:scale(1.2)}100%{transform:scale(1)}}@keyframes confettiFall{0%{transform:translateY(-14px) rotate(0deg);opacity:1}85%{opacity:1}100%{transform:translateY(340px) rotate(540deg);opacity:0}}@keyframes shimmer{0%{background-position:100% 0}100%{background-position:0 0}}`}</style>

      {/* HOME */}
      {screen==="notifications" && (
        <div>
          <div style={{ background:`linear-gradient(160deg,${C.surface2},${C.bg})`, padding:"56px 20px 20px", borderBottom:`1px solid ${C.border}` }}>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:26, fontWeight:800, color:C.text }}>Notifications</div>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:C.textMid, marginTop:4 }}>Activity in your Sanduqs and friend requests</div>
          </div>
          {notifList.length === 0 ? (
            <EmptyState icon="🔔" title="Nothing yet" body="When someone pays, a vote happens, or a friend request comes in, it'll show up here." />
          ) : (
            <div style={{ padding:"8px 0" }}>
              {notifList.map(n => {
                const d = new Date(n.at);
                const ago = (() => {
                  const mins = Math.floor((Date.now()-d.getTime())/60000);
                  if (mins<1) return "just now"; if (mins<60) return `${mins}m ago`;
                  const hrs=Math.floor(mins/60); if (hrs<24) return `${hrs}h ago`;
                  const days=Math.floor(hrs/24); return days<7?`${days}d ago`:d.toLocaleDateString();
                })();
                const icon = n.kind==="friend_request"?"👋":n.kind==="votes"?"🗳️":n.kind==="expenses"?"🧾":n.kind==="contributions"?"💸":n.kind==="distributions"?"💰":"🔔";
                const isFriend = n.kind==="friend_request";
                return (
                  <div key={n.id} onClick={()=>{ if(isFriend){ setScreen("profile"); } else if(n.group_id){ const g=sanduqs.find(s=>s.id===n.group_id); if(g){ setActiveLiveGroup(g); } } }}
                    style={{ display:"flex", gap:12, padding:"15px 20px", cursor:"pointer", background:n.unread?C.blueLt:"transparent", borderLeft:n.unread?`3px solid ${C.blue}`:"3px solid transparent", borderBottom:`1px solid ${C.border}` }}>
                    <div style={{ fontSize:22, flexShrink:0 }}>{icon}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:15, fontWeight:600, color:C.text }}>{n.title}</div>
                      {n.subtitle && <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:C.textMid, marginTop:2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{n.subtitle}</div>}
                    </div>
                    <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11.5, color:C.textDim, flexShrink:0 }}>{ago}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {screen==="home" && (
        <div>
          {/* Header */}
          <div style={{ padding:"24px 18px 0" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <Logo size={38} />
                <Wordmark size={20} />
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <button onClick={()=>setScreen("profile")} style={{ width:44, height:44, borderRadius:"50%", background:me.color || C.green, display:"flex", alignItems:"center", justifyContent:"center", fontSize:17, fontWeight:700, color:"#070B14", border:"none", cursor:"pointer" }}>{me.initials}</button>
              </div>
            </div>

            {/* Search — only useful once there are several groups */}
            {!loading && sanduqs.length >= 4 && (
            <div style={{ display:"flex", alignItems:"center", gap:10, background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:"13px 16px", marginBottom:20 }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={C.textDim} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
              <input placeholder="Search Sanduqs..." style={{ flex:1, border:"none", background:"none", fontSize:15, color:C.text }} />
            </div>
            )}
          </div>

          {/* Stats row */}
          <div style={{ padding:"0 18px", marginBottom:16, display:"flex", gap:10 }}>
            {[{label:"Total saved",val:`$${totalSaved.toLocaleString()}`},{label:"Sanduqs",val:String(sanduqs.length)},{label:"Friends",val:String(friends.filter(f=>f.status==="accepted").length)}].map(s => (
              <div key={s.label} style={{ flex:1, background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:"13px 12px" }}>
                <div style={{ fontSize:11, color:C.textMid, fontWeight:500, marginBottom:8 }}>{s.label}</div>
                {loading ? <Sk w={48} h={20} /> : <div style={{ fontSize:s.label==="Total saved"?18:20, fontWeight:800, color:C.text, letterSpacing:-0.5, fontFamily:"'DM Mono',monospace" }}>{s.val}</div>}
              </div>
            ))}
          </div>

          {/* Overall progress */}
          {!loading && sanduqs.length > 0 && (
          <div style={{ padding:"0 18px", marginBottom:18 }}>
            <div style={{ background:`linear-gradient(135deg,${C.surface2} 0%,${C.surface} 100%)`, border:`1px solid ${C.border2}`, borderRadius:18, padding:"18px 18px 20px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                <span style={{ fontSize:14, color:C.textMid, fontWeight:500 }}>Overall progress</span>
                <span style={{ fontSize:12, fontWeight:600, color:C.purpleBright, background:C.purpleLt, padding:"5px 11px", borderRadius:20, border:`1px solid ${C.purple}44` }}>
                  {sanduqs.reduce((a,g)=>a+g.openVotes,0)} open votes
                </span>
              </div>
              <div style={{ display:"flex", alignItems:"baseline", gap:8, marginBottom:14 }}>
                <span style={{ fontSize:34, fontWeight:800, color:C.text, letterSpacing:-1.5, fontFamily:"'DM Mono',monospace" }}>${totalSaved.toLocaleString()}</span>
                <span style={{ fontSize:18, color:C.textDim, fontWeight:500 }}>/ ${totalGoal.toLocaleString()}</span>
              </div>
              <Bar pct={overallPct} color={C.green} />
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:11 }}>
                <span style={{ fontSize:14, color:C.green, fontWeight:700 }}>{Math.round(overallPct*100)}% funded</span>
                <span style={{ fontSize:14, color:C.textMid }}>${(totalGoal-totalSaved).toLocaleString()} to go</span>
              </div>
            </div>
          </div>
          )}

          {/* Category chips — only show categories you actually have */}
          {!loading && sanduqs.length > 0 && (() => {
            const used = ["All", ...CATS.filter(c => c !== "All" && sanduqs.some(g => g.cat === c))];
            if (used.length <= 1) return null; // just "All" — no point showing a filter
            return (
              <div style={{ padding:"0 18px", marginBottom:18, display:"flex", gap:9, overflowX:"auto" }}>
                {used.map(c => (
                  <button key={c} onClick={()=>setCat(c)} style={{ padding:"9px 18px", borderRadius:22, whiteSpace:"nowrap", fontSize:14, fontWeight:600, background:cat===c?C.green:C.surface, color:cat===c?"#070B14":C.textMid, border:`1px solid ${cat===c?C.green:C.border}`, transition:"all .15s" }}>{c}</button>
                ))}
              </div>
            );
          })()}

          {/* Sanduq cards */}
          <div style={{ padding:"0 18px" }}>
            {loading && [0,1,2].map(i => <SanduqCardSkeleton key={i} />)}
            {LIVE && !loading && (
              <div style={{ marginBottom:16 }}>
                <div style={{ display:"flex", gap:8 }}>
                  <input value={joinCode} onChange={e=>setJoinCode(e.target.value)} placeholder="Join with a code…" style={{ flex:1, background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:"12px 14px", fontFamily:"'DM Mono',monospace", fontSize:12.5, color:C.text }} />
                  <button onClick={handleJoin} disabled={!joinCode.trim() || joinBusy} style={{ padding:"0 18px", borderRadius:12, background:joinCode.trim()?C.green:C.surface2, border:"none", fontFamily:"'DM Sans',sans-serif", fontSize:13.5, fontWeight:700, color:joinCode.trim()?"#070B14":C.textDim, cursor:"pointer" }}>{joinBusy?"…":"Join"}</button>
                </div>
                {joinErr && <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12.5, color:C.red, marginTop:8 }}>{joinErr}</div>}
              </div>
            )}
            {!loading && shown.length === 0 && (
              <div style={{ textAlign:"center", padding:"48px 24px" }}>
                <div style={{ width:72, height:72, borderRadius:20, background:C.surface, border:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:34, margin:"0 auto 18px" }}>
                  {sanduqs.length === 0 ? "🫙" : "🔍"}
                </div>
                <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:18, fontWeight:700, color:C.text }}>
                  {sanduqs.length === 0 ? "No Sanduqs yet" : `Nothing in ${cat}`}
                </div>
                <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13.5, color:C.textMid, marginTop:6, lineHeight:1.5, maxWidth:280, marginLeft:"auto", marginRight:"auto" }}>
                  {sanduqs.length === 0
                    ? "Start a shared savings goal with friends — a trip, a gift, a celebration. Everyone chips in, the group decides together."
                    : "You don't have any Sanduqs in this category yet. Try another, or start a new one."}
                </div>
                {sanduqs.length === 0 && (
                  <button onClick={()=>setScreen("create")} style={{ marginTop:22, padding:"13px 24px", borderRadius:24, background:C.blue, border:"none", fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:700, color:"#fff", cursor:"pointer", boxShadow:`0 4px 16px ${C.blue}55` }}>
                    Create your first Sanduq
                  </button>
                )}
              </div>
            )}
            {!loading && shown.map(g => {
              const members = ALL_MEMBERS[g.id] || [];
              const pct = g.pot / g.goal;
              return (
                <div key={g.id} onClick={()=>g.live ? setActiveLiveGroup(g) : setActiveGroup(g)} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:22, marginBottom:16, cursor:"pointer", overflow:"hidden", transition:"transform .18s, border-color .18s" }}
                  onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.borderColor=C.border2}}
                  onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.borderColor=C.border}}>

                  {/* Poster header */}
                  <div style={{ position:"relative", height:150, padding:16, display:"flex", flexDirection:"column", justifyContent:"space-between" }}>
                    <Scene scene={g.scene} />
                    {/* dark gradient for text legibility */}
                    <div style={{ position:"absolute", inset:0, background:"linear-gradient(180deg,rgba(0,0,0,0.05) 40%,rgba(0,0,0,0.55) 100%)" }} />
                    {/* top row: pills */}
                    <div style={{ position:"relative", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                      <div style={{ display:"flex", gap:6 }}>
                        {g.openVotes>0 && <span style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:11, fontWeight:700, color:"#fff", background:"rgba(0,0,0,0.28)", backdropFilter:"blur(4px)", padding:"5px 10px", borderRadius:8 }}>☑ {g.openVotes} vote{g.openVotes>1?"s":""}</span>}
                        {g.alerts>0 && <span style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:11, fontWeight:700, color:"#fff", background:"rgba(0,0,0,0.28)", backdropFilter:"blur(4px)", padding:"5px 10px", borderRadius:8 }}>⚠ {g.alerts} at risk</span>}
                      </div>
                      <span style={{ fontSize:34, lineHeight:1, filter:"drop-shadow(0 2px 6px rgba(0,0,0,0.35))" }}>{g.emoji}</span>
                    </div>
                    {/* bottom: poster title */}
                    <div style={{ position:"relative" }}>
                      <div style={{ fontSize:24, fontWeight:800, color:"#fff", letterSpacing:-0.5, lineHeight:1.05, textShadow:"0 2px 12px rgba(0,0,0,0.4)" }}>{g.name}</div>
                      <div style={{ fontSize:13, color:"rgba(255,255,255,0.9)", marginTop:4, fontWeight:500 }}>Monthly · ${g.monthly}/member</div>
                    </div>
                  </div>

                  {/* Body */}
                  <div style={{ padding:16 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:10 }}>
                      <span style={{ fontSize:22, fontWeight:800, color:C.text, letterSpacing:-0.5, fontFamily:"'DM Mono',monospace" }}>${g.pot.toLocaleString()}</span>
                      <span style={{ fontSize:14, color:C.textMid }}>of ${g.goal.toLocaleString()}</span>
                    </div>
                    <Bar pct={pct} color={g.bar} />
                    <div style={{ display:"flex", justifyContent:"space-between", marginTop:9, marginBottom:14 }}>
                      <span style={{ fontSize:13, color:C.textMid }}>{Math.round(pct*100)}% funded</span>
                      <span style={{ fontSize:13, color:C.textMid }}>${(g.goal-g.pot).toLocaleString()} to go</span>
                    </div>

                    <Divider />

                    {/* Footer */}
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:14 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <div style={{ display:"flex" }}>
                          {members.slice(0,4).map((m,j) => <div key={j} style={{ marginLeft:j===0?0:-8, zIndex:10-j }}><Avatar m={m} size={26} ring /></div>)}
                          {members.length>4 && <div style={{ width:26, height:26, borderRadius:"50%", background:C.surface2, boxShadow:`0 0 0 2px ${C.bg}`, marginLeft:-8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:600, color:C.textMid }}>+{members.length-4}</div>}
                        </div>
                        <span style={{ fontSize:13, color:C.textMid }}>{members.length} active</span>
                      </div>
                      <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                        {g.status==="completed"
                          ? <Pill label="Completed ✓" color={C.green} bg={C.greenLt} />
                          : g.pot >= g.goal
                            ? <Pill label="🏆 Goal reached" color={C.purpleBright} bg={C.purpleLt} />
                            : <>
                                <span style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:13, color:C.textMid }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.textMid} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4.5" width="18" height="17" rx="3"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/></svg>{g.daysLeft}d left</span>
                                {g.myStatus==="unpaid"
                                  ? <Pill label="Due" color={C.amber} bg={C.amberLt} />
                                  : <Pill label="Paid ✓" color={C.green} bg={C.greenLt} />}
                              </>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MESSAGES — DM inbox + thread */}
      {screen==="messages" && (
        <div>
          {!activeDM ? (
            <div>
              <div style={{ background:`linear-gradient(160deg,${C.surface2},${C.bg})`, padding:"56px 20px 20px", borderBottom:`1px solid ${C.border}` }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:26, fontWeight:800, color:C.text }}>Messages</div>
                  <button onClick={()=>setScreen("home")} style={{ padding:"8px 14px", borderRadius:20, background:"rgba(255,255,255,.08)", border:`1px solid ${C.border}`, fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:600, color:C.textMid, cursor:"pointer" }}>Close</button>
                </div>
              </div>
              <div style={{ padding:16 }}>
                {dmThreads.length === 0 ? (
                  <EmptyState icon="💬" title="No messages yet" body="Start a conversation with a friend from your profile, or message someone in one of your Sanduqs." />
                ) : (
                <SurfaceCard style={{ padding:"6px 18px" }}>
                  {dmThreads.map((t,i) => (
                    <div key={t.id}>
                      <div onClick={()=>setActiveDM(t.id)} style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 0", cursor:"pointer" }}>
                        <div style={{ position:"relative" }}>
                          <Avatar m={t.friend} size={46} />
                          {t.unread>0 && <div style={{ position:"absolute", top:-2, right:-2, minWidth:17, height:17, borderRadius:9, background:C.blue, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, color:"#fff", padding:"0 4px" }}>{t.unread}</div>}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                            <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:15, fontWeight:t.unread?700:600, color:C.text }}>{t.friend.name}</span>
                            <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.textDim }}>{t.time}</span>
                          </div>
                          <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:t.unread?C.text:C.textMid, fontWeight:t.unread?600:400, marginTop:2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{t.last}</div>
                        </div>
                      </div>
                      {i<dmThreads.length-1 && <Divider />}
                    </div>
                  ))}
                </SurfaceCard>
                )}
              </div>
            </div>
          ) : (() => {
            const thread = dmThreads.find(t=>t.id===activeDM);
            const sendDM = () => {
              if (!dmDraft.trim()) return;
              setDmThreads(ts => ts.map(t => t.id===activeDM ? { ...t, msgs:[...t.msgs, { id:Date.now(), text:dmDraft.trim(), time:"Now", mine:true }], last:`You: ${dmDraft.trim()}`, time:"Now" } : t));
              setDmDraft("");
            };
            return (
              <div style={{ display:"flex", flexDirection:"column", minHeight:"100vh" }}>
                <div style={{ background:`linear-gradient(160deg,${C.surface2},${C.bg})`, padding:"56px 20px 16px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:12 }}>
                  <button onClick={()=>setActiveDM(null)} style={{ background:"rgba(255,255,255,.08)", border:"none", borderRadius:18, padding:"7px 12px", color:C.textMid, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>←</button>
                  <Avatar m={thread.friend} size={38} />
                  <div>
                    <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:16, fontWeight:700, color:C.text }}>{thread.friend.name}</div>
                    <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, color:C.green }}>● Friend</div>
                  </div>
                </div>
                <div style={{ flex:1, padding:"18px 16px 100px" }}>
                  {thread.msgs.map(m => (
                    <div key={m.id} style={{ display:"flex", justifyContent:m.mine?"flex-end":"flex-start", marginBottom:10 }}>
                      <div style={{ maxWidth:"78%", background:m.mine?C.blue:C.surface, color:m.mine?"#fff":C.text, border:m.mine?"none":`1px solid ${C.border}`, borderRadius:m.mine?"16px 16px 4px 16px":"16px 16px 16px 4px", padding:"10px 14px", fontFamily:"'DM Sans',sans-serif", fontSize:14, lineHeight:1.4 }}>
                        {m.text}
                        <div style={{ fontSize:10, color:m.mine?"rgba(255,255,255,0.7)":C.textDim, marginTop:3, textAlign:"right" }}>{m.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ position:"fixed", bottom:0, left:0, right:0, background:`${C.bg}f2`, backdropFilter:"blur(12px)", borderTop:`1px solid ${C.border}`, padding:"12px 16px 28px", display:"flex", gap:8, zIndex:200 }}>
                  <input value={dmDraft} onChange={e=>setDmDraft(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendDM()} placeholder={`Message ${thread.friend.name.split(" ")[0]}...`} style={{ flex:1, padding:"13px 16px", borderRadius:24, border:`1px solid ${C.border}`, background:C.surface, fontFamily:"'DM Sans',sans-serif", fontSize:14, color:C.text }} />
                  <button onClick={sendDM} style={{ width:46, height:46, borderRadius:"50%", background:dmDraft.trim()?C.blue:C.surface2, border:"none", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={dmDraft.trim()?"#fff":C.textDim} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z"/></svg>
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* CALENDAR */}
      {screen==="calendar" && (
        <div>
          <div style={{ background:`linear-gradient(160deg,${C.surface2},${C.bg})`, padding:"56px 20px 20px", borderBottom:`1px solid ${C.border}` }}>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:26, fontWeight:800, color:C.text }}>Calendar</div>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:C.textMid, marginTop:4 }}>Due dates, goal milestones & open votes</div>
          </div>
          <div style={{ padding:16 }}>
            {calLoading ? (
              <SurfaceCard><div style={{ textAlign:"center", padding:"20px 0", fontFamily:"'DM Sans',sans-serif", fontSize:13, color:C.textMid }}>Loading…</div></SurfaceCard>
            ) : calEvents.length === 0 ? (
              <EmptyState icon="📅" title="Nothing scheduled" body="Payment due dates, goal milestones, and open votes will show up here once you join or create a Sanduq." />
            ) : (() => {
              const now = new Date();
              const cy = now.getFullYear(), cm = now.getMonth();
              const monthName = now.toLocaleDateString(undefined,{month:"long",year:"numeric"});
              const firstDay = new Date(cy, cm, 1).getDay();
              const daysInMonth = new Date(cy, cm+1, 0).getDate();
              const kindColor = (k) => k==="due"?C.blue : k==="vote"?C.purple : k==="milestone"?C.green : C.textMid;
              // which days this month have events
              const dayHas = {};
              calEvents.forEach(e => { const d=new Date(e.date); if(d.getFullYear()===cy && d.getMonth()===cm){ (dayHas[d.getDate()] ||= new Set()).add(e.kind); } });

              const upcoming = calEvents.filter(e => new Date(e.date) >= now && e.kind !== "paid");
              const recent = calEvents.filter(e => new Date(e.date) < now || e.kind === "paid").reverse();
              const list = calTab==="upcoming" ? upcoming : recent;

              return (
                <>
                  {/* Month grid */}
                  <SurfaceCard>
                    <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:16, fontWeight:700, color:C.text, marginBottom:14 }}>{monthName}</div>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4, marginBottom:6 }}>
                      {["S","M","T","W","T","F","S"].map((d,i) => <div key={i} style={{ textAlign:"center", fontSize:10, fontWeight:600, color:C.textDim }}>{d}</div>)}
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4 }}>
                      {Array.from({length:firstDay}).map((_,i)=><div key={"x"+i} />)}
                      {Array.from({length:daysInMonth}).map((_,i) => {
                        const day=i+1; const kinds=dayHas[day]; const isToday=day===now.getDate();
                        const color = kinds ? kindColor([...kinds][0]) : null;
                        return (
                          <div key={i} style={{ aspectRatio:"1", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", borderRadius:8, background:kinds?`${color}22`:"transparent", border:isToday?`1px solid ${C.text}55`:kinds?`1px solid ${color}55`:"1px solid transparent" }}>
                            <span style={{ fontFamily:"'DM Mono',monospace", fontSize:12, color:kinds||isToday?C.text:C.textMid, fontWeight:kinds||isToday?600:400 }}>{day}</span>
                            {kinds && <div style={{ display:"flex", gap:2, marginTop:2 }}>{[...kinds].slice(0,3).map((k,j)=><div key={j} style={{ width:4, height:4, borderRadius:"50%", background:kindColor(k) }} />)}</div>}
                          </div>
                        );
                      })}
                    </div>
                    {/* legend */}
                    <div style={{ display:"flex", gap:14, marginTop:14, flexWrap:"wrap" }}>
                      {[["due","Due",C.blue],["vote","Vote",C.purple],["milestone","Goal",C.green]].map(([k,lbl,col]) => (
                        <div key={k} style={{ display:"flex", alignItems:"center", gap:5 }}>
                          <div style={{ width:7, height:7, borderRadius:"50%", background:col }} />
                          <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, color:C.textMid }}>{lbl}</span>
                        </div>
                      ))}
                    </div>
                  </SurfaceCard>

                  {/* Timeline tabs */}
                  <div style={{ display:"flex", gap:8, margin:"18px 2px 12px" }}>
                    {[["upcoming",`Upcoming${upcoming.length?` · ${upcoming.length}`:""}`],["recent",`Recent${recent.length?` · ${recent.length}`:""}`]].map(([k,lbl]) => (
                      <button key={k} onClick={()=>setCalTab(k)} style={{ padding:"8px 16px", borderRadius:20, background:calTab===k?C.blue:C.surface, border:`1px solid ${calTab===k?C.blue:C.border}`, fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:600, color:calTab===k?"#fff":C.textMid, cursor:"pointer" }}>{lbl}</button>
                    ))}
                  </div>

                  {list.length === 0 ? (
                    <SurfaceCard><div style={{ textAlign:"center", padding:"16px 0", fontFamily:"'DM Sans',sans-serif", fontSize:13, color:C.textDim }}>{calTab==="upcoming"?"Nothing upcoming.":"No history yet."}</div></SurfaceCard>
                  ) : (
                    <SurfaceCard style={{ padding:"6px 18px" }}>
                      {list.map((e,i) => {
                        const d = new Date(e.date);
                        const color = kindColor(e.kind);
                        return (
                          <div key={e.id}>
                            <div style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 0" }}>
                              <div style={{ width:44, height:44, borderRadius:12, background:`${color}1F`, border:`1px solid ${color}44`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                                <span style={{ fontFamily:"'DM Mono',monospace", fontSize:9, color:color, textTransform:"uppercase", fontWeight:500 }}>{d.toLocaleDateString(undefined,{month:"short"})}</span>
                                <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:16, fontWeight:800, color:C.text, lineHeight:1 }}>{d.getDate()}</span>
                              </div>
                              <div style={{ flex:1 }}>
                                <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:600, color:C.text }}>{e.title}</div>
                                {e.subtitle && <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.textMid, marginTop:2 }}>{e.subtitle}</div>}
                              </div>
                              <Pill label={e.kind==="due"?"Due":e.kind==="vote"?"Vote":e.kind==="milestone"?"Goal":"Paid"} color={color} bg={`${color}1F`} />
                            </div>
                            {i<list.length-1 && <Divider />}
                          </div>
                        );
                      })}
                    </SurfaceCard>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ACTIVITY */}
      {screen==="activity" && (
        <div>
          <div style={{ background:`linear-gradient(160deg,${C.surface2},${C.bg})`, padding:"56px 20px 20px", borderBottom:`1px solid ${C.border}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:26, fontWeight:800, color:C.text }}>Activity</div>
              {unread>0 && <button onClick={()=>setNotifs(ns=>ns.map(n=>({...n,read:true})))} style={{ padding:"8px 14px", borderRadius:20, background:"rgba(255,255,255,.08)", border:`1px solid ${C.border}`, fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:600, color:C.textMid, cursor:"pointer" }}>Mark all read</button>}
            </div>
          </div>
          <div style={{ padding:16 }}>
            {notifs.length === 0 ? (
              <EmptyState icon="🔔" title="You're all caught up" body="Payment confirmations, new votes, and member activity across your Sanduqs will appear here." />
            ) : (
            <SurfaceCard style={{ padding:"6px 18px" }}>
              {notifs.map((n,i) => {
                const nc = NC[n.type] || {color:C.textMid,bg:C.surface2};
                return (
                  <div key={n.id}>
                    <div style={{ display:"flex", gap:12, padding:"14px 0", opacity:n.read?.55:1, transition:"opacity .3s" }}>
                      <div style={{ width:36, height:36, borderRadius:10, background:nc.bg, border:`1px solid ${nc.color}33`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Mono',monospace", fontSize:13, fontWeight:500, color:nc.color, flexShrink:0 }}>{n.icon}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                          <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:600, color:C.text }}>{n.title}</div>
                          {!n.read && <div style={{ width:7, height:7, borderRadius:"50%", background:C.green, marginTop:5, flexShrink:0 }} />}
                        </div>
                        <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:C.textMid, marginTop:2, lineHeight:1.4 }}>{n.body}</div>
                        <div style={{ display:"flex", gap:8, marginTop:5, alignItems:"center" }}>
                          <span style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:C.textDim }}>{n.group}</span>
                          <span style={{ width:2, height:2, borderRadius:"50%", background:C.textDim, display:"inline-block" }} />
                          <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, color:C.textDim }}>{n.time}</span>
                        </div>
                      </div>
                    </div>
                    {i<notifs.length-1 && <Divider />}
                  </div>
                );
              })}
            </SurfaceCard>
            )}
          </div>
        </div>
      )}

      {/* PROFILE */}
      {screen==="profile" && (
        <div>
          <div style={{ background:`linear-gradient(160deg,${C.surface2},${C.bg})`, padding:"56px 20px 24px", borderBottom:`1px solid ${C.border}` }}>
            <div style={{ display:"flex", alignItems:"center", gap:14 }}>
              <div style={{ width:56, height:56, borderRadius:"50%", background:me.color || C.green, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, fontWeight:700, color:"#070B14" }}>{me.initials}</div>
              <div style={{ flex:1 }}>
                {editingName ? (
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <input autoFocus value={nameDraft} onChange={e=>setNameDraft(e.target.value)} placeholder="Your name"
                      style={{ flex:1, background:C.surface2, border:`1px solid ${C.blue}`, borderRadius:10, padding:"8px 12px", fontFamily:"'DM Sans',sans-serif", fontSize:18, fontWeight:700, color:C.text }} />
                    <button onClick={saveName} disabled={!nameDraft.trim() || savingName} style={{ padding:"8px 14px", borderRadius:10, background:C.green, border:"none", fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:700, color:"#070B14", cursor:"pointer" }}>{savingName?"…":"Save"}</button>
                  </div>
                ) : (
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:22, fontWeight:700, color:C.text }}>{me.name}</div>
                    <button onClick={()=>{ setNameDraft(me.name==="New member"||me.name==="Member"?"":me.name); setEditingName(true); }} style={{ background:"none", border:"none", cursor:"pointer", padding:4 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.textMid} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                    </button>
                  </div>
                )}
                {nameErr && <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.red, marginTop:4 }}>{nameErr}</div>}
                <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:C.textMid, marginTop:2 }}>Sanduq member</div>
              </div>
            </div>
          </div>
          <div style={{ padding:16 }}>
            {/* Friends */}
            <SurfaceCard>
              <Eyebrow>Friends</Eyebrow>

              {/* Your friend code to share */}
              <div style={{ background:C.surface2, border:`1px solid ${C.border}`, borderRadius:12, padding:"12px 14px", marginTop:8, marginBottom:14 }}>
                <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.textMid, marginBottom:8 }}>Your friend code — share it so people can add you.</div>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <span style={{ flex:1, fontFamily:"'DM Mono',monospace", fontSize:20, fontWeight:600, letterSpacing:3, color:C.text }}>{myCode || "········"}</span>
                  <button onClick={()=>{ if(myCode){ navigator.clipboard?.writeText(myCode); setCodeCopied(true); setTimeout(()=>setCodeCopied(false),1500);} }} style={{ padding:"7px 13px", borderRadius:9, background:codeCopied?C.greenLt:C.surface, border:`1px solid ${codeCopied?C.green:C.border}`, fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:700, color:codeCopied?C.green:C.textMid, cursor:"pointer" }}>{codeCopied?"Copied ✓":"Copy"}</button>
                </div>
              </div>

              {/* Add a friend by code */}
              <div style={{ display:"flex", gap:8, marginBottom:6 }}>
                <input value={friendCodeInput} onChange={e=>{ setFriendCodeInput(e.target.value.toUpperCase()); setFriendErr(null); setFriendMsg(null); }} placeholder="Enter a friend's code"
                  style={{ flex:1, background:C.surface2, border:`1px solid ${C.border}`, borderRadius:10, padding:"11px 13px", fontFamily:"'DM Mono',monospace", fontSize:14, letterSpacing:2, color:C.text }} />
                <button onClick={addFriend} disabled={!friendCodeInput.trim()||friendBusy} style={{ padding:"0 16px", borderRadius:10, background:C.blue, border:"none", fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:700, color:"#fff", cursor:"pointer", opacity:(!friendCodeInput.trim()||friendBusy)?0.5:1 }}>{friendBusy?"…":"Add"}</button>
              </div>
              {friendErr && <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.red, marginBottom:8 }}>{friendErr}</div>}
              {friendMsg && <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.green, marginBottom:8 }}>{friendMsg}</div>}

              {/* Incoming requests */}
              {friends.filter(f=>f.status==="requested" && f.direction==="incoming").length>0 && (
                <div style={{ marginTop:12, marginBottom:6 }}>
                  <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:600, color:C.amber, marginBottom:6 }}>Friend requests</div>
                  {friends.filter(f=>f.status==="requested" && f.direction==="incoming").map(f => (
                    <div key={f.friendship_id} style={{ display:"flex", alignItems:"center", gap:12, padding:"8px 0" }}>
                      <div style={{ width:38, height:38, borderRadius:"50%", background:f.avatar_color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:700, color:"#070B14" }}>{(f.display_name||"?").slice(0,2).toUpperCase()}</div>
                      <div style={{ flex:1, fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:600, color:C.text }}>{f.display_name}</div>
                      <button onClick={()=>respondToFriend(f.friendship_id, true)} disabled={friendBusy} style={{ padding:"8px 14px", borderRadius:10, background:C.blue, border:"none", fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:700, color:"#fff", cursor:"pointer" }}>Accept</button>
                      <button onClick={()=>respondToFriend(f.friendship_id, false)} disabled={friendBusy} style={{ padding:"8px 12px", borderRadius:10, background:C.surface2, border:`1px solid ${C.border}`, fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:600, color:C.textMid, cursor:"pointer" }}>Decline</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Accepted friends */}
              {friends.filter(f=>f.status==="accepted").length>0 && (
                <div style={{ marginTop:12 }}>
                  <Divider />
                  {friends.filter(f=>f.status==="accepted").map(f => (
                    <div key={f.friendship_id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0" }}>
                      <div style={{ width:38, height:38, borderRadius:"50%", background:f.avatar_color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:700, color:"#070B14" }}>{(f.display_name||"?").slice(0,2).toUpperCase()}</div>
                      <div style={{ flex:1, fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:600, color:C.text }}>{f.display_name}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Outgoing pending */}
              {friends.filter(f=>f.status==="requested" && f.direction==="outgoing").length>0 && (
                <div style={{ marginTop:10, fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.textDim }}>
                  {friends.filter(f=>f.status==="requested" && f.direction==="outgoing").length} pending invite{friends.filter(f=>f.status==="requested" && f.direction==="outgoing").length>1?"s":""} sent
                </div>
              )}

              {friends.length===0 && !friendMsg && (
                <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:C.textDim, marginTop:10, textAlign:"center", padding:"8px 0" }}>No friends yet. Share your code to connect.</div>
              )}
            </SurfaceCard>

            {/* Payment handles */}
            <SurfaceCard>
              <Eyebrow>Your payment handles</Eyebrow>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.textDim, marginBottom:10 }}>Shown to your group when you're the treasurer collecting funds.</div>
              {handles.map((m,i,arr) => (
                <div key={m.app}>
                  <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 0" }}>
                    <div style={{ width:40, height:40, borderRadius:12, background:C.surface2, border:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>{m.app==="Venmo"?"🅥":m.app==="Cash App"?"💵":m.app==="Zelle"?"⚡":"💳"}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:600, color:C.text }}>{m.app}</div>
                      <div style={{ fontFamily:"'DM Mono',monospace", fontSize:12, color:C.textMid, marginTop:1 }}>{m.handle}</div>
                    </div>
                    <button onClick={()=>removeHandle(m.app)} disabled={handleBusy} style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.red, background:"none", border:"none", cursor:"pointer", fontWeight:600 }}>Remove</button>
                  </div>
                  {i<arr.length-1 && <Divider />}
                </div>
              ))}

              {addingHandle ? (
                <div style={{ marginTop:12, paddingTop:12, borderTop:`1px dashed ${C.border}` }}>
                  <div style={{ display:"flex", gap:6, marginBottom:8, flexWrap:"wrap" }}>
                    {["Venmo","Cash App","Zelle","PayPal"].map(a => (
                      <button key={a} onClick={()=>setHandleApp(a)} style={{ padding:"7px 12px", borderRadius:9, background:handleApp===a?C.blue:C.surface2, border:`1px solid ${handleApp===a?C.blue:C.border}`, fontFamily:"'DM Sans',sans-serif", fontSize:12.5, fontWeight:600, color:handleApp===a?"#fff":C.textMid, cursor:"pointer" }}>{a}</button>
                    ))}
                  </div>
                  <div style={{ display:"flex", gap:8 }}>
                    <input autoFocus value={handleVal} onChange={e=>setHandleVal(e.target.value)} placeholder={handleApp==="Venmo"?"@your-venmo":handleApp==="Cash App"?"$yourcashtag":handleApp==="Zelle"?"email or phone":"your-handle"}
                      style={{ flex:1, background:C.surface2, border:`1px solid ${C.border}`, borderRadius:10, padding:"11px 13px", fontFamily:"'DM Mono',monospace", fontSize:14, color:C.text }} />
                    <button onClick={addHandle} disabled={!handleVal.trim()||handleBusy} style={{ padding:"0 16px", borderRadius:10, background:C.blue, border:"none", fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:700, color:"#fff", cursor:"pointer", opacity:(!handleVal.trim()||handleBusy)?0.5:1 }}>{handleBusy?"…":"Save"}</button>
                  </div>
                  <button onClick={()=>{ setAddingHandle(false); setHandleVal(""); setHandleErr(null); }} style={{ marginTop:8, fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.textMid, background:"none", border:"none", cursor:"pointer" }}>Cancel</button>
                </div>
              ) : (
                <button onClick={()=>{ setAddingHandle(true); setHandleApp(handles.some(h=>h.app==="Venmo")?"Cash App":"Venmo"); }} style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"12px 0", marginTop:4, background:"none", border:"none", cursor:"pointer", borderTop:handles.length?`1px dashed ${C.border}`:"none" }}>
                  <div style={{ width:40, height:40, borderRadius:12, background:C.surface2, border:`1.5px dashed ${C.border2}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, color:C.textDim }}>+</div>
                  <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:600, color:C.blue }}>Add a payment handle</div>
                </button>
              )}
              {handleErr && <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.red, marginTop:8 }}>{handleErr}</div>}
            </SurfaceCard>

            {/* Notification channel — hidden until notifications are wired */}
            {false && (
            <SurfaceCard>
              <Eyebrow>Notification channel</Eyebrow>
              <div style={{ display:"flex", gap:8, marginBottom:14 }}>
                {["sms","email"].map(ch => (
                  <button key={ch} onClick={()=>setChannel(ch)} style={{ flex:1, padding:10, borderRadius:10, background:channel===ch?C.green:C.surface2, border:`1px solid ${channel===ch?C.green:C.border}`, fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:600, color:channel===ch?"#070B14":C.textMid, cursor:"pointer", transition:"all .15s" }}>
                    {ch==="sms"?"📱 SMS":"📧 Email"}
                  </button>
                ))}
              </div>
              <input value={channel==="sms"?phone:""} onChange={e=>setPhone(e.target.value)} style={{ width:"100%", padding:"12px 14px", borderRadius:10, border:`1px solid ${C.border}`, background:C.surface2, fontFamily:"'DM Mono',monospace", fontSize:14, color:C.text }} />
            </SurfaceCard>
            )}

            {/* Notification prefs */}
            <SurfaceCard style={{ padding:"10px 18px" }}>
              <div style={{ paddingTop:8, paddingBottom:6 }}><Eyebrow>Notification preferences</Eyebrow></div>
              {NOTIF_SETTINGS.map((n,i) => (
                <div key={n.id}>
                  <div style={{ display:"flex", alignItems:"center", gap:14, padding:"13px 0" }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:600, color:C.text }}>{n.label}</div>
                      <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.textMid, marginTop:2 }}>{n.desc}</div>
                    </div>
                    <Toggle on={toggles[n.id]} onChange={()=>setToggles(t=>({...t,[n.id]:!t[n.id]}))} />
                  </div>
                  {i<NOTIF_SETTINGS.length-1 && <Divider />}
                </div>
              ))}
            </SurfaceCard>
          </div>
        </div>
      )}

      {/* Bottom nav — Partiful style */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0, background:`${C.bg}f2`, backdropFilter:"blur(12px)", borderTop:`1px solid ${C.border}`, display:"flex", alignItems:"center", paddingBottom:22, paddingTop:12, zIndex:100 }}>
        {[
          { id:"home", icon:"home" },
          { id:"calendar", icon:"calendar" },
          { id:"create", isAction:true },
          { id:"notifications", icon:"bell" },
          { id:"profile", icon:"profile" },
        ].map(t => (
          <button key={t.id} onClick={()=>setScreen(t.id)} style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", background:"none", border:"none", cursor:"pointer", position:"relative" }}>
            {t.isAction
              ? <div style={{ width:52, height:52, borderRadius:"50%", background:C.blue, display:"flex", alignItems:"center", justifyContent:"center", marginTop:-26, boxShadow:`0 6px 20px ${C.blue}66`, transition:"transform .12s" }}
                  onMouseDown={e=>e.currentTarget.style.transform="scale(.92)"} onMouseUp={e=>e.currentTarget.style.transform=""}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                </div>
              : <div style={{ position:"relative", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <NavIcon name={t.icon} active={screen===t.id} />
                  {t.id==="notifications" && notifUnread>0 && <div style={{ position:"absolute", top:-4, right:-7, minWidth:15, height:15, padding:"0 3px", borderRadius:8, background:C.red, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans',sans-serif", fontSize:9, fontWeight:700, color:"#fff" }}>{notifUnread>9?"9+":notifUnread}</div>}
                  {screen===t.id && <div style={{ position:"absolute", bottom:-9, width:4, height:4, borderRadius:"50%", background:C.blue }} />}
                </div>
            }
          </button>
        ))}
      </div>
    </div>
  );
}
