import { useState } from "react";

const C = {
  navy:      "#0d1e2f",
  navyMid:   "#172840",
  gold:      "#c9a227",
  goldHover: "#b8911f",
  bg:        "#edf1f7",
  white:     "#ffffff",
  textPrim:  "#111827",
  textSub:   "#6b7280",
  border:    "#d1d9e6",
};

const STUDENTS = [
  { id: 1, name: "Sai Shreyas",   phone: "+91xxxxxxxxxx", hall: "Hall 12 A513", email: "kshreyas@iitk.ac.in",      debt: 2000, limit: 3000 },
  { id: 2, name: "Tejas",         phone: "+91xxxxxxxxxx", hall: "Hall 3 B116",  email: "tejas@iitk.ac.in",         debt: 1000, limit: 2000 },
  { id: 3, name: "Sai Chaitanya", phone: "+91xxxxxxxxxx", hall: "Hall 3 B116",  email: "chaitanya@iitk.ac.in",     debt: 2200, limit: 3000 },
  { id: 4, name: "Lekha Harsha",  phone: "+91xxxxxxxxxx", hall: "Hall 3 F116",  email: "harsha@iitk.ac.in",        debt: 4500, limit: 5000 },
  { id: 5, name: "Haneesh",       phone: "+91xxxxxxxxxx", hall: "Hall 3 A212",  email: "haneesh@reddy.iitk.ac.in", debt: 2000, limit: 3000 },
  { id: 6, name: "Ram Charan",    phone: "+91xxxxxxxxxx", hall: "Hall 3 E147",  email: "ramcharan@iitk.ac.in",     debt: 3000, limit: 5000 },
];

function SearchIcon() { return <svg width="18" height="18" fill="none" stroke={C.textSub} strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>; }
function DropIcon()   { return <svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg>; }
function ChevronLeft(){ return <svg width="12" height="12" fill="none" stroke={C.textSub} strokeWidth="2.5" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>; }

function Toast({ msg, onClose }) {
  return (
    <div style={{
      position:"fixed", bottom:24, right:24, zIndex:9999,
      background:C.navy, color:C.white, borderRadius:10,
      padding:"13px 20px", fontSize:14, fontWeight:500,
      boxShadow:"0 8px 28px rgba(0,0,0,0.22)",
      display:"flex", alignItems:"center", gap:14,
      animation:"fadeUp .25s ease",
    }}>
      {msg}
      <button onClick={onClose} style={{background:"none",border:"none",color:C.gold,cursor:"pointer",fontSize:18,lineHeight:1}}>×</button>
    </div>
  );
}

function DebtCard({ s, onPaidOffline, onNotify }) {
  return (
    <div style={{
      background:C.white, borderRadius:16,
      padding:"20px 24px",
      display:"flex", alignItems:"center", justifyContent:"space-between",
      boxShadow:"0 1px 6px rgba(15,32,53,0.07)",
      border:`1px solid ${C.border}`,
      gap:12,
    }}>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ margin:0, fontWeight:500, fontSize:20, color:C.textPrim }}>{s.name}</p>
        <p style={{ margin:"6px 0 0", fontSize:14, color:C.textSub, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
          Ph no. {s.phone}, {s.hall}, Mail: {s.email}
        </p>
      </div>

      <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:10, flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:5 }}>
          <span style={{ fontSize:14, fontWeight:700, color:C.textPrim, whiteSpace:"nowrap" }}>
            Total Debt:&nbsp;
            <span style={{ color:C.navyMid }}>₹{s.debt.toLocaleString()}/{s.limit.toLocaleString()}</span>
          </span>
          <ChevronLeft />
        </div>

        <div style={{ display:"flex", gap:10 }}>
          <button
            onClick={()=>onPaidOffline(s.id)}
            style={{ padding:"7px 18px", borderRadius:20, border:"none", background:C.gold, color:C.white, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit", transition:"background .18s" }}
            onMouseEnter={e=>e.currentTarget.style.background=C.goldHover}
            onMouseLeave={e=>e.currentTarget.style.background=C.gold}
          >Paid Offline</button>

          <button
            onClick={()=>onNotify(s.id)}
            style={{ padding:"7px 18px", borderRadius:20, border:"none", background:C.navyMid, color:C.white, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit", transition:"background .18s" }}
            onMouseEnter={e=>e.currentTarget.style.background="#1e3554"}
            onMouseLeave={e=>e.currentTarget.style.background=C.navyMid}
          >Notify Now</button>
        </div>
      </div>
    </div>
  );
}

export default function ActiveDebtsContent() {
  const [search,     setSearch]     = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen,   setSortOpen]   = useState(false);
  const [filterBy,   setFilterBy]   = useState("all");
  const [sortBy,     setSortBy]     = useState("default");
  const [students,   setStudents]   = useState(STUDENTS);
  const [toast,      setToast]      = useState(null);

  const showToast = msg => { setToast(msg); setTimeout(()=>setToast(null), 3000); };

  const handlePaidOffline = id => {
    setStudents(p => p.map(s => s.id===id ? {...s, debt:0} : s));
    showToast("✓ Marked as Paid Offline");
  };
  const handleNotify = id => {
    const s = students.find(s=>s.id===id);
    showToast(`📧 Notification sent to ${s.name}`);
  };

  let list = students.filter(s => {
    const q = search.toLowerCase();
    if (q && !s.name.toLowerCase().includes(q) && !s.email.toLowerCase().includes(q)) return false;
    if (filterBy==="critical" && s.debt/s.limit < 0.8) return false;
    if (filterBy==="safe"     && s.debt/s.limit >= 0.8) return false;
    if (filterBy==="cleared"  && s.debt > 0) return false;
    return true;
  });
  if (sortBy==="debt_high") list = [...list].sort((a,b)=>b.debt-a.debt);
  if (sortBy==="debt_low")  list = [...list].sort((a,b)=>a.debt-b.debt);
  if (sortBy==="name")      list = [...list].sort((a,b)=>a.name.localeCompare(b.name));

  return (
    <main style={{ flex:1, overflow:"auto", padding:"32px 32px", background:C.bg }}>

      {/* toolbar */}
      <div style={{ display:"flex", gap:16, marginBottom:32, alignItems:"center" }}>
        <div style={{ position:"relative", flex:1 }}>
          <div style={{ position:"absolute", left:16, top:"50%", transform:"translateY(-50%)" }}><SearchIcon /></div>
          <input
            placeholder="Search for Username"
            value={search}
            onChange={e=>setSearch(e.target.value)}
            style={{
              width:"100%", padding:"10px 16px 10px 44px",
              borderRadius:99, border:`1px solid ${C.border}`,
              background:C.white, fontSize:14, color:C.textPrim,
              outline:"none", boxSizing:"border-box", fontFamily:"inherit",
              boxShadow:"0 1px 4px rgba(15,32,53,0.06)",
            }}
            onFocus={e=>e.target.style.border=`1px solid ${C.gold}`}
            onBlur={e=>e.target.style.border=`1px solid ${C.border}`}
          />
        </div>

        <div style={{ display:"flex", gap:16, flexShrink:0 }}>
          <div style={{ position:"relative" }}>
            <button
              onClick={()=>{ setFilterOpen(v=>!v); setSortOpen(false); }}
              style={{ padding:"10px 24px", borderRadius:8, border:"none", background:C.gold, color:C.white, fontWeight:600, fontSize:14, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:8, minWidth:150, justifyContent:"space-between" }}
              onMouseEnter={e=>e.currentTarget.style.background=C.goldHover}
              onMouseLeave={e=>e.currentTarget.style.background=C.gold}
            >Filter by <DropIcon /></button>
            {filterOpen && (
              <div style={{ position:"absolute", top:"calc(100% + 6px)", right:0, zIndex:200, background:C.white, borderRadius:10, boxShadow:"0 8px 28px rgba(0,0,0,0.13)", border:`1px solid ${C.border}`, minWidth:190, overflow:"hidden" }}>
                {[["all","All"],["critical","Critical (≥80%)"],["safe","Safe (<80%)"],["cleared","Cleared"]].map(([v,l])=>(
                  <button key={v} onClick={()=>{ setFilterBy(v); setFilterOpen(false); }} style={{ display:"block", width:"100%", padding:"11px 16px", textAlign:"left", background:filterBy===v?"#f0f4ff":"none", border:"none", cursor:"pointer", fontSize:13, fontFamily:"inherit", fontWeight:filterBy===v?700:400, color:filterBy===v?C.navy:C.textPrim }}>{l}</button>
                ))}
              </div>
            )}
          </div>

          <div style={{ position:"relative" }}>
            <button
              onClick={()=>{ setSortOpen(v=>!v); setFilterOpen(false); }}
              style={{ padding:"10px 24px", borderRadius:8, border:"none", background:C.gold, color:C.white, fontWeight:600, fontSize:14, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:8, minWidth:150, justifyContent:"space-between" }}
              onMouseEnter={e=>e.currentTarget.style.background=C.goldHover}
              onMouseLeave={e=>e.currentTarget.style.background=C.gold}
            >Sort by <DropIcon /></button>
            {sortOpen && (
              <div style={{ position:"absolute", top:"calc(100% + 6px)", right:0, zIndex:200, background:C.white, borderRadius:10, boxShadow:"0 8px 28px rgba(0,0,0,0.13)", border:`1px solid ${C.border}`, minWidth:200, overflow:"hidden" }}>
                {[["default","Default"],["name","Name (A–Z)"],["debt_high","Debt: High → Low"],["debt_low","Debt: Low → High"]].map(([v,l])=>(
                  <button key={v} onClick={()=>{ setSortBy(v); setSortOpen(false); }} style={{ display:"block", width:"100%", padding:"11px 16px", textAlign:"left", background:sortBy===v?"#f0f4ff":"none", border:"none", cursor:"pointer", fontSize:13, fontFamily:"inherit", fontWeight:sortBy===v?700:400, color:sortBy===v?C.navy:C.textPrim }}>{l}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* cards */}
      <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
        {list.length === 0
          ? <p style={{ textAlign:"center", padding:60, color:C.textSub }}>No matching students found.</p>
          : list.map(s => (
              <DebtCard key={s.id} s={s} onPaidOffline={handlePaidOffline} onNotify={handleNotify} />
            ))
        }
      </div>

      {toast && <Toast msg={toast} onClose={()=>setToast(null)} />}

      {(filterOpen||sortOpen) && (
        <div onClick={()=>{ setFilterOpen(false); setSortOpen(false); }}
          style={{ position:"fixed", inset:0, zIndex:100 }}/>
      )}

      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        *{ box-sizing:border-box; }
        ::-webkit-scrollbar{ width:5px }
        ::-webkit-scrollbar-thumb{ background:#c8d3e0; border-radius:99px }
      `}</style>
    </main>
  );
}