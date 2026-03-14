import React, { useState } from "react";
import { Search, ChevronDown, CheckCircle, BellRing, AlertTriangle, X, IndianRupee } from 'lucide-react';

const STUDENTS = [
  { id: 1, name: "Sai Shreyas",   phone: "+91xxxxxxxxxx", hall: "Hall 12 A513", email: "kshreyas@iitk.ac.in",      debt: 2000, limit: 3000 },
  { id: 2, name: "Tejas",         phone: "+91xxxxxxxxxx", hall: "Hall 3 B116",  email: "tejas@iitk.ac.in",         debt: 1000, limit: 2000 },
  { id: 3, name: "Sai Chaitanya", phone: "+91xxxxxxxxxx", hall: "Hall 3 B116",  email: "chaitanya@iitk.ac.in",     debt: 2200, limit: 3000 },
  { id: 4, name: "Lekha Harsha",  phone: "+91xxxxxxxxxx", hall: "Hall 3 F116",  email: "harsha@iitk.ac.in",        debt: 4500, limit: 5000 },
  { id: 5, name: "Haneesh",       phone: "+91xxxxxxxxxx", hall: "Hall 3 A212",  email: "haneesh@reddy.iitk.ac.in", debt: 2000, limit: 3000 },
  { id: 6, name: "Ram Charan",    phone: "+91xxxxxxxxxx", hall: "Hall 3 E147",  email: "ramcharan@iitk.ac.in",     debt: 3000, limit: 5000 },
];

export default function ActiveDebtsContent() {
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [filterBy, setFilterBy] = useState("all");
  const [sortBy, setSortBy] = useState("default");
  const [students, setStudents] = useState(STUDENTS);
  const [toast, setToast] = useState(null);

  // --- NEW: Payment Modal State ---
  const [payModal, setPayModal] = useState({ isOpen: false, student: null, amount: '' });

  const showToast = (msg, type = 'success') => { 
    setToast({ msg, type }); 
    setTimeout(() => setToast(null), 3000); 
  };

  const handleNotify = (id) => {
    const s = students.find(s => s.id === id);
    showToast(`Notification sent to ${s.name}`, 'info');
  };

  // --- NEW: Payment Handlers ---
  const openPayModal = (student) => {
    setPayModal({ isOpen: true, student: student, amount: '' });
  };

  const closePayModal = () => {
    setPayModal({ isOpen: false, student: null, amount: '' });
  };

  const confirmPayment = () => {
    const paymentAmount = parseFloat(payModal.amount);
    const targetStudent = payModal.student;

    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      alert("Please enter a valid amount greater than 0.");
      return;
    }

    if (paymentAmount > targetStudent.debt) {
      alert(`Amount cannot exceed the total debt of ₹${targetStudent.debt}!`);
      return;
    }

    const newDebt = targetStudent.debt - paymentAmount;

    if (newDebt === 0) {
      // If debt is 0, completely REMOVE the student from the active list
      setStudents(prev => prev.filter(s => s.id !== targetStudent.id));
      showToast(`${targetStudent.name} has cleared all their debts!`, 'success');
    } else {
      // Otherwise, just update their remaining debt
      setStudents(prev => prev.map(s => s.id === targetStudent.id ? { ...s, debt: newDebt } : s));
      showToast(`₹${paymentAmount} paid offline for ${targetStudent.name}.`, 'success');
    }

    closePayModal();
  };

  // --- DERIVED STATE (Filters & Sorting) ---
  let list = students.filter(s => {
    // Automatically hide anyone who somehow has 0 debt
    if (s.debt <= 0) return false; 

    const q = search.toLowerCase();
    if (q && !s.name.toLowerCase().includes(q) && !s.email.toLowerCase().includes(q)) return false;
    if (filterBy === "critical" && s.debt / s.limit < 0.8) return false;
    if (filterBy === "safe"     && s.debt / s.limit >= 0.8) return false;
    return true;
  });
  
  if (sortBy === "debt_high") list = [...list].sort((a, b) => b.debt - a.debt);
  if (sortBy === "debt_low")  list = [...list].sort((a, b) => a.debt - b.debt);
  if (sortBy === "name")      list = [...list].sort((a, b) => a.name.localeCompare(b.name));

  const getFilterText = () => {
    if (filterBy === 'critical') return "Critical (≥80%)";
    if (filterBy === 'safe') return "Safe (<80%)";
    return "Filter by";
  };

  const getSortText = () => {
    if (sortBy === 'name') return "Name (A-Z)";
    if (sortBy === 'debt_high') return "Debt: High → Low";
    if (sortBy === 'debt_low') return "Debt: Low → High";
    return "Sort by";
  };

  return (
    <>
      {/* ========================================================= */}
      {/* OFFLINE PAYMENT MODAL */}
      {/* ========================================================= */}
      {payModal.isOpen && (
        <div className="fixed inset-0 bg-white/70 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] w-[450px] p-8 relative border border-gray-100">
            <X onClick={closePayModal} className="absolute top-5 right-5 w-5 h-5 text-gray-400 cursor-pointer hover:text-red-500 transition" />
            
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Log Offline Payment</h2>
            <p className="text-sm text-gray-500 mb-6">Recording payment for <strong className="text-gray-800">{payModal.student?.name}</strong>.</p>
            
            <div className="bg-gray-50 rounded-xl p-4 mb-6 flex justify-between items-center border border-gray-100">
              <span className="text-gray-600 font-medium">Current Debt:</span>
              <span className="text-xl font-bold text-red-600">₹{payModal.student?.debt}</span>
            </div>

            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-2">Amount Paid Offline</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <IndianRupee className="h-5 w-5 text-gray-400" />
                </div>
                <input 
                  type="number" 
                  value={payModal.amount} 
                  onChange={(e) => setPayModal({ ...payModal, amount: e.target.value })} 
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#eab308] focus:border-[#eab308] outline-none text-lg transition-colors" 
                  placeholder="e.g. 500" 
                  autoFocus
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={closePayModal} className="cursor-pointer px-5 py-2.5 rounded-lg font-medium text-gray-600 hover:bg-gray-100 transition">
                Cancel
              </button>
              <button onClick={confirmPayment} className="cursor-pointer bg-[#eab308] hover:bg-yellow-500 text-[#1e293b] font-semibold px-6 py-2.5 rounded-lg transition shadow-sm flex items-center gap-2">
                <CheckCircle className="w-5 h-5" /> Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ========================================================= */}
      {/* MAIN CONTENT PAGE */}
      {/* ========================================================= */}
      <div className="p-8 pb-32">
        
        {/* TOP ROW: Search & Filters */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center bg-white px-4 py-2.5 rounded-full shadow-sm w-[500px] border border-gray-100 focus-within:border-[#eab308] transition-colors">
            <Search className="w-5 h-5 text-gray-400 mr-2" />
            <input 
              type="text" 
              placeholder="Search for Username or Email" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent outline-none w-full text-gray-700"
            />
          </div>

          <div className="flex gap-4">
            <div className="relative">
              <button onClick={() => { setFilterOpen(!filterOpen); setSortOpen(false); }} className="cursor-pointer bg-[#eab308] hover:bg-yellow-500 text-[#1e293b] font-semibold px-6 py-2.5 rounded-lg shadow-sm flex items-center gap-2 transition min-w-[150px] justify-between">
                {getFilterText()} <ChevronDown className="w-4 h-4" />
              </button>
              {filterOpen && (
                <div className="absolute right-0 mt-3 w-48 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden">
                  <div onClick={() => { setFilterBy('all'); setFilterOpen(false); }} className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-gray-50 transition ${filterBy === 'all' ? 'bg-yellow-50 font-semibold text-[#1e293b]' : 'text-gray-700'}`}>All Active Debts</div>
                  <div onClick={() => { setFilterBy('critical'); setFilterOpen(false); }} className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-gray-50 transition ${filterBy === 'critical' ? 'bg-yellow-50 font-semibold text-[#1e293b]' : 'text-gray-700'}`}>Critical (≥80%)</div>
                  <div onClick={() => { setFilterBy('safe'); setFilterOpen(false); }} className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-gray-50 transition ${filterBy === 'safe' ? 'bg-yellow-50 font-semibold text-[#1e293b]' : 'text-gray-700'}`}>Safe (&lt;80%)</div>
                </div>
              )}
            </div>

            <div className="relative">
              <button onClick={() => { setSortOpen(!sortOpen); setFilterOpen(false); }} className="cursor-pointer bg-[#eab308] hover:bg-yellow-500 text-[#1e293b] font-semibold px-6 py-2.5 rounded-lg shadow-sm flex items-center gap-2 transition min-w-[150px] justify-between">
                {getSortText()} <ChevronDown className="w-4 h-4" />
              </button>
              {sortOpen && (
                <div className="absolute right-0 mt-3 w-56 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden">
                  <div onClick={() => { setSortBy('default'); setSortOpen(false); }} className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-gray-50 transition ${sortBy === 'default' ? 'bg-yellow-50 font-semibold text-[#1e293b]' : 'text-gray-700'}`}>Default</div>
                  <div onClick={() => { setSortBy('name'); setSortOpen(false); }} className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-gray-50 transition ${sortBy === 'name' ? 'bg-yellow-50 font-semibold text-[#1e293b]' : 'text-gray-700'}`}>Name (A-Z)</div>
                  <div onClick={() => { setSortBy('debt_high'); setSortOpen(false); }} className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-gray-50 transition ${sortBy === 'debt_high' ? 'bg-yellow-50 font-semibold text-[#1e293b]' : 'text-gray-700'}`}>Debt: High → Low</div>
                  <div onClick={() => { setSortBy('debt_low'); setSortOpen(false); }} className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-gray-50 transition ${sortBy === 'debt_low' ? 'bg-yellow-50 font-semibold text-[#1e293b]' : 'text-gray-700'}`}>Debt: Low → High</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* HEADER ROW */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-semibold text-gray-900">Active Debts</h1>
        </div>

        {/* DYNAMIC CARDS LIST */}
        <div className="flex flex-col gap-5 relative">
          
          {list.length === 0 && (
            <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center flex flex-col items-center justify-center gap-3">
              <CheckCircle className="w-12 h-12 text-green-500 mb-2" />
              <p className="text-2xl font-semibold text-gray-800">All debts cleared!</p>
              <p className="text-gray-500">There are no active debts matching your criteria right now.</p>
              {search || filterBy !== 'all' ? (
                <button onClick={() => { setSearch(''); setFilterBy('all'); setSortBy('default'); }} className="cursor-pointer mt-4 bg-[#eab308] hover:bg-yellow-500 text-[#1e293b] font-semibold px-6 py-2.5 rounded-lg transition text-sm">Clear Filters</button>
              ) : null}
            </div>
          )}

          {list.map(s => {
            const isCritical = s.debt / s.limit >= 0.8;
            
            return (
              <div key={s.id} className={`bg-white rounded-2xl p-6 shadow-sm border ${isCritical ? 'border-red-200' : 'border-gray-100'} flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition hover:shadow-md`}>
                
                <div>
                  <h3 className="text-xl font-medium text-gray-900 mb-1">{s.name}</h3>
                  <p className="text-sm text-gray-500">
                    Ph no. {s.phone}, {s.hall}, Mail: {s.email}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-3 w-full md:w-auto">
                  <div className="text-[15px] font-medium text-gray-700">
                    Total Debt: <span className={`font-bold ${isCritical ? 'text-red-600' : 'text-[#1e293b]'}`}>₹{s.debt.toLocaleString()}/{s.limit.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex gap-3">
                    {/* Opens the specific payment modal for this student */}
                    <button 
                      onClick={() => openPayModal(s)} 
                      className="cursor-pointer font-semibold px-5 py-2 rounded-full transition text-sm flex items-center gap-1.5 bg-[#eab308] hover:bg-yellow-500 text-[#1e293b]"
                    >
                      <IndianRupee className="w-4 h-4" /> Paid Offline
                    </button>
                    <button 
                      onClick={() => handleNotify(s.id)} 
                      className="cursor-pointer font-semibold px-5 py-2 rounded-full transition text-sm flex items-center gap-1.5 bg-[#1e293b] hover:bg-slate-800 text-white"
                    >
                      <BellRing className="w-4 h-4" /> Notify Now
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>

        {/* TOAST */}
        {toast && (
          <div className="fixed bottom-8 right-8 z-50 animate-bounce">
            <div className={`flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl text-white font-medium ${toast.type === 'success' ? 'bg-green-600' : 'bg-[#1e293b]'}`}>
              {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <BellRing className="w-5 h-5 text-[#eab308]" />}
              {toast.msg}
              <button onClick={() => setToast(null)} className="ml-4 text-white/70 hover:text-white transition cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {(filterOpen || sortOpen) && (
          <div onClick={() => { setFilterOpen(false); setSortOpen(false); }} className="fixed inset-0 z-40" />
        )}

      </div>
    </>
  );
}