import { BASE_URL } from '../config';
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Search, ChevronDown, CheckCircle, BellRing, AlertTriangle, X, IndianRupee, Edit3 } from 'lucide-react';
import { io } from 'socket.io-client';

export default function ActiveDebtsContent() {
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [filterBy, setFilterBy] = useState("all");
  const [sortBy, setSortBy] = useState("default");

  // Setup primary states for filtering, sorting, debts tracking, and UI modals
  // 1. Swap hardcoded students for empty array & add loading state
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [payModal, setPayModal] = useState({ isOpen: false, student: null, amount: '' });
  const [limitModal, setLimitModal] = useState({ isOpen: false, student: null, newLimit: '' });
  const [defaultLimitModal, setDefaultLimitModal] = useState({ isOpen: false, newLimit: '' });
  const [notifyingIds, setNotifyingIds] = useState(new Set());

  // Async function to retrieve and map active debts from the backend database
  // 2. FETCH REAL DEBTS FROM BACKEND
  const fetchDebts = async () => {
    try {
      const token = sessionStorage.getItem("token");
      const res = await axios.get(`${BASE_URL}/api/debts/active`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.status === "success") {
        // Map backend keys to match your exact UI keys!
        const mappedDebts = res.data.data.map(d => ({
          id: d._id,
          name: d.student?.name || "Unknown Student",
          phone: d.student?.phoneNo || "+91 XXXXXXXXXX",
          hall: d.student?.hall || "N/A",
          email: d.student?.email || "N/A",
          debt: d.amountOwed,
          limit: d.limit || 3000 // 🔧 THE FIX: Pull custom limit directly from Debt record
        }));
        setStudents(mappedDebts);
      }
    } catch (err) {
      console.error("Error fetching debts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDebts();

    const canteenIdStr = sessionStorage.getItem('canteenId');
    if (!canteenIdStr) return;

    const socket = io(`${BASE_URL}`);

    socket.on('connect', () => {
      socket.emit('join-canteen', canteenIdStr);
    });

    socket.on('debt-updated', () => {
      fetchDebts();
    });

    socket.on('payment-received', (data) => {
      showToast(`💰 ${data.studentName} paid ₹${data.amount}!`, 'success');
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Trigger email notifications to students regarding their pending dues
  // 3. WIRE UP THE NOTIFY BUTTON
  const handleNotify = async (id) => {
    if (notifyingIds.has(id)) return; // Prevent double-clicks

    setNotifyingIds(prev => new Set(prev).add(id));

    try {
      const token = sessionStorage.getItem("token");
      await axios.post(`${BASE_URL}/api/debts/${id}/notify`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const s = students.find(s => s.id === id);
      showToast(`Notification email sent to ${s.name}`, 'success');
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to send notification.", "error");
    } finally {
      setNotifyingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const openPayModal = (student) => {
    setPayModal({ isOpen: true, student: student, amount: '' });
  };

  const closePayModal = () => {
    setPayModal({ isOpen: false, student: null, amount: '' });
  };

  // 4. WIRE UP THE PAY OFFLINE BUTTON
  const confirmPayment = async () => {
    const paymentAmount = parseFloat(payModal.amount);
    const targetStudent = payModal.student;

    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      showToast("Please enter a valid amount greater than 0.", "error");
      return;
    }
    if (paymentAmount > targetStudent.debt) {
      showToast(`Amount cannot exceed the total debt of ₹${targetStudent.debt}!`, "error");
      return;
    }

    try {
      const token = sessionStorage.getItem("token");
      await axios.post(
        `${BASE_URL}/api/debts/${targetStudent.id}/pay`,
        { amountPaid: paymentAmount },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      showToast(`₹${paymentAmount} paid offline for ${targetStudent.name}.`, 'success');
      fetchDebts();
      closePayModal();
    } catch (err) {
      showToast(err.response?.data?.message || "Payment failed", "error");
    }
  };

  // 5. WIRE UP CUSTOM DEBT LIMIT MODAL
  const openLimitModal = (student) => {
    setLimitModal({ isOpen: true, student: student, newLimit: student.limit });
  };

  const closeLimitModal = () => {
    setLimitModal({ isOpen: false, student: null, newLimit: '' });
  };

  const confirmLimitUpdate = async () => {
    const newLimitNum = parseFloat(limitModal.newLimit);
    const targetStudent = limitModal.student;

    if (isNaN(newLimitNum) || newLimitNum < 0) {
      showToast("Please enter a valid positive number.", "error");
      return;
    }

    try {
      const token = sessionStorage.getItem("token");
      await axios.patch(
        `${BASE_URL}/api/debts/${targetStudent.id}/limit`,
        { limit: newLimitNum },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      showToast(`Custom limit set to ₹${newLimitNum} for ${targetStudent.name}.`, 'success');
      fetchDebts();
      closeLimitModal();
    } catch (err) {
      showToast(err.response?.data?.message || "Updating limit failed.", "error");
    }
  };

  // 6. WIRE UP DEFAULT LIMIT MODAL (APPLIES TO ALL)
  const openDefaultLimitModal = () => {
    setDefaultLimitModal({ isOpen: true, newLimit: '' });
  };

  const closeDefaultLimitModal = () => {
    setDefaultLimitModal({ isOpen: false, newLimit: '' });
  };

  const confirmDefaultLimitUpdate = async () => {
    const newLimitNum = parseFloat(defaultLimitModal.newLimit);
    if (isNaN(newLimitNum) || newLimitNum < 0) {
      showToast("Please enter a valid positive number.", "error");
      return;
    }

    try {
      const token = sessionStorage.getItem("token");
      await axios.patch(
        `${BASE_URL}/api/canteens/my/default-limit`,
        { defaultLimit: newLimitNum },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      showToast(`Default limit updated to ₹${newLimitNum} globally.`, 'success');
      fetchDebts();
      closeDefaultLimitModal();
    } catch (err) {
      showToast(err.response?.data?.message || "Updating default limit failed.", "error");
    }
  };

  // --- DERIVED STATE (Filters & Sorting) ---
  let list = students.filter(s => {
    if (s.debt <= 0) return false;
    const q = search.toLowerCase();
    if (q && !s.name.toLowerCase().includes(q) && !s.email.toLowerCase().includes(q)) return false;
    if (filterBy === "critical" && s.debt / s.limit < 0.8) return false;
    if (filterBy === "safe" && s.debt / s.limit >= 0.8) return false;
    return true;
  });

  if (sortBy === "debt_high") list = [...list].sort((a, b) => b.debt - a.debt);
  if (sortBy === "debt_low") list = [...list].sort((a, b) => a.debt - b.debt);
  if (sortBy === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name));

  const hasAnyActiveDebts = students.some((student) => student.debt > 0);
  const hasFiltersApplied = Boolean(search || filterBy !== "all");

  let emptyStateTitle = "All debts cleared!";
  let emptyStateMessage = "There are no active debts matching your criteria right now.";
  let emptyStateIcon = <CheckCircle className="w-12 h-12 text-green-500 mb-2" />;

  if (hasAnyActiveDebts) {
    emptyStateTitle = filterBy === "critical"
      ? "No critical debts"
      : filterBy === "safe"
        ? "No safe debts"
        : "No matching debts found";
    emptyStateMessage = filterBy === "critical"
      ? "No students are currently at or above 80% of their debt limit."
      : filterBy === "safe"
        ? "No students are currently below 80% of their debt limit."
        : "Try adjusting your search or filter criteria.";
    emptyStateIcon = <AlertTriangle className="w-12 h-12 text-orange-400 mb-2" />;
  } else if (!hasFiltersApplied) {
    emptyStateMessage = "There are no active debts right now.";
  }

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

  if (loading) return <div className="p-8"><p>Loading Active Debts...</p></div>;

  return (
    <>
      {/* ========================================================= */}
      {/* OFFLINE PAYMENT MODAL */}
      {/* ========================================================= */}
      {payModal.isOpen && (
        <div className="fixed inset-0 bg-white/70 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-[450px] rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] sm:p-8">
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
      {/* CUSTOM LIMIT MODAL */}
      {/* ========================================================= */}
      {limitModal.isOpen && (
        <div className="fixed inset-0 bg-white/70 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-[450px] rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] sm:p-8">
            <X onClick={closeLimitModal} className="absolute top-5 right-5 w-5 h-5 text-gray-400 cursor-pointer hover:text-red-500 transition" />

            <h2 className="text-xl font-semibold text-gray-900 mb-2">Set Custom Debt Limit</h2>
            <p className="text-sm text-gray-500 mb-6">Changing credit limit for <strong className="text-gray-800">{limitModal.student?.name}</strong>.</p>

            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-2">New Maximum Limit</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <IndianRupee className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="number"
                  value={limitModal.newLimit}
                  onChange={(e) => setLimitModal({ ...limitModal, newLimit: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#eab308] focus:border-[#eab308] outline-none text-lg transition-colors"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={closeLimitModal} className="cursor-pointer px-5 py-2.5 rounded-lg font-medium text-gray-600 hover:bg-gray-100 transition"> Cancel </button>
              <button onClick={confirmLimitUpdate} className="cursor-pointer bg-[#eab308] hover:bg-yellow-500 text-[#1e293b] font-semibold px-6 py-2.5 rounded-lg transition shadow-sm flex items-center gap-2"> Save Limit </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SET DEFAULT LIMIT MODAL */}
      {/* ========================================================= */}
      {defaultLimitModal.isOpen && (
        <div className="fixed inset-0 bg-white/70 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-[450px] rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] sm:p-8">
            <X onClick={closeDefaultLimitModal} className="absolute top-5 right-5 w-5 h-5 text-gray-400 cursor-pointer hover:text-red-500 transition" />

            <h2 className="text-xl font-semibold text-gray-900 mb-2">Set Default Limit</h2>
            <p className="text-sm text-gray-500 mb-6">This limit will apply to <strong>all current students</strong> and any future debts at this canteen.</p>

            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-2">New Global Limit</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <IndianRupee className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="number"
                  value={defaultLimitModal.newLimit}
                  onChange={(e) => setDefaultLimitModal({ ...defaultLimitModal, newLimit: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#eab308] focus:border-[#eab308] outline-none text-lg transition-colors"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={closeDefaultLimitModal} className="cursor-pointer px-5 py-2.5 rounded-lg font-medium text-gray-600 hover:bg-gray-100 transition"> Cancel </button>
              <button onClick={confirmDefaultLimitUpdate} className="cursor-pointer bg-[#eab308] hover:bg-yellow-500 text-[#1e293b] font-semibold px-6 py-2.5 rounded-lg transition shadow-sm flex items-center gap-2"> Apply to All </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MAIN CONTENT PAGE */}
      {/* ========================================================= */}
      <div className="p-4 pb-32 sm:p-6 lg:p-8">

        {/* TOP ROW: Search & Filters */}
        <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex w-full items-center rounded-full border border-gray-100 bg-white px-4 py-2.5 shadow-sm transition-colors focus-within:border-[#eab308] xl:max-w-[500px]">
            <Search className="w-5 h-5 text-gray-400 mr-2" />
            <input
              type="text"
              placeholder="Search for Username or Email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent outline-none w-full text-gray-700"
            />
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4 xl:w-auto xl:flex-nowrap">
            <div className="relative">
              <button onClick={openDefaultLimitModal} className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-slate-800 px-6 py-2.5 font-semibold text-white shadow-sm transition hover:bg-slate-700 sm:min-w-[150px]">
                Set Default Limit
              </button>
            </div>

            <div className="relative">
              <button onClick={() => { setFilterOpen(!filterOpen); setSortOpen(false); }} className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg bg-[#eab308] px-6 py-2.5 font-semibold text-[#1e293b] shadow-sm transition hover:bg-yellow-500 sm:min-w-[150px]">
                {getFilterText()} <ChevronDown className="w-4 h-4" />
              </button>
              {filterOpen && (
                <div className="absolute left-0 right-0 z-50 mt-3 overflow-hidden rounded-lg border border-gray-100 bg-white shadow-xl sm:left-auto sm:right-0 sm:w-48">
                  <div onClick={() => { setFilterBy('all'); setFilterOpen(false); }} className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-gray-50 transition ${filterBy === 'all' ? 'bg-yellow-50 font-semibold text-[#1e293b]' : 'text-gray-700'}`}>All Active Debts</div>
                  <div onClick={() => { setFilterBy('critical'); setFilterOpen(false); }} className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-gray-50 transition ${filterBy === 'critical' ? 'bg-yellow-50 font-semibold text-[#1e293b]' : 'text-gray-700'}`}>Critical (≥80%)</div>
                  <div onClick={() => { setFilterBy('safe'); setFilterOpen(false); }} className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-gray-50 transition ${filterBy === 'safe' ? 'bg-yellow-50 font-semibold text-[#1e293b]' : 'text-gray-700'}`}>Safe (&lt;80%)</div>
                </div>
              )}
            </div>

            <div className="relative">
              <button onClick={() => { setSortOpen(!sortOpen); setFilterOpen(false); }} className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg bg-[#eab308] px-6 py-2.5 font-semibold text-[#1e293b] shadow-sm transition hover:bg-yellow-500 sm:min-w-[150px]">
                {getSortText()} <ChevronDown className="w-4 h-4" />
              </button>
              {sortOpen && (
                <div className="absolute left-0 right-0 z-50 mt-3 overflow-hidden rounded-lg border border-gray-100 bg-white shadow-xl sm:left-auto sm:right-0 sm:w-56">
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
              {emptyStateIcon}
              <p className="text-2xl font-semibold text-gray-800">{emptyStateTitle}</p>
              <p className="text-gray-500">{emptyStateMessage}</p>
              {search || filterBy !== 'all' ? (
                <button onClick={() => { setSearch(''); setFilterBy('all'); setSortBy('default'); }} className="cursor-pointer mt-4 bg-[#eab308] hover:bg-yellow-500 text-[#1e293b] font-semibold px-6 py-2.5 rounded-lg transition text-sm">Clear Filters</button>
              ) : null}
            </div>
          )}

          {list.map(s => {
            const isCritical = s.debt / s.limit >= 0.8;

            return (
              <div key={s.id} className={`flex flex-col gap-4 rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md sm:p-6 md:flex-row md:items-center md:justify-between ${isCritical ? 'border-red-200' : 'border-gray-100'}`}>

                <div>
                  <h3 className="text-xl font-medium text-gray-900 mb-1">{s.name}</h3>
                  <p className="text-sm text-gray-500">
                    Ph no. {s.phone}, {s.hall}, Mail: {s.email}
                  </p>
                </div>

                <div className="flex w-full flex-col items-start gap-3 md:w-auto md:items-end">
                  <div className="flex flex-wrap items-center gap-2 text-[15px] font-medium text-gray-700">
                    Total Debt: <span className={`font-bold ${isCritical ? 'text-red-600' : 'text-[#1e293b]'}`}>₹{s.debt.toLocaleString()}/{s.limit.toLocaleString()}</span>
                    <button onClick={() => openLimitModal(s)} className="p-1 hover:bg-gray-100 rounded-md transition text-gray-400 hover:text-yellow-600 cursor-pointer" title="Edit limit">
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex w-full flex-col gap-3 sm:flex-row">
                    {/* Opens the specific payment modal for this student */}
                    <button
                      onClick={() => openPayModal(s)}
                      className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full bg-[#eab308] px-5 py-2 text-sm font-semibold text-[#1e293b] shadow-sm transition-all duration-200 hover:scale-105 hover:bg-yellow-500 hover:shadow-md active:scale-95 sm:w-auto"
                    >
                      <IndianRupee className="w-4 h-4" /> Paid Offline
                    </button>
                    <button
                      onClick={() => handleNotify(s.id)}
                      disabled={notifyingIds.has(s.id)}
                      className={`flex w-full items-center justify-center gap-1.5 rounded-full px-5 py-2 text-sm font-semibold shadow-sm transition-all duration-200 sm:w-auto ${notifyingIds.has(s.id)
                          ? 'bg-slate-500 text-white cursor-wait opacity-80'
                          : 'cursor-pointer bg-[#1e293b] text-white hover:scale-105 hover:bg-slate-800 hover:shadow-md active:scale-95'
                        }`}
                    >
                      <BellRing className={`w-4 h-4 ${notifyingIds.has(s.id) ? 'animate-pulse' : ''}`} />
                      {notifyingIds.has(s.id) ? 'Sending...' : 'Notify Now'}
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>

        {/* TOAST */}
        {toast && (
          <div className="fixed bottom-4 left-4 right-4 z-50 animate-bounce sm:bottom-8 sm:left-auto sm:right-8">
            <div className={`flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl text-white font-medium ${toast.type === 'success' ? 'bg-green-600' : toast.type === 'error' ? 'bg-red-500' : 'bg-[#1e293b]'}`}>
              {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : toast.type === 'error' ? <AlertTriangle className="w-5 h-5 text-white" /> : <BellRing className="w-5 h-5 text-[#eab308]" />}
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
