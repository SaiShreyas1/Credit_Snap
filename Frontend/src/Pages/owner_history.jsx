import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { History, Search, ChevronDown, Filter, ArrowUpDown } from 'lucide-react';

// Helper to convert DD-MM-YYYY HH:MM PM to a sortable JS Date object
const parseDateTime = (dateStr, timeStr) => {
  const [day, month, year] = dateStr.split('-');
  return new Date(`${year}-${month}-${day} ${timeStr}`);
};

export default function OwnerHistory() {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dropdown toggles
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Sorting and Filtering States
  const [sortConfig, setSortConfig] = useState(''); 
  const [filterAmount, setFilterAmount] = useState({ min: '', max: '' });
  const [filterDate, setFilterDate] = useState({ start: '', end: '' });

  // 1. Hook up the history data state
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Refs for clicking outside to close dropdowns
  const sortRef = useRef(null);
  const filterRef = useRef(null);

  // 2. Fetch completed orders / offline payments
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const token = sessionStorage.getItem("token");
        const res = await axios.get("http://localhost:5000/api/orders/my-orders", {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.data.status === "success") {
          // Filter to only show Accepted orders (which includes offline payments!)
          const completedOrders = res.data.data.filter(o => o.status === 'accepted');

          // Map it perfectly to fit your UI's logic
          const formattedHistory = completedOrders.map(order => {
            const dateObj = new Date(order.createdAt);
            
            // Format to DD-MM-YYYY
            const day = String(dateObj.getDate()).padStart(2, '0');
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const year = dateObj.getFullYear();
            
            // Format to hh:mm A
            const timeStr = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

            return {
              id: order._id,
              name: order.student?.name || "Unknown Student",
              phone: order.student?.phone || "+91 XXXXXXXXXX",
              amount: order.totalAmount,
              date: `${day}-${month}-${year}`, // Matches your parseDateTime logic!
              time: timeStr
            };
          });

          setHistoryData(formattedHistory);
        }
      } catch (err) {
        console.error("Failed to load history:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (sortRef.current && !sortRef.current.contains(event.target)) setIsSortOpen(false);
      if (filterRef.current && !filterRef.current.contains(event.target)) setIsFilterOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Apply Filters & Search
  let processedData = historyData.filter(record => {
    const matchesSearch = record.name.toLowerCase().includes(searchTerm.toLowerCase());
    
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

  // Apply Sorting
  if (sortConfig) {
    processedData.sort((a, b) => {
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

  if (loading) return <div className="p-8"><p>Loading History...</p></div>;

  return (
    <div className="p-8">
      {/* Action Bar: Search & Filters */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        
        <div className="flex items-center bg-white border border-[#D9D9D9] rounded-full px-5 py-2.5 flex-1 max-w-lg shadow-sm focus-within:border-[#eab308] transition-colors">
          <Search className="w-5 h-5 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search for Transaction by Name" 
            className="ml-3 w-full outline-none text-gray-700 bg-transparent placeholder-gray-400 font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex gap-4 relative">
          
          {/* FILTER DROPDOWN */}
          <div ref={filterRef}>
            <button onClick={() => {setIsFilterOpen(!isFilterOpen); setIsSortOpen(false);}} className="cursor-pointer bg-[#eab308] hover:bg-yellow-500 text-[#1e293b] px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm transition">
              <Filter className="w-4 h-4 text-[#1e293b]" /> Filter by
            </button>
            {isFilterOpen && (
              <div className="absolute top-12 right-32 w-72 bg-white border border-gray-200 shadow-xl rounded-xl p-4 z-50">
                <h4 className="font-semibold text-gray-800 mb-3 border-b pb-2">Filter Options</h4>
                
                <div className="mb-4">
                  <label className="text-xs text-gray-500 font-semibold mb-1 block">Amount Range (₹)</label>
                  <div className="flex gap-2">
                    <input type="number" placeholder="Min" className="w-full border rounded px-2 py-1 text-sm outline-none" 
                           value={filterAmount.min} onChange={(e)=>setFilterAmount({...filterAmount, min: e.target.value})} />
                    <span className="text-gray-400">-</span>
                    <input type="number" placeholder="Max" className="w-full border rounded px-2 py-1 text-sm outline-none"
                           value={filterAmount.max} onChange={(e)=>setFilterAmount({...filterAmount, max: e.target.value})} />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="text-xs text-gray-500 font-semibold mb-1 block">Date Range</label>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-sm"><span className="w-10">From:</span> <input type="date" className="border rounded px-2 py-1 flex-1 text-sm outline-none" value={filterDate.start} onChange={(e)=>setFilterDate({...filterDate, start: e.target.value})} /></div>
                    <div className="flex items-center gap-2 text-sm"><span className="w-10">To:</span> <input type="date" className="border rounded px-2 py-1 flex-1 text-sm outline-none" value={filterDate.end} onChange={(e)=>setFilterDate({...filterDate, end: e.target.value})} /></div>
                  </div>
                </div>
                
                <button onClick={() => {setFilterAmount({min:'', max:''}); setFilterDate({start:'', end:''});}} className="cursor-pointer text-xs text-orange-600 hover:underline w-full text-center">Clear Filters</button>
              </div>
            )}
          </div>

          {/* SORT DROPDOWN */}
          <div ref={sortRef}>
            <button onClick={() => {setIsSortOpen(!isSortOpen); setIsFilterOpen(false);}} className="cursor-pointer bg-[#eab308] hover:bg-yellow-500 text-[#1e293b] px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm transition">
              <ArrowUpDown className="w-4 h-4 text-[#1e293b]" /> Sort by <ChevronDown className="w-4 h-4 text-[#1e293b]" />
            </button>
            {isSortOpen && (
              <div className="absolute top-12 right-0 w-48 bg-white border border-gray-200 shadow-xl rounded-xl p-2 z-50 flex flex-col">
                <button onClick={() => setSortConfig('date_desc')} className={`cursor-pointer text-left px-3 py-2 text-sm rounded-lg hover:bg-gray-100 ${sortConfig === 'date_desc' ? 'font-bold text-orange-600' : 'text-gray-700'}`}>Recent (Newest First)</button>
                <button onClick={() => setSortConfig('date_asc')} className={`cursor-pointer text-left px-3 py-2 text-sm rounded-lg hover:bg-gray-100 ${sortConfig === 'date_asc' ? 'font-bold text-orange-600' : 'text-gray-700'}`}>Recent (Oldest First)</button>
                <div className="border-t my-1"></div>
                <button onClick={() => setSortConfig('amount_desc')} className={`cursor-pointer text-left px-3 py-2 text-sm rounded-lg hover:bg-gray-100 ${sortConfig === 'amount_desc' ? 'font-bold text-orange-600' : 'text-gray-700'}`}>Amount (High to Low)</button>
                <button onClick={() => setSortConfig('amount_asc')} className={`cursor-pointer text-left px-3 py-2 text-sm rounded-lg hover:bg-gray-100 ${sortConfig === 'amount_asc' ? 'font-bold text-orange-600' : 'text-gray-700'}`}>Amount (Low to High)</button>
                <button onClick={() => setSortConfig('')} className="cursor-pointer text-left px-3 py-2 text-xs text-gray-400 hover:text-gray-600 mt-1">Clear Sort</button>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* History List */}
      <div className="space-y-4">
        {processedData.length === 0 ? (
           <div className="bg-white p-12 rounded-2xl shadow-sm border border-[#D9D9D9] flex flex-col items-center justify-center min-h-[400px]">
             <History className="w-16 h-16 text-gray-300 mb-4" />
             <h2 className="text-xl font-semibold text-gray-800 mb-2">No Transactions Found</h2>
             <p className="text-gray-500 text-sm">Try adjusting your filters or search term.</p>
           </div>
        ) : (
          processedData.map((record, index) => (
            <div key={index} className="bg-white p-5 rounded-xl shadow-sm border border-[#D9D9D9] flex justify-between items-center hover:shadow-md transition">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{record.name}</h3>
                <p className="text-gray-500 text-sm">Ph no. {record.phone}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="font-bold text-gray-900 text-base">Paid: ₹{record.amount}</span>
                <div className="flex gap-4 text-sm text-gray-500 mt-1">
                  <span>Date: {record.date}</span>
                  <span>Time: {record.time}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
