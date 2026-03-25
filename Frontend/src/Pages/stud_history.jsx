import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { History, Search, ChevronDown, Filter, ArrowUpDown, ShoppingBag, Calendar, Clock } from 'lucide-react';
import { io } from 'socket.io-client';

const parseDateTime = (dateStr, timeStr) => {
  if (dateStr.toLowerCase().includes('today')) return new Date();
  if (dateStr.toLowerCase().includes('yesterday')) {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d;
  }
  
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return new Date(`${year}-${month}-${day} ${timeStr}`);
  }
  return new Date(); 
};

export default function StudHistory() {
  const [activeTab, setActiveTab] = useState('order'); 
  const [search, setSearch] = useState('');
  
  // Dropdown toggles
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  // States
  const [sortConfig, setSortConfig] = useState('default'); 
  const [filterStatus, setFilterStatus] = useState(''); 
  const [filterCanteen, setFilterCanteen] = useState(''); 

  const sortRef = useRef(null);
  const filterRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (sortRef.current && !sortRef.current.contains(event.target)) setSortOpen(false);
      if (filterRef.current && !filterRef.current.contains(event.target)) setFilterOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [historyData, setHistoryData] = useState({ orders: [], debts: [] });
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    try {
      const token = sessionStorage.getItem("token");
      
      const res = await axios.get("http://localhost:5000/api/orders/my-active-orders", {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.status === "success") {
        const allOrders = res.data.data;
        
        // Show accepted, rejected, and cancelled orders (exclude pending)
        const completedOrders = allOrders.filter(o =>
          o.status === 'accepted' || o.status === 'rejected' || o.status === 'cancelled'
        );

        const formattedOrders = [];
        const formattedDebts = [];

        completedOrders.forEach(order => {
          const dateObj = new Date(order.createdAt);
          
          const day = String(dateObj.getDate()).padStart(2, '0');
          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
          const year = dateObj.getFullYear();
          
          const timeStr = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

          const isDebtPayment = order.items && order.items.length > 0 && 
                               (order.items[0].name === 'Offline Debt Payment' || order.items[0].name === 'Online Debt Payment');

          const baseData = {
            id: order._id,
            canteen: order.canteen?.name || "Unknown Canteen",
            amount: order.totalAmount,
            date: `${day}-${month}-${year}`,
            time: timeStr,
            status: order.status.charAt(0).toUpperCase() + order.status.slice(1)
          };

          if (isDebtPayment) {
            formattedDebts.push(baseData);
          } else {
            const itemsStr = order.items && order.items.length > 0 
              ? order.items.map(i => `${i.name} x${i.quantity}`).join(', ') 
              : "Items";
            formattedOrders.push({ ...baseData, items: itemsStr });
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

  useEffect(() => {
    fetchHistory();

    // 🔌 SOCKET.IO: Live-refresh history when owner accepts/rejects/pays offline
    const userStr = sessionStorage.getItem('user') || localStorage.getItem('user');
    if (!userStr) return;
    try {
      const user = JSON.parse(userStr);
      const socket = io('http://localhost:5000');
      socket.on('connect', () => socket.emit('join-student', user._id));
      socket.on('debt-updated', () => fetchHistory());
      socket.on('orderStatusUpdated', () => fetchHistory());
      return () => socket.disconnect();
    } catch (e) {
      console.error("Socket err:", e);
    }
  }, []);

  const activeData = activeTab === 'order' ? historyData.orders : historyData.debts;
  const uniqueCanteens = [...new Set(activeData.map(item => item.canteen))];

  let list = activeData.filter(record => {
    const matchesSearch = 
      record.canteen.toLowerCase().includes(search.toLowerCase()) || 
      (record.items && record.items.toLowerCase().includes(search.toLowerCase()));
    
    const matchesStatus = (filterStatus === '' || activeTab === 'debt') ? true : record.status === filterStatus;
    const matchesCanteen = filterCanteen === '' ? true : record.canteen === filterCanteen;
    
    return matchesSearch && matchesStatus && matchesCanteen;
  });

  if (sortConfig !== 'default') {
    list = [...list].sort((a, b) => {
      if (sortConfig.includes('date')) {
        const dateA = parseDateTime(a.date, a.time);
        const dateB = parseDateTime(b.date, b.time);
        return sortConfig === 'date_desc' ? dateB - dateA : dateA - dateB;
      } else if (sortConfig.includes('amount')) {
        return sortConfig === 'amount_desc' ? b.amount - a.amount : a.amount - b.amount;
      }
      return 0;
    });
  }

  const getSortText = () => {
    if (sortConfig === 'date_desc') return "Recent (Newest First)";
    if (sortConfig === 'date_asc') return "Recent (Oldest First)";
    if (sortConfig === 'amount_desc') return "Amount: High → Low";
    if (sortConfig === 'amount_asc') return "Amount: Low → High";
    return "Sort by";
  };

  const getFilterText = () => {
    if (filterStatus || filterCanteen) return "Filtered";
    return "Filter by";
  };

  if (loading) return <div className="p-8 pb-32 min-h-screen"><p className="font-medium text-gray-500">Loading History...</p></div>;

  return (
    <div className="p-8 pb-32">
      
      {/* TOP ROW: Search & Filters */}
      <div className="flex justify-between items-center mb-8">
        
        {/* VIEW-MATCHING SEARCH BAR */}
        <div className="flex items-center bg-white px-4 py-2.5 rounded-full shadow-sm w-[500px] border border-gray-100 focus-within:border-[#ea580c] transition-colors">
          <Search className="w-5 h-5 text-gray-400 mr-2" />
          <input 
            type="text" 
            placeholder={activeTab === 'order' ? "Search Orders by Item/Canteen" : "Search Debts by Canteen"}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent outline-none w-full text-gray-700"
          />
        </div>

        {/* FILTERS AND SORT */}
        <div className="flex gap-4">
          <div className="relative" ref={filterRef}>
            <button onClick={() => { setFilterOpen(!filterOpen); setSortOpen(false); }} className="cursor-pointer bg-[#ea580c] hover:bg-orange-700 text-white font-semibold px-6 py-2.5 rounded-lg shadow-sm flex justify-center items-center gap-2 transition">
              {getFilterText()} <ChevronDown className="w-4 h-4" />
            </button>
            {filterOpen && (
              <div className="absolute right-0 mt-3 w-72 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden p-5">
                <h4 className="font-semibold text-gray-800 mb-4 border-b pb-2">Filter Options</h4>
                
                {activeTab === 'order' && (
                  <div className="mb-4">
                    <label className="text-xs text-gray-500 font-semibold mb-1.5 block uppercase">Status</label>
                    <select className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm outline-none bg-gray-50 focus:border-[#ea580c] transition-colors"
                            value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                      <option value="">All Statuses</option>
                      <option value="Accepted">Accepted</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                )}

                <div className="mb-5">
                  <label className="text-xs text-gray-500 font-semibold mb-1.5 block uppercase">Canteen Name</label>
                  <select className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm outline-none bg-gray-50 focus:border-[#ea580c] transition-colors"
                          value={filterCanteen} onChange={(e) => setFilterCanteen(e.target.value)}>
                    <option value="">All Canteens</option>
                    {uniqueCanteens.map((canteenName, i) => (
                      <option key={i} value={canteenName}>{canteenName}</option>
                    ))}
                  </select>
                </div>
                
                <button onClick={() => {setFilterStatus(''); setFilterCanteen('');}} className="cursor-pointer text-sm font-semibold text-white bg-gray-400 hover:bg-gray-500 py-2 rounded-md w-full text-center transition">Clear Filters</button>
              </div>
            )}
          </div>

          <div className="relative" ref={sortRef}>
            <button onClick={() => { setSortOpen(!sortOpen); setFilterOpen(false); }} className="cursor-pointer bg-[#ea580c] hover:bg-orange-700 text-white font-semibold px-6 py-2.5 rounded-lg shadow-sm flex justify-center items-center gap-2 transition">
              {getSortText()} <ChevronDown className="w-4 h-4" />
            </button>
            {sortOpen && (
              <div className="absolute right-0 mt-3 w-56 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden py-2">
                <div onClick={() => { setSortConfig('default'); setSortOpen(false); }} className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-gray-50 transition ${sortConfig === 'default' ? 'bg-orange-50 font-semibold text-[#ea580c]' : 'text-gray-700'}`}>Default</div>
                <div onClick={() => { setSortConfig('date_desc'); setSortOpen(false); }} className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-gray-50 transition ${sortConfig === 'date_desc' ? 'bg-orange-50 font-semibold text-[#ea580c]' : 'text-gray-700'}`}>Recent (Newest First)</div>
                <div onClick={() => { setSortConfig('date_asc'); setSortOpen(false); }} className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-gray-50 transition ${sortConfig === 'date_asc' ? 'bg-orange-50 font-semibold text-[#ea580c]' : 'text-gray-700'}`}>Recent (Oldest First)</div>
                <div className="border-t my-1 border-gray-50"></div>
                <div onClick={() => { setSortConfig('amount_desc'); setSortOpen(false); }} className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-gray-50 transition ${sortConfig === 'amount_desc' ? 'bg-orange-50 font-semibold text-[#ea580c]' : 'text-gray-700'}`}>Amount: High → Low</div>
                <div onClick={() => { setSortConfig('amount_asc'); setSortOpen(false); }} className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-gray-50 transition ${sortConfig === 'amount_asc' ? 'bg-orange-50 font-semibold text-[#ea580c]' : 'text-gray-700'}`}>Amount: Low → High</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* HEADER ROW WITH INTEGRATED TABS */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-semibold text-gray-900">History</h1>
        
        {/* TABS RIGHT NEXT TO HEADER */}
        <div className="flex bg-gray-100 border border-gray-200 rounded-xl p-1 shadow-inner relative z-10 w-[400px]">
          <button
            onClick={() => { setActiveTab('order'); }}
            className={`cursor-pointer flex-1 py-2 text-sm font-bold rounded-lg transition-all duration-300 ${
              activeTab === 'order' 
                ? 'bg-white text-gray-900 shadow-[0_1px_3px_rgba(0,0,0,0.1)]' 
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Order History
          </button>
          <button
            onClick={() => { setActiveTab('debt'); }}
            className={`cursor-pointer flex-1 py-2 text-sm font-bold rounded-lg transition-all duration-300 ${
              activeTab === 'debt' 
                ? 'bg-white text-gray-900 shadow-[0_1px_3px_rgba(0,0,0,0.1)]' 
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Transaction History
          </button>
        </div>
      </div>

      {/* DYNAMIC CARDS LIST */}
      <div className="flex flex-col gap-5 relative">
        {list.length === 0 ? (
           <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center flex flex-col items-center justify-center gap-3">
             <History className="w-12 h-12 text-gray-300 mb-2" />
             <p className="text-2xl font-semibold text-gray-800">No {activeTab === 'order' ? 'Orders' : 'Transactions'} Found</p>
             <p className="text-gray-500">Try adjusting your filters or search term.</p>
             {(search || filterStatus || filterCanteen || sortConfig !== 'default') && (
               <button onClick={() => { setSearch(''); setFilterStatus(''); setFilterCanteen(''); setSortConfig('default'); }} className="cursor-pointer mt-4 bg-[#ea580c] hover:bg-orange-700 text-white font-semibold px-6 py-2.5 rounded-lg transition text-sm">Clear Filters</button>
             )}
           </div>
        ) : (
          list.map((record) => (
            <div key={record.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition hover:shadow-md">
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-xl font-medium text-gray-900">{record.canteen}</h3>
                  {activeTab === 'order' && record.status && (
                    <span className={`px-2.5 py-0.5 text-[11px] font-bold rounded-md uppercase tracking-wider border ${
                      record.status === 'Accepted' 
                        ? 'bg-green-50 text-green-700 border-green-200' 
                        : 'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      {record.status}
                    </span>
                  )}
                  {activeTab === 'debt' && (
                    <span className="px-2.5 py-0.5 bg-green-50 text-green-700 text-[11px] font-bold rounded-md uppercase tracking-wider border border-green-200">
                      Payment Received
                    </span>
                  )}
                </div>
                
                {activeTab === 'order' ? (
                  <p className="text-sm text-gray-600 font-medium mt-3 bg-gray-50 px-3 py-2 rounded-lg inline-flex items-center border border-gray-100">
                    <ShoppingBag className="w-4 h-4 mr-2 text-gray-400" /> {record.items}
                  </p>
                ) : (
                  <p className="text-sm text-gray-500 font-medium mt-2">
                    Payment successfully processed to {record.canteen}
                  </p>
                )}
              </div>

              <div className="flex flex-col items-start md:items-end gap-2 w-full md:w-auto">
                <div className="text-[15px] font-medium text-gray-700">
                  {activeTab === 'order' ? 'Total:' : 'Amount Paid:'} <span className={`font-bold ${activeTab === 'debt' ? 'text-green-600' : 'text-blue-600'}`}>₹{record.amount}</span>
                </div>
                
                <div className="flex items-center gap-3 text-sm text-gray-500 mt-1 font-medium bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-lg">
                  <span className="flex items-center"><Calendar className="w-4 h-4 mr-1.5 text-gray-400"/> {record.date}</span>
                  <span className="text-gray-300">•</span>
                  <span className="flex items-center"><Clock className="w-4 h-4 mr-1.5 text-gray-400"/> {record.time}</span>
                </div>
              </div>

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