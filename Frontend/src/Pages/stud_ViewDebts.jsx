import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Search, ChevronDown, Filter, ArrowDownUp, AlertTriangle, Loader2 } from 'lucide-react';
import { io } from 'socket.io-client';
import { useNotifications } from '../context/NotificationContext';

// Sub-component for individual Canteen Debt Cards (MATCHING STUD CANTEENS UI)
const DebtCard = ({ data }) => {
  const { showAlert } = useNotifications();
  return (
    <div className="bg-white rounded-xl mb-4 p-6 flex justify-between items-center shadow-sm border border-gray-100 transition-all overflow-hidden hover:shadow-md">
      
      <div>
        <h2 className="text-2xl font-medium text-black mb-1">{data.name}</h2>
      </div>

      <div className="flex flex-col items-end gap-2">
        <p className="font-bold text-gray-500 tracking-wide uppercase text-sm">
          Debt: <span className="text-black text-lg ml-1">₹{data.currentDebt} <span className="text-gray-400 font-medium normal-case text-base">/ ₹{data.limit}</span></span>
        </p>
        {data.currentDebt > 0 ? (
          <button 
            className="bg-[#6366f1] hover:bg-[#4f46e5] text-white px-6 py-2 rounded-xl text-sm font-medium transition cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              showAlert("Payment Information", `To clear your debt for ${data.name}, please visit the canteen and pay the owner directly, or use the upcoming online payment feature.`, "info");
            }}
          >
            Clear Debt
          </button>
        ) : (
          <div className="bg-[#D1FAE5] text-[#065F46] px-6 py-2 rounded-full font-medium text-sm">
            Settled
          </div>
        )}
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
            limit: d.limit || 3000, // ✅ Dynamic: reads the per-canteen limit set by the owner
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
          
          {/* Sort Dropdown */}
          <div className="relative" ref={sortRef}>
            <button 
              onClick={() => setIsSortOpen(!isSortOpen)} 
              className="bg-[#f97316] text-white px-5 h-11 rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm hover:bg-[#ea580c] transition-colors justify-between min-w-[140px] cursor-pointer"
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
      <div className="flex flex-col">
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