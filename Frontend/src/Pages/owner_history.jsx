import { BASE_URL } from '../config';
import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { History, Search, ChevronDown, CheckCircle, ArrowUpDown, ShoppingBag, Calendar, Clock } from 'lucide-react';
import { io } from 'socket.io-client';

// Helper to convert DD-MM-YYYY and hh:mm AM/PM to a sortable JS Date object
const parseDateTime = (dateStr, timeStr) => {
  const [day, month, year] = dateStr.split('-');
  // Parse 12-hour time string manually to avoid cross-browser Date parsing issues
  const timeParts = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!timeParts) return new Date(`${year}-${month}-${day}`);
  let hours = parseInt(timeParts[1], 10);
  const minutes = parseInt(timeParts[2], 10);
  const period = timeParts[3].toUpperCase();
  if (period === 'AM' && hours === 12) hours = 0;
  if (period === 'PM' && hours !== 12) hours += 12;
  return new Date(year, month - 1, day, hours, minutes);
};

export default function OwnerHistory() {
  // Maintain view context switching between processed orders and debt transaction history
  const [activeTab, setActiveTab] = useState('order'); // 'order' or 'debt'
  const [search, setSearch] = useState('');

  // Dropdown toggles
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  // Sorting and Filtering States
  const [sortConfig, setSortConfig] = useState('date_desc');
  const [filterAmount, setFilterAmount] = useState({ min: '', max: '' });
  const [filterDate, setFilterDate] = useState({ start: '', end: '' });

  const [expandedRecords, setExpandedRecords] = useState(new Set());
  const toggleRecord = (id) => {
    setExpandedRecords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  // History data state
  const [historyData, setHistoryData] = useState({ orders: [], debts: [] });
  const [loading, setLoading] = useState(true);

  // Aggregate data from multiple endpoints mapping orders and resolving final debt values
  const fetchHistory = async () => {
    try {
      const token = sessionStorage.getItem("token");

      const [ordersRes, debtsRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/orders/my-orders`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${BASE_URL}/api/debts/active`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      const debtMap = {};
      if (debtsRes.data.status === "success") {
        debtsRes.data.data.forEach(d => {
          if (d.student && d.student._id) {
            debtMap[d.student._id.toString()] = d.amountOwed;
          }
        });
      }

      if (ordersRes.data.status === "success") {
        const completedOrders = ordersRes.data.data.filter(o => o.status === 'accepted');

        const formattedOrders = [];
        const formattedDebts = [];

        completedOrders.forEach(order => {
          const dateObj = new Date(order.createdAt);

          const day = String(dateObj.getDate()).padStart(2, '0');
          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
          const year = dateObj.getFullYear();

          const timeStr = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

          const isDebtPayment = order.items && order.items.length > 0 && order.items[0].name === 'Offline Debt Payment';
          const studentId = order.student?._id?.toString() || "";

          const baseData = {
            id: order._id,
            name: order.student?.name || "Unknown Student",
            phone: order.student?.phoneNo || "+91 XXXXXXXXXX",
            rollNo: order.student?.rollNo || "N/A",
            hall: order.student?.hallNo || "N/A",
            room: order.student?.roomNo || "N/A",
            amount: order.totalAmount,
            date: `${day}-${month}-${year}`,
            time: timeStr
          };

          // Handle specific assignment for Debt records
          if (isDebtPayment) {
            formattedDebts.push({
              ...baseData,
              remainingDebt: order.balanceSnapshot !== undefined && order.balanceSnapshot !== null 
                               ? order.balanceSnapshot 
                               : (debtMap[studentId] || 0),
              paymentType: 'Offline' // item name 'Offline Debt Payment' identifies this
            });
          } else if (order.items && order.items.length > 0 && order.items[0].name === 'Online Debt Payment') {
            formattedDebts.push({
              ...baseData,
              remainingDebt: order.balanceSnapshot !== undefined && order.balanceSnapshot !== null 
                               ? order.balanceSnapshot 
                               : (debtMap[studentId] || 0),
              paymentType: 'Online',
              transactionId: order.transactionId || null
            });
          } else {
            const itemsStr = order.items && order.items.length > 0
              ? order.items.map(i => `${i.name} x${i.quantity}`).join(', ')
              : "Items";
            formattedOrders.push({ ...baseData, itemsStr });
          }
        });

        setHistoryData({ orders: formattedOrders, debts: formattedDebts });
      }
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setLoading(false);
    }
  };

  // Subscribe to real-time socket events refreshing history organically when transactions occur
  useEffect(() => {
    fetchHistory();

    // 🔌 SOCKET.IO: Auto-refresh when new orders come in or debts are paid
    const canteenId = sessionStorage.getItem('canteenId');
    if (!canteenId) return;

    const socket = io(`${BASE_URL}`);
    socket.on('connect', () => socket.emit('join-canteen', canteenId));
    socket.on('newOrder', () => fetchHistory());
    socket.on('orderStatusUpdated', () => fetchHistory());
    socket.on('debt-updated', () => fetchHistory());

    return () => socket.disconnect();
  }, []);

  const activeData = activeTab === 'order' ? historyData.orders : historyData.debts;

  let list = activeData.filter(record => {
    const matchesSearch = record.name.toLowerCase().includes(search.toLowerCase());

    const amount = record.amount;
    const min = filterAmount.min === '' ? 0 : parseFloat(filterAmount.min);
    const max = filterAmount.max === '' ? Infinity : parseFloat(filterAmount.max);
    const matchesAmount = amount >= min && amount <= max;

    let matchesDate = true;
    if (filterDate.start || filterDate.end) {
      const recordDateObj = parseDateTime(record.date, '12:00 AM');
      if (filterDate.start) {
        matchesDate = matchesDate && recordDateObj >= new Date(filterDate.start);
      }
      if (filterDate.end) {
        matchesDate = matchesDate && recordDateObj <= new Date(filterDate.end);
      }
    }

    return matchesSearch && matchesAmount && matchesDate;
  });

  list = [...list].sort((a, b) => {
    if (sortConfig === 'date_desc' || sortConfig === 'date_asc') {
      const dateA = parseDateTime(a.date, a.time);
      const dateB = parseDateTime(b.date, b.time);
      return sortConfig === 'date_desc' ? dateB - dateA : dateA - dateB;
    } else if (sortConfig === 'amount_desc') {
      return b.amount - a.amount;
    } else if (sortConfig === 'amount_asc') {
      return a.amount - b.amount;
    }
    // fallback: newest first
    const dateA = parseDateTime(a.date, a.time);
    const dateB = parseDateTime(b.date, b.time);
    return dateB - dateA;
  });

  const getSortText = () => {
    if (sortConfig === 'date_desc') return "Newest First";
    if (sortConfig === 'date_asc') return "Oldest First";
    if (sortConfig === 'amount_desc') return "Amount: High → Low";
    if (sortConfig === 'amount_asc') return "Amount: Low → High";
    return "Sort by";
  };

  const getFilterText = () => {
    if (filterAmount.min || filterAmount.max || filterDate.start || filterDate.end) return "Filtered";
    return "Filter by";
  };

  if (loading) return <div className="p-8"><p className="font-medium text-gray-500">Loading History...</p></div>;

  return (
    <div className="p-8 pb-32">

      {/* TOP ROW: Search & Filters */}
      <div className="flex justify-between items-center mb-8">

        {/* SEARCH BAR EXACTLY LIKE ACTIVEDEBTS */}
        <div className="flex items-center bg-white px-4 py-2.5 rounded-full shadow-sm w-[500px] border border-gray-100 focus-within:border-[#eab308] transition-colors">
          <Search className="w-5 h-5 text-gray-400 mr-2" />
          <input
            type="text"
            placeholder={activeTab === 'order' ? "Search Orders by Name" : "Search Transactions by Name"}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent outline-none w-full text-gray-700"
          />
        </div>

        {/* FILTERS AND SORT EXACTLY LIKE ACTIVEDEBTS */}
        <div className="flex gap-4">
          <div className="relative">
            <button onClick={() => { setFilterOpen(!filterOpen); setSortOpen(false); }} className="cursor-pointer bg-[#eab308] hover:bg-yellow-500 text-[#1e293b] font-semibold px-6 py-2.5 rounded-lg shadow-sm flex justify-center items-center gap-2 transition">
              {getFilterText()} <ChevronDown className="w-4 h-4" />
            </button>
            {filterOpen && (
              <div className="absolute right-0 mt-3 w-72 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden p-5">
                <h4 className="font-semibold text-gray-800 mb-4 border-b pb-2">Filter Options</h4>

                <div className="mb-4">
                  <label className="text-xs text-gray-500 font-semibold mb-1.5 block">Amount Range (₹)</label>
                  <div className="flex gap-2">
                    <input type="number" placeholder="Min" className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm outline-none focus:border-[#eab308]"
                      value={filterAmount.min} onChange={(e) => setFilterAmount({ ...filterAmount, min: e.target.value })} />
                    <span className="text-gray-400 self-center">-</span>
                    <input type="number" placeholder="Max" className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm outline-none focus:border-[#eab308]"
                      value={filterAmount.max} onChange={(e) => setFilterAmount({ ...filterAmount, max: e.target.value })} />
                  </div>
                </div>

                <div className="mb-5">
                  <label className="text-xs text-gray-500 font-semibold mb-1.5 block">Date Range</label>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-sm"><span className="w-10 text-gray-500">From:</span> <input type="date" className="border border-gray-200 rounded-md px-2 py-1 flex-1 text-sm outline-none focus:border-[#eab308]" value={filterDate.start} onChange={(e) => setFilterDate({ ...filterDate, start: e.target.value })} /></div>
                    <div className="flex items-center gap-2 text-sm"><span className="w-10 text-gray-500">To:</span> <input type="date" className="border border-gray-200 rounded-md px-2 py-1 flex-1 text-sm outline-none focus:border-[#eab308]" value={filterDate.end} onChange={(e) => setFilterDate({ ...filterDate, end: e.target.value })} /></div>
                  </div>
                </div>

                <button onClick={() => { setFilterAmount({ min: '', max: '' }); setFilterDate({ start: '', end: '' }); }} className="cursor-pointer text-sm font-semibold text-[#1e293b] bg-gray-100 hover:bg-gray-200 py-2 rounded-md w-full text-center transition">Clear Filters</button>
              </div>
            )}
          </div>

          <div className="relative">
            <button onClick={() => { setSortOpen(!sortOpen); setFilterOpen(false); }} className="cursor-pointer bg-[#eab308] hover:bg-yellow-500 text-[#1e293b] font-semibold px-6 py-2.5 rounded-lg shadow-sm flex justify-center items-center gap-2 transition">
              {getSortText()} <ChevronDown className="w-4 h-4" />
            </button>
            {sortOpen && (
              <div className="absolute right-0 mt-3 w-56 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden py-2">
                <div onClick={() => { setSortConfig('date_desc'); setSortOpen(false); }} className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-gray-50 transition ${sortConfig === 'date_desc' ? 'bg-yellow-50 font-semibold text-[#1e293b]' : 'text-gray-700'}`}>Newest First</div>
                <div onClick={() => { setSortConfig('date_asc'); setSortOpen(false); }} className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-gray-50 transition ${sortConfig === 'date_asc' ? 'bg-yellow-50 font-semibold text-[#1e293b]' : 'text-gray-700'}`}>Oldest First</div>
                <div onClick={() => { setSortConfig('amount_desc'); setSortOpen(false); }} className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-gray-50 transition ${sortConfig === 'amount_desc' ? 'bg-yellow-50 font-semibold text-[#1e293b]' : 'text-gray-700'}`}>Amount: High → Low</div>
                <div onClick={() => { setSortConfig('amount_asc'); setSortOpen(false); }} className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-gray-50 transition ${sortConfig === 'amount_asc' ? 'bg-yellow-50 font-semibold text-[#1e293b]' : 'text-gray-700'}`}>Amount: Low → High</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* HEADER ROW EXACTLY LIKE ACTIVEDEBTS */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-semibold text-gray-900">History</h1>

        {/* TABS RIGHT NEXT TO HEADER OMEGA CLEAN */}
        <div className="flex bg-gray-100 border border-gray-200 rounded-xl p-1 shadow-inner relative z-10 w-[400px]">
          <button
            onClick={() => { setActiveTab('order'); }}
            className={`cursor-pointer flex-1 py-2 text-sm font-bold rounded-lg transition-all duration-300 ${activeTab === 'order'
                ? 'bg-white text-[#1e293b] shadow-[0_1px_3px_rgba(0,0,0,0.1)]'
                : 'text-gray-500 hover:text-gray-800'
              }`}
          >
            Order History
          </button>
          <button
            onClick={() => { setActiveTab('debt'); }}
            className={`cursor-pointer flex-1 py-2 text-sm font-bold rounded-lg transition-all duration-300 ${activeTab === 'debt'
                ? 'bg-white text-[#1e293b] shadow-[0_1px_3px_rgba(0,0,0,0.1)]'
                : 'text-gray-500 hover:text-gray-800'
              }`}
          >
            Transaction History
          </button>
        </div>
      </div>

      {/* DYNAMIC CARDS LIST EXACTLY LIKE ACTIVEDEBTS */}
      <div className="flex flex-col gap-5 relative">
        {list.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center flex flex-col items-center justify-center gap-3">
            <History className="w-12 h-12 text-gray-300 mb-2" />
            <p className="text-2xl font-semibold text-gray-800">No {activeTab === 'order' ? 'Orders' : 'Transactions'} Found</p>
            <p className="text-gray-500">Try adjusting your filters or search term.</p>
            {(search || filterAmount.min || filterAmount.max || filterDate.start || filterDate.end || sortConfig !== 'default') && (
              <button onClick={() => { setSearch(''); setFilterAmount({ min: '', max: '' }); setFilterDate({ start: '', end: '' }); setSortConfig('default'); }} className="cursor-pointer mt-4 bg-[#eab308] hover:bg-yellow-500 text-[#1e293b] font-semibold px-6 py-2.5 rounded-lg transition text-sm">Clear Filters</button>
            )}
          </div>
        ) : (
          list.map((record) => (
            <div key={record.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition hover:shadow-md">

              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-xl font-medium text-gray-900">{record.name}</h3>
                  {activeTab === 'debt' && (
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 bg-green-50 text-green-700 text-[11px] font-bold rounded-md uppercase tracking-wider border border-green-200">
                        Payment Received
                      </span>
                      {record.paymentType === 'Offline' && (
                        <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 text-[11px] font-bold rounded-md uppercase tracking-wider border border-slate-200">
                          Offline
                        </span>
                      )}
                      {record.paymentType === 'Online' && (
                        <span className="px-2.5 py-0.5 bg-blue-50 text-blue-600 text-[11px] font-bold rounded-md uppercase tracking-wider border border-blue-200">
                          Online
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  Ph no. {record.phone}, {record.rollNo}, Hall-{record.hall}, Room {record.room ? record.room.replace(/[-\s]/g, '') : "N/A"}
                </p>
                {activeTab === 'order' && (
                  <p className="text-sm text-gray-600 font-medium mt-3 bg-gray-50 px-3 py-2 rounded-lg inline-flex items-center border border-gray-100">
                    <ShoppingBag className="w-4 h-4 mr-2 text-gray-400" /> {record.itemsStr}
                  </p>
                )}
              </div>

              <div className="flex flex-col items-start md:items-end gap-2 w-full md:w-auto">
                <div className="text-[15px] font-medium text-gray-700">
                  {activeTab === 'order' ? 'Total:' : 'Paid Amount:'} <span className={`font-bold ${activeTab === 'debt' ? 'text-green-600' : 'text-[#1e293b]'}`}>₹{record.amount}</span>
                </div>

                {activeTab === 'debt' && (
                  <div className="text-sm font-medium text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                    Remaining Debt: <span className="font-bold text-red-500">₹{typeof record.remainingDebt === 'number' ? (Math.round(record.remainingDebt * 100) / 100) : record.remainingDebt}</span>
                  </div>
                )}

                <div className="flex items-center gap-3 text-sm text-gray-500 mt-1 font-medium bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-lg">
                  <span className="flex items-center"><Calendar className="w-4 h-4 mr-1.5 text-gray-400" /> {record.date}</span>
                  <span className="text-gray-300">•</span>
                  <span className="flex items-center"><Clock className="w-4 h-4 mr-1.5 text-gray-400" /> {record.time}</span>
                </div>
                
                {activeTab === 'debt' && record.paymentType === 'Online' && record.transactionId && (
                  <button onClick={() => toggleRecord(record.id)} className="mt-2 text-gray-500 hover:text-gray-700 transition flex items-center text-sm font-medium">
                    Transaction ID <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${expandedRecords.has(record.id) ? 'rotate-180' : ''}`} />
                  </button>
                )}
              </div>

              {/* Expandable Section */}
              {expandedRecords.has(record.id) && (
                <div className="mt-4 pt-4 border-t border-gray-100 w-full animate-in fade-in slide-in-from-top-2 transition-all basis-full">
                  <div className="bg-gray-50 rounded-lg p-3 flex justify-between items-center">
                     <span className="text-gray-500 text-sm font-medium">Razorpay Transaction ID</span>
                     <span className="font-mono text-sm text-gray-800 bg-white px-3 py-1.5 rounded shadow-sm border border-gray-200">{record.transactionId}</span>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {(filterOpen || sortOpen) && (
        <div onClick={() => { setFilterOpen(false); setSortOpen(false); }} className="fixed inset-0 z-40" />
      )}
    </div>
  );
}

