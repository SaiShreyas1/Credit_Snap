import { BASE_URL } from '../config';
import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom'; 
import { History, Search, ChevronDown, ShoppingBag, Calendar, Clock } from 'lucide-react';
import { io } from 'socket.io-client';

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Converts formatted date/time strings back into standard Date objects.
 * This is strictly used so the sorting function can mathematically compare dates (e.g., Newest vs Oldest).
 */
const parseDateTime = (dateStr, timeStr) => {
  if (dateStr.toLowerCase().includes('today')) return new Date();
  if (dateStr.toLowerCase().includes('yesterday')) {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d;
  }

  // Parses the custom 'DD-MM-YYYY' format generated in fetchHistory
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return new Date(`${year}-${month}-${day} ${timeStr}`);
  }
  return new Date();
};


export default function StudHistory() {
  const location = useLocation();
  const navigate = useNavigate();

  // ==========================================
  // STATE MANAGEMENT
  // ==========================================

  // UI State: Controls which tab is visible. 
  // If the user clicked a notification to get here, it auto-selects that specific tab.
  const [activeTab, setActiveTab] = useState(location.state?.targetTab || 'order');
  
  // Search & Filter State
  const [search, setSearch] = useState('');
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState('default');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCanteen, setFilterCanteen] = useState('');
  
  // Data State
  const [historyData, setHistoryData] = useState({ orders: [], debts: [] });
  const [loading, setLoading] = useState(true);

  const [expandedRecords, setExpandedRecords] = useState(new Set());
  const toggleRecord = (id) => {
    setExpandedRecords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  // Refs for detecting clicks outside of dropdown menus
  const sortRef = useRef(null);
  const filterRef = useRef(null);

  // ==========================================
  // EFFECTS & LIFECYCLES
  // ==========================================

  // 1. Router State Cleanup
  // If we arrived via a notification (which sets location.state), we must clear that state.
  // Otherwise, if the user manually clicks another tab and then refreshes the page, 
  // they will be forced back to the notification's target tab.
  useEffect(() => {
    if (location.state?.targetTab) {
      setActiveTab(location.state.targetTab);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate]);

  // 2. Click Outside Listener for Dropdowns
  useEffect(() => {
    function handleClickOutside(event) {
      if (sortRef.current && !sortRef.current.contains(event.target)) setSortOpen(false);
      if (filterRef.current && !filterRef.current.contains(event.target)) setFilterOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ==========================================
  // DATA FETCHING & FORMATTING
  // ==========================================

  const fetchHistory = async () => {
    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      // We fetch ALL historical orders from the backend in one go
      const res = await axios.get(`${BASE_URL}/api/orders/my-active-orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.status === 'success') {
        const allOrders = res.data.data || [];

        const formattedOrders = [];
        const formattedDebts = [];

        // Loop through raw backend data and format it for the UI
        allOrders.forEach((order) => {
          // Format Date & Time strings
          const dateObj = new Date(order.createdAt);
          const day = String(dateObj.getDate()).padStart(2, '0');
          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
          const year = dateObj.getFullYear();
          const timeStr = dateObj.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          });

          // CORE LOGIC: Differentiate between a "Food Order" and a "Debt Payment"
          // The backend logs debt payments as a special type of order to maintain a ledger.
          const firstItemName = order.items?.[0]?.name || '';
          const isDebtPayment = firstItemName === 'Offline Debt Payment' || firstItemName === 'Online Debt Payment';

          // Base data shared by both food orders and debt transactions
          const baseData = {
            id: order._id,
            canteen: order.canteen?.name || 'Unknown Canteen',
            amount: order.totalAmount,
            date: `${day}-${month}-${year}`,
            time: timeStr,
            status: order.status,
            failureReason: order.failureReason || 'Verification failed.',
            transactionId: order.transactionId || null
          };

          // Route to the "Transactions" array
          if (isDebtPayment) {
            formattedDebts.push({
              ...baseData,
              paymentType: firstItemName === 'Offline Debt Payment' ? 'Offline' : 'Online'
            });
            return;
          }

          // Route to the "Orders" array (ignoring 'pending' orders as they belong on the Dashboard)
          if (!['accepted', 'rejected', 'cancelled'].includes(order.status)) {
            return;
          }

          formattedOrders.push({
            ...baseData,
            items: order.items?.map((item) => `${item.name} x${item.quantity}`).join(', ') || 'Items',
            status: order.status.charAt(0).toUpperCase() + order.status.slice(1)
          });
        });

        // Update state with the separated and formatted data
        setHistoryData({
          orders: formattedOrders,
          debts: formattedDebts
        });
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  // 3. Initial Load & Socket Listeners
  useEffect(() => {
    fetchHistory();

    const userStr = sessionStorage.getItem('user') || localStorage.getItem('user');
    if (!userStr) return undefined;

    try {
      const user = JSON.parse(userStr);
      const socket = io(`${BASE_URL}`);
      socket.on('connect', () => socket.emit('join-student', user._id));
      
      // Auto-refresh the history list if a background event occurs while the user is on this page
      socket.on('debt-updated', () => fetchHistory());
      socket.on('orderStatusUpdated', () => fetchHistory());
      
      return () => socket.disconnect();
    } catch (e) {
      console.error('Socket err:', e);
      return undefined;
    }
  }, []);


  // ==========================================
  // DERIVED STATE (FILTERING & SORTING)
  // ==========================================

  // Step 1: Determine which data set to process based on the active tab
  const activeData = activeTab === 'order' ? historyData.orders : historyData.debts;
  
  // Extract unique canteen names to populate the Canteen Filter dropdown dynamically
  const uniqueCanteens = [...new Set(activeData.map((item) => item.canteen))];

  // Step 2: Apply Filters
  let list = activeData.filter((record) => {
    // Check Search Text
    const matchesSearch =
      record.canteen.toLowerCase().includes(search.toLowerCase()) ||
      (record.items && record.items.toLowerCase().includes(search.toLowerCase()));

    // Check Status Filter (Debt transactions don't have a status, so we pass 'true' for them)
    const matchesStatus = (filterStatus === '' || activeTab === 'debt') ? true : record.status === filterStatus;
    
    // Check Canteen Filter
    const matchesCanteen = filterCanteen === '' ? true : record.canteen === filterCanteen;

    return matchesSearch && matchesStatus && matchesCanteen;
  });

  // Step 3: Apply Sorting (to the already filtered list)
  if (sortConfig !== 'default') {
    list = [...list].sort((a, b) => {
      if (sortConfig.includes('date')) {
        const dateA = parseDateTime(a.date, a.time);
        const dateB = parseDateTime(b.date, b.time);
        return sortConfig === 'date_desc' ? dateB - dateA : dateA - dateB;
      }
      if (sortConfig.includes('amount')) {
        return sortConfig === 'amount_desc' ? b.amount - a.amount : a.amount - b.amount;
      }
      return 0;
    });
  }

  // Helper functions for dynamic button text
  const getSortText = () => {
    if (sortConfig === 'date_desc') return 'Recent (Newest First)';
    if (sortConfig === 'date_asc') return 'Recent (Oldest First)';
    if (sortConfig === 'amount_desc') return 'Amount: High -> Low';
    if (sortConfig === 'amount_asc') return 'Amount: Low -> High';
    return 'Sort by';
  };

  const getFilterText = () => {
    if (filterStatus || filterCanteen) return 'Filtered';
    return 'Filter by';
  };


  // ==========================================
  // RENDER UI
  // ==========================================

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-5xl mx-auto bg-[#f8f9fa] min-h-screen">
        <div className="bg-white p-12 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center min-h-[350px]">
          <div className="bg-gray-50 p-4 rounded-full mb-4">
            <History className="w-10 h-10 text-gray-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Loading History...</h2>
          <p className="text-gray-500 text-sm font-medium">Fetching your latest transactions.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 pb-32">
      
      {/* --- TOP BAR: SEARCH & DROPDOWNS --- */}
      <div className="flex justify-between items-center mb-8">
        
        {/* Search Input */}
        <div className="flex items-center bg-white px-4 py-2.5 rounded-full shadow-sm w-[500px] border border-gray-100 focus-within:border-[#ea580c] transition-colors">
          <Search className="w-5 h-5 text-gray-400 mr-2" />
          <input
            type="text"
            placeholder={activeTab === 'order' ? 'Search Orders by Item/Canteen' : 'Search Debts by Canteen'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent outline-none w-full text-gray-700"
          />
        </div>

        <div className="flex gap-4">
          
          {/* Filter Dropdown Container */}
          <div className="relative" ref={filterRef}>
            <button onClick={() => { setFilterOpen(!filterOpen); setSortOpen(false); }} className="cursor-pointer bg-[#ea580c] hover:bg-orange-700 text-white font-semibold px-6 py-2.5 rounded-lg shadow-sm flex justify-center items-center gap-2 transition">
              {getFilterText()} <ChevronDown className="w-4 h-4" />
            </button>
            
            {filterOpen && (
              <div className="absolute right-0 mt-3 w-72 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden p-5">
                <h4 className="font-semibold text-gray-800 mb-4 border-b pb-2">Filter Options</h4>

                {/* Status Filter (Hidden on Debt Tab) */}
                {activeTab === 'order' && (
                  <div className="mb-4">
                    <label className="text-xs text-gray-500 font-semibold mb-1.5 block uppercase">Status</label>
                    <select className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm outline-none bg-gray-50 focus:border-[#ea580c] transition-colors" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                      <option value="">All Statuses</option>
                      <option value="Accepted">Accepted</option>
                      <option value="Rejected">Rejected</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                )}

                {/* Canteen Filter (Dynamically populated) */}
                <div className="mb-5">
                  <label className="text-xs text-gray-500 font-semibold mb-1.5 block uppercase">Canteen Name</label>
                  <select className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm outline-none bg-gray-50 focus:border-[#ea580c] transition-colors" value={filterCanteen} onChange={(e) => setFilterCanteen(e.target.value)}>
                    <option value="">All Canteens</option>
                    {uniqueCanteens.map((canteenName, i) => (
                      <option key={i} value={canteenName}>{canteenName}</option>
                    ))}
                  </select>
                </div>

                <button onClick={() => { setFilterStatus(''); setFilterCanteen(''); }} className="cursor-pointer text-sm font-semibold text-white bg-gray-400 hover:bg-gray-500 py-2 rounded-md w-full text-center transition">Clear Filters</button>
              </div>
            )}
          </div>

          {/* Sort Dropdown Container */}
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
                <div onClick={() => { setSortConfig('amount_desc'); setSortOpen(false); }} className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-gray-50 transition ${sortConfig === 'amount_desc' ? 'bg-orange-50 font-semibold text-[#ea580c]' : 'text-gray-700'}`}>Amount: High - Low</div>
                <div onClick={() => { setSortConfig('amount_asc'); setSortOpen(false); }} className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-gray-50 transition ${sortConfig === 'amount_asc' ? 'bg-orange-50 font-semibold text-[#ea580c]' : 'text-gray-700'}`}>Amount: Low - High</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- PAGE HEADER & TAB NAVIGATION --- */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-semibold text-gray-900">History</h1>

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

      {/* --- LIST RENDERING --- */}
      <div className="flex flex-col gap-5 relative">
        
        {/* Empty State */}
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
          
          /* Data List */
          list.map((record) => (
            <div key={record.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col transition hover:shadow-md">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-xl font-medium text-gray-900">{record.canteen}</h3>
                    
                    {/* Status Badges */}
                    {activeTab === 'order' && record.status && (
                      <span className={`px-2.5 py-0.5 text-[11px] font-bold rounded-md uppercase tracking-wider border ${
                        record.status === 'Accepted'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : record.status === 'Cancelled'
                            ? 'bg-gray-100 text-gray-700 border-gray-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {record.status}
                      </span>
                    )}
                    {activeTab === 'debt' && (
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 text-[11px] font-bold rounded-md uppercase tracking-wider border ${
                          record.status === 'rejected'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-green-50 text-green-700 border-green-200'
                        }`}>
                          {record.status === 'rejected' ? 'Payment Rejected' : 'Payment Received'}
                        </span>
                        {record.status !== 'rejected' && record.paymentType === 'Offline' && (
                          <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 text-[11px] font-bold rounded-md uppercase tracking-wider border border-slate-200">
                            Offline
                          </span>
                        )}
                        {record.status !== 'rejected' && record.paymentType === 'Online' && (
                          <span className="px-2.5 py-0.5 bg-blue-50 text-blue-600 text-[11px] font-bold rounded-md uppercase tracking-wider border border-blue-200">
                            Online
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Sub-text (Items ordered OR Payment confirmation) */}
                  {activeTab === 'order' ? (
                    <p className="text-sm text-gray-600 font-medium mt-3 bg-gray-50 px-3 py-2 rounded-lg inline-flex items-center border border-gray-100">
                      <ShoppingBag className="w-4 h-4 mr-2 text-gray-400" /> {record.items}
                    </p>
                  ) : (
                    <p className={`text-sm font-medium mt-2 ${record.status === 'rejected' ? 'text-red-500' : 'text-gray-500'}`}>
                      {record.status === 'rejected'
                        ? `Transaction aborted: ${record.failureReason}`
                        : `Payment successfully processed to ${record.canteen}`}
                    </p>
                  )}
                </div>

                {/* Amount and Timestamp */}
                <div className="flex flex-col items-start md:items-end gap-2 w-full md:w-auto">
                  <div className="text-[15px] font-medium text-gray-700">
                    {activeTab === 'order' ? 'Total:' : (record.status === 'rejected' ? 'Amount Rejected:' : 'Amount Paid:')} <span className={`font-bold ${
                      activeTab === 'debt'
                        ? (record.status === 'rejected' ? 'text-red-600' : 'text-green-600')
                        : 'text-blue-600'
                    }`}>₹{record.amount}</span>
                  </div>

                  <div className="flex items-center gap-3 text-sm text-gray-500 mt-1 font-medium bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-lg">
                    <span className="flex items-center"><Calendar className="w-4 h-4 mr-1.5 text-gray-400" /> {record.date}</span>
                    <span className="text-gray-300">•</span>
                    <span className="flex items-center"><Clock className="w-4 h-4 mr-1.5 text-gray-400" /> {record.time}</span>
                  </div>
                  
                  {activeTab === 'debt' && record.paymentType === 'Online' && record.status !== 'rejected' && record.transactionId && (
                    <button onClick={() => toggleRecord(record.id)} className="mt-2 text-gray-500 hover:text-gray-700 transition flex items-center text-sm font-medium">
                      Transaction ID <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${expandedRecords.has(record.id) ? 'rotate-180' : ''}`} />
                    </button>
                  )}
                </div>
              </div>
              
              {/* Expandable Section */}
              {expandedRecords.has(record.id) && (
                <div className="mt-4 pt-4 border-t border-gray-100 w-full animate-in fade-in slide-in-from-top-2 transition-all">
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

      {/* Transparent overlay to close dropdowns if user clicks outside of them but inside the main container */}
      {(filterOpen || sortOpen) && (
        <div onClick={() => { setFilterOpen(false); setSortOpen(false); }} className="fixed inset-0 z-40" />
      )}
    </div>
  );
}