import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Search, ChevronDown, Filter, ArrowDownUp, AlertTriangle, Loader2 } from 'lucide-react';
import { io } from 'socket.io-client';

// Sub-component for individual Canteen Debt Cards (SIMPLIFIED)
const DebtCard = ({ data }) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-4 transition-all duration-300 overflow-hidden hover:shadow-md hover:border-gray-200">
      <div className="p-5 flex justify-between items-center select-none">
        
        <h2 className="text-lg font-bold text-gray-800">
          {data.name}
        </h2>

        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end gap-1.5">
            <p className="text-xs font-bold text-gray-500 tracking-wide uppercase">
              Debt: <span className="text-gray-800 text-sm ml-1">₹{data.currentDebt} <span className="text-gray-400 font-medium normal-case text-xs">/ ₹{data.limit}</span></span>
            </p>
            {data.currentDebt > 0 ? (
              <button 
                className="bg-[#6366f1] hover:bg-[#4f46e5] hover:shadow-lg hover:shadow-indigo-500/20 text-white px-5 py-2 rounded-xl text-xs font-bold tracking-wide transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  alert(`Clearing debt for ${data.name} will be integrated later!`);
                }}
              >
                Clear Debt
              </button>
            ) : (
              <div className="bg-green-50 border border-green-200 text-green-700 px-5 py-2 rounded-xl text-xs font-bold tracking-wide">
                Settled
              </div>
            )}
          </div>
        </div>
        
      </div>
    </div>
  );
};

// Main View Debts Component
export default function ViewDebts() {
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dropdown States
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  
  // Active Selections
  const [activeFilter, setActiveFilter] = useState('All'); 
  const [activeSort, setActiveSort] = useState('A-Z'); 

  const filterRef = useRef(null);
  const sortRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (filterRef.current && !filterRef.current.contains(event.target)) setIsFilterOpen(false);
      if (sortRef.current && !sortRef.current.contains(event.target)) setIsSortOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 1. FETCH STUDENT DEBTS FROM BACKEND
  useEffect(() => {
    const fetchMyDebts = async () => {
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        
        if (!token) {
          console.error("NO TOKEN FOUND IN BROWSER!");
          setLoading(false);
          return;
        }

        const res = await axios.get('http://localhost:5000/api/debts/my-debts', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.data.status === 'success') {
          console.log("MY DEBTS:", res.data.data); 
          const mappedData = res.data.data.map(d => ({
            id: d._id,
            name: d.canteen?.name || "Unknown Canteen",
            currentDebt: d.amountOwed,
            limit: 3000, // Hardcoded for now, can be pulled from user limit later
          }));
          setDebts(mappedData);
        }
      } catch (err) {
        console.error("Failed to fetch debts", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMyDebts();

    const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
    
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        const socket = io('http://localhost:5000');

        socket.on('connect', () => {
          socket.emit('join-student', user._id);
        });

        socket.on('debt-updated', () => {
          fetchMyDebts(); // Refresh automatically if owner accepts a payment
        });

        return () => {
          socket.disconnect();
        };
      } catch (e) {
        console.error("Socket err", e);
      }
    }
  }, []);

  // --- LOGIC: Filter and Sort ---
  let processedDebts = [...debts];

  if (searchTerm) {
    processedDebts = processedDebts.filter(canteen => 
      canteen.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  if (activeFilter === 'Unpaid') {
    processedDebts = processedDebts.filter(canteen => canteen.currentDebt > 0);
  } else if (activeFilter === 'Paid') {
    processedDebts = processedDebts.filter(canteen => canteen.currentDebt === 0);
  }

  processedDebts.sort((a, b) => {
    if (activeSort === 'High to Low') return b.currentDebt - a.currentDebt;
    if (activeSort === 'Low to High') return a.currentDebt - b.currentDebt;
    if (activeSort === 'A-Z') return a.name.localeCompare(b.name);
    if (activeSort === 'Z-A') return b.name.localeCompare(a.name);
    return 0;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full pt-20">
         <Loader2 className="w-10 h-10 animate-spin text-[#f97316] mb-4" />
         <p className="text-xl text-gray-600 font-medium">Fetching your debts...</p>
      </div>
    );
  }

  return (
    <main className="p-6 md:p-10 w-full min-h-screen bg-[#f8f9fa] relative">
        
      {/* ========================================================
          TOP ACTION BAR 
          ========================================================
      */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-5 relative z-20">
        
        {/* Search Bar */}
        <div className="flex items-center bg-white border border-gray-200 rounded-full px-5 h-11 w-full max-w-[450px] shadow-sm focus-within:ring-2 focus-within:ring-orange-500/20 focus-within:border-orange-500 transition-all duration-300">
          <Search className="w-4 h-4 text-gray-400 mr-3" />
          <input 
            type="text" 
            placeholder="Search for Canteen..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full outline-none text-sm text-gray-700 bg-transparent placeholder-gray-400 font-medium"
          />
        </div>

        {/* Orange Filter & Sort Buttons */}
        <div className="flex gap-4">
          
          {/* Filter Dropdown */}
          <div className="relative" ref={filterRef}>
            <button 
              onClick={() => { setIsFilterOpen(!isFilterOpen); setIsSortOpen(false); }} 
              className="bg-[#f97316] text-white px-5 h-11 rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm hover:bg-[#ea580c] transition-colors justify-between min-w-[140px]"
            >
              <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4" /> 
                  {activeFilter === 'All' ? 'Filter by' : activeFilter}
              </div>
              <ChevronDown className="w-4 h-4 ml-1" />
            </button>
            
            {isFilterOpen && (
              <div className="absolute right-0 mt-3 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden py-2">
                {['All', 'Unpaid', 'Paid'].map((option) => (
                  <div 
                    key={option}
                    onClick={() => { setActiveFilter(option); setIsFilterOpen(false); }} 
                    className={`px-5 py-2.5 text-sm cursor-pointer transition-colors ${activeFilter === option ? 'bg-orange-50 font-bold text-[#f97316]' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'}`}
                  >
                    {option === 'All' ? 'All Canteens' : `${option} Only`}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="relative" ref={sortRef}>
            <button 
              onClick={() => { setIsSortOpen(!isSortOpen); setIsFilterOpen(false); }} 
              className="bg-[#f97316] text-white px-5 h-11 rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm hover:bg-[#ea580c] transition-colors justify-between min-w-[140px]"
            >
              <div className="flex items-center gap-2">
                  <ArrowDownUp className="w-4 h-4" /> 
                  {activeSort === 'A-Z' ? 'Sort by' : activeSort}
              </div>
              <ChevronDown className="w-4 h-4 ml-1" />
            </button>
            
            {isSortOpen && (
              <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden py-2">
                {['A-Z', 'Z-A', 'High to Low', 'Low to High'].map((option) => (
                  <div 
                    key={option}
                    onClick={() => { setActiveSort(option); setIsSortOpen(false); }} 
                    className={`px-5 py-2.5 text-sm cursor-pointer transition-colors ${activeSort === option ? 'bg-orange-50 font-bold text-[#f97316]' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'}`}
                  >
                    {option.includes('High') ? `Debt: ${option}` : `Name: ${option}`}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ========================================================
          BOTTOM SECTION - POLISHED DEBT CARDS
          ========================================================
      */}
      <div className="flex flex-col relative z-0 max-w-5xl mx-auto">
        {processedDebts.length > 0 ? (
          processedDebts.map((canteen) => (
            <DebtCard key={canteen.id} data={canteen} />
          ))
        ) : (
          <div className="bg-white rounded-3xl p-12 shadow-sm border border-gray-100 text-center flex flex-col items-center justify-center gap-3 mt-4 min-h-[300px]">
            <div className="bg-orange-50 p-4 rounded-full mb-2">
              <AlertTriangle className="w-10 h-10 text-[#f97316]" />
            </div>
            <p className="text-xl font-bold text-gray-800">No debts found!</p>
            <p className="text-gray-500 text-sm font-medium mb-2">Try adjusting your active filters.</p>
            <button 
              onClick={() => {setSearchTerm(''); setActiveFilter('All'); setActiveSort('A-Z');}}
              className="bg-white border-2 border-gray-200 hover:border-[#f97316] hover:text-[#f97316] text-gray-700 font-bold px-6 py-2.5 rounded-xl transition-all duration-300 text-sm cursor-pointer"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>

    </main>
  );
}