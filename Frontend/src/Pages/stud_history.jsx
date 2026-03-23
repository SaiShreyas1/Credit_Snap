import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { History, Search, ChevronDown, Filter, ArrowUpDown } from 'lucide-react';

// 🛡️ FIX 1: Bulletproof Date Parsing for Cross-Browser Sorting
const parseDateTime = (dateStr, timeStr) => {
  if (!dateStr) return new Date();
  if (dateStr.toLowerCase().includes('today')) return new Date();
  if (dateStr.toLowerCase().includes('yesterday')) {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d;
  }
  
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    // Standardizing the date structure prevents "Invalid Date" crashes
    return new Date(`${year}-${month}-${day} ${timeStr || ''}`);
  }
  return new Date(); 
};

export default function StudHistory() {
  const [activeTab, setActiveTab] = useState('order'); 
  const [searchTerm, setSearchTerm] = useState('');
  
  // Data States
  const [orderData, setOrderData] = useState([]);
  const [paymentData, setPaymentData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Dropdowns
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // States
  const [sortConfig, setSortConfig] = useState(''); 
  const [filterStatus, setFilterStatus] = useState(''); 
  const [filterCanteen, setFilterCanteen] = useState(''); 

  const sortRef = useRef(null);
  const filterRef = useRef(null);

  // FETCH DATA FROM BACKEND
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        const res = await axios.get('http://localhost:5000/api/orders/my-history', {
          headers: { Authorization: `Bearer ${token}` }
        });

        // 🛡️ FIX 2: Console Log to verify backend data is actually arriving!
        console.log("📥 Data from Backend:", res.data);

        if (res.data.status === 'success') {
          setOrderData(res.data.data.orders || []);
          setPaymentData(res.data.data.payments || []);
        }
      } catch (err) {
        console.error("❌ Failed to fetch history:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  // Handle outside clicks for dropdowns
  useEffect(() => {
    function handleClickOutside(event) {
      if (sortRef.current && !sortRef.current.contains(event.target)) setIsSortOpen(false);
      if (filterRef.current && !filterRef.current.contains(event.target)) setIsFilterOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeData = activeTab === 'order' ? orderData : paymentData;
  const uniqueCanteens = [...new Set(activeData.map(item => item.canteen))];

  // 🛡️ FIX 3: Defensive Filtering Logic to prevent invisible crashes
  let processedData = activeData.filter(record => {
    const safeSearch = searchTerm.toLowerCase();
    
    // Safely cast to string before attempting .toLowerCase()
    const matchesSearch = searchTerm === '' || 
      (record.canteen && String(record.canteen).toLowerCase().includes(safeSearch)) || 
      (record.items && String(record.items).toLowerCase().includes(safeSearch));
    
    const matchesStatus = (filterStatus === '' || activeTab === 'debt') 
      ? true 
      : (record.status && record.status.toLowerCase() === filterStatus.toLowerCase());
      
    const matchesCanteen = filterCanteen === '' ? true : record.canteen === filterCanteen;
    
    return matchesSearch && matchesStatus && matchesCanteen;
  });

  // Process sorting
  if (sortConfig) {
    processedData.sort((a, b) => {
      if (sortConfig.includes('date')) {
        const dateA = parseDateTime(a.date, a.time);
        const dateB = parseDateTime(b.date, b.time);
        return sortConfig === 'date_desc' ? dateB - dateA : dateA - dateB;
      } else if (sortConfig.includes('price')) {
        const priceA = Number(a.amount) || 0;
        const priceB = Number(b.amount) || 0;
        return sortConfig === 'price_desc' ? priceB - priceA : priceA - priceB;
      }
      return 0;
    });
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto bg-[#f8f9fa] min-h-screen">
      
      {/* Top Action Bar */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-5 relative z-20">
        
        <div className="flex items-center bg-white border border-gray-200 rounded-full px-5 h-11 w-full max-w-[450px] shadow-sm">
          <Search className="w-4 h-4 text-gray-400 mr-3" />
          <input 
            type="text" 
            placeholder="Search..." 
            className="w-full outline-none text-sm text-gray-600 bg-transparent placeholder-gray-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex gap-4 relative">
          
          {/* Filter Dropdown */}
          <div ref={filterRef}>
            <button 
              onClick={() => {setIsFilterOpen(!isFilterOpen); setIsSortOpen(false);}} 
              className="bg-[#f97316] text-white px-5 h-11 rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm hover:bg-[#ea580c] transition-colors cursor-pointer"
            >
               <Filter className="w-4 h-4" /> Filter by <ChevronDown className="w-4 h-4 ml-1" />
            </button>
            {isFilterOpen && (
              <div className="absolute top-14 right-32 w-64 bg-white border border-gray-100 shadow-xl rounded-2xl p-5 z-50">
                <h4 className="font-bold text-gray-800 mb-4 border-b border-gray-100 pb-2">Filter Options</h4>
                
                {activeTab === 'order' && (
                  <div className="mb-4">
                    <label className="text-xs text-gray-500 font-bold mb-2 block tracking-wide uppercase">Status</label>
                    <select className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none bg-gray-50 focus:border-orange-500 transition-colors"
                            value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                      <option value="">All Statuses</option>
                      <option value="Accepted">Accepted</option>
                      <option value="Pending">Pending</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                )}

                <div className="mb-5">
                  <label className="text-xs text-gray-500 font-bold mb-2 block tracking-wide uppercase">Canteen Name</label>
                  <select className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none bg-gray-50 focus:border-orange-500 transition-colors"
                          value={filterCanteen} onChange={(e) => setFilterCanteen(e.target.value)}>
                    <option value="">All Canteens</option>
                    {uniqueCanteens.map((canteenName, i) => (
                      <option key={i} value={canteenName}>{canteenName}</option>
                    ))}
                  </select>
                </div>
                
                <button onClick={() => {setFilterStatus(''); setFilterCanteen('');}} className="text-sm font-semibold text-orange-600 hover:text-orange-700 hover:underline w-full text-center cursor-pointer">Clear Filters</button>
              </div>
            )}
          </div>

          {/* Sort Dropdown */}
          <div ref={sortRef}>
            <button 
              onClick={() => {setIsSortOpen(!isSortOpen); setIsFilterOpen(false);}} 
              className="bg-[#f97316] text-white px-5 h-11 rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm hover:bg-[#ea580c] transition-colors cursor-pointer"
            >
              <ArrowUpDown className="w-4 h-4" /> Sort by <ChevronDown className="w-4 h-4 ml-1" />
            </button>
            {isSortOpen && (
              <div className="absolute top-14 right-0 w-52 bg-white border border-gray-100 shadow-xl rounded-2xl p-2 z-50 flex flex-col">
                <button onClick={() => setSortConfig('date_desc')} className={`text-left px-4 py-2.5 text-sm rounded-xl transition-colors cursor-pointer ${sortConfig === 'date_desc' ? 'bg-orange-50 font-bold text-orange-600' : 'text-gray-700 hover:bg-gray-50'}`}>Recent (Newest)</button>
                <button onClick={() => setSortConfig('date_asc')} className={`text-left px-4 py-2.5 text-sm rounded-xl transition-colors cursor-pointer ${sortConfig === 'date_asc' ? 'bg-orange-50 font-bold text-orange-600' : 'text-gray-700 hover:bg-gray-50'}`}>Recent (Oldest)</button>
                <div className="border-t my-1 border-gray-100"></div>
                <button onClick={() => setSortConfig('price_desc')} className={`text-left px-4 py-2.5 text-sm rounded-xl transition-colors cursor-pointer ${sortConfig === 'price_desc' ? 'bg-orange-50 font-bold text-orange-600' : 'text-gray-700 hover:bg-gray-50'}`}>Price (High to Low)</button>
                <button onClick={() => setSortConfig('price_asc')} className={`text-left px-4 py-2.5 text-sm rounded-xl transition-colors cursor-pointer ${sortConfig === 'price_asc' ? 'bg-orange-50 font-bold text-orange-600' : 'text-gray-700 hover:bg-gray-50'}`}>Price (Low to High)</button>
                <button onClick={() => setSortConfig('')} className="text-left px-4 py-2 text-xs font-semibold text-gray-400 hover:text-gray-600 mt-1 cursor-pointer">Clear Sort</button>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Tab Toggle */}
      <div className="flex bg-gray-200/50 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-1.5 mb-8 shadow-inner relative z-10">
        <button
          onClick={() => { setActiveTab('order'); setFilterStatus(''); }}

          className={`cursor-pointer flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 ${
            activeTab === 'order' 
              ? 'bg-[#ea580c] text-white shadow-md transform scale-[1.01]' 
              : 'text-gray-500 hover:text-gray-800 hover:bg-white/60'
          }`}
        >
          Order History
        </button>
        <button
          onClick={() => { setActiveTab('debt'); setFilterStatus(''); }}

          className={`cursor-pointer flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 ${
            activeTab === 'debt' 
              ? 'bg-[#ea580c] text-white shadow-md transform scale-[1.01]' 
              : 'text-gray-500 hover:text-gray-800 hover:bg-white/60'
          }`}
        >
          Debt History
        </button>
      </div>

      {/* History List */}
      <div className="space-y-4 relative z-0">
        {loading ? (
           <div className="bg-white p-12 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center min-h-[350px]">
             <p className="text-gray-500 font-medium animate-pulse">Loading your history...</p>
           </div>
        ) : processedData.length === 0 ? (
           <div className="bg-white p-12 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center min-h-[350px]">
             <div className="bg-gray-50 p-4 rounded-full mb-4">
               <History className="w-10 h-10 text-gray-400" />
             </div>
             <h2 className="text-xl font-bold text-gray-800 mb-2">No Transactions Found</h2>
             <p className="text-gray-500 text-sm font-medium">Try adjusting your filters or search term.</p>
           </div>
        ) : (
          processedData.map((record) => (
            <div key={record.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center hover:shadow-xl hover:border-orange-100 hover:-translate-y-1 transition-all duration-300 group min-h-[90px]">
              
              {/* Left Side: Items & Details */}
              <div className="flex flex-col items-start justify-center">
                <h3 className="text-base font-bold text-gray-800 mb-1.5 group-hover:text-orange-600 transition-colors">
                  {activeTab === 'order' ? record.items : record.canteen}
                </h3>
                <p className="text-xs font-medium text-gray-500">
                  {activeTab === 'order' ? <span className="text-gray-600">{record.canteen}, </span> : <span className="text-gray-400">Payment made on </span>}
                  {record.date}, {record.time}
                </p>
              </div>

              {/* Right Side: Status & Price */}
              <div className="flex flex-col items-end justify-center gap-2.5">
                
                {record.status && (
                  <span className={`px-3 py-1 rounded-md text-[11px] font-bold tracking-wider uppercase border ${
                    record.status === 'Accepted' || record.status === 'Completed'
                      ? 'bg-green-50 text-green-600 border-green-200' 
                      : record.status === 'Rejected'
                      ? 'bg-red-50 text-red-600 border-red-200'
                      : 'bg-orange-50 text-orange-600 border-orange-200'
                  }`}>
                    {record.status}
                  </span>
                )}
                
                <div className={`text-xs font-bold text-gray-400 ${!record.status && 'mt-1'}`}>
                  {activeTab === 'debt' ? 'Amount Paid: ' : 'Price: '} 
                  <span className={`${activeTab === 'debt' ? 'text-green-600' : 'text-blue-600'} text-lg ml-1`}>
                    ₹{record.amount}
                  </span>
                </div>
              </div>

            </div>
          ))
        )}
      </div>
    </div>
  );
}