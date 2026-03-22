import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Search, ChevronDown, Filter, ArrowDownUp, AlertTriangle, Loader2 } from 'lucide-react';

// Sub-component for individual Canteen Debt Cards
const DebtCard = ({ data }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-4 transition-all hover:shadow-md overflow-hidden">
      {/* Top Visible Row */}
      <div 
        className="p-6 flex justify-between items-center cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h2 className="text-xl font-medium text-gray-900">
          {data.name}
        </h2>

        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end gap-1.5">
            <p className="text-sm text-gray-800 font-medium">
              Debt: {data.currentDebt}/{data.limit}
            </p>
            {data.currentDebt > 0 ? (
              <button 
                className="bg-[#6366f1] hover:bg-[#4f46e5] text-white px-5 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-sm cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  alert(`Clearing debt for ${data.name} will be integrated later!`);
                }}
              >
                Clear Debt
              </button>
            ) : (
              <div className="bg-[#D1FAE5] text-[#065F46] px-5 py-1.5 rounded-lg text-sm font-medium">
                Settled
              </div>
            )}
          </div>
          <ChevronDown 
            className={`w-6 h-6 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} 
          />
        </div>
      </div>

      {/* Expanded Transactions Section */}
      {isExpanded && (
        <div className="px-6 pb-6 pt-2 border-t border-gray-50 bg-gray-50/50">
          <div className="flex justify-end mb-4 mt-2">
            <span className="bg-white border border-gray-200 shadow-sm px-4 py-2 rounded-lg text-gray-800 font-medium text-sm">
              Total Paid: <span className="text-green-600 ml-1">₹{data.totalPaid}</span>
            </span>
          </div>

          <div className="space-y-3">
            {data.transactions && data.transactions.length > 0 ? (
              data.transactions.map((txn) => (
                <div key={txn.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex justify-between items-center">
                  <div className="text-gray-700">
                    <p className="font-medium text-gray-900">{txn.date}</p>
                    <p className="text-sm text-gray-500">{txn.time}</p>
                  </div>
                  <div className="text-gray-800 font-medium">
                    {txn.type}
                  </div>
                  <div className={`font-semibold text-lg ${txn.amount < 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {txn.amount < 0 ? `-${'₹' + Math.abs(txn.amount)}` : `+₹${txn.amount}`}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center bg-white rounded-xl border border-gray-100 py-6 text-gray-500">
                No recent transactions found. (History coming soon)
              </div>
            )}
          </div>
        </div>
      )}
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
        // 🚨 THE FIX: Check both storages just in case!
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
          console.log("MY DEBTS:", res.data.data); // Let's see what we get!
          const mappedData = res.data.data.map(d => ({
            id: d._id,
            name: d.canteen?.name || "Unknown Canteen",
            currentDebt: d.amountOwed,
            limit: 3000, 
            totalPaid: 0, 
            transactions: [] 
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
    <main className="p-10 pb-32 w-full h-full bg-[#F8FAFC] overflow-y-auto relative">
        
      {/* DYNAMIC TOP ROW */}
      <div className="flex justify-between items-center mb-10 gap-6">
        <div className="bg-white rounded-full flex items-center px-6 py-3.5 w-[450px] shadow-sm border border-gray-100 focus-within:ring-2 focus-within:ring-[#f97316] transition">
          <Search className="w-5 h-5 text-gray-400 mr-3" />
          <input 
            type="text" 
            placeholder="Search for Canteen" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full outline-none text-gray-700 bg-transparent text-lg"
          />
        </div>

        <div className="flex gap-4">
          <div className="relative" ref={filterRef}>
            <button 
              onClick={() => { setIsFilterOpen(!isFilterOpen); setIsSortOpen(false); }} 
              className="cursor-pointer bg-[#f97316] hover:bg-[#ea580c] text-white font-semibold px-6 py-3.5 rounded-xl shadow-md flex items-center gap-2 transition min-w-[150px] justify-between text-lg"
            >
              <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5" /> 
                  {activeFilter === 'All' ? 'Filter by' : activeFilter}
              </div>
              <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isFilterOpen && (
              <div className="absolute right-0 mt-3 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                {['All', 'Unpaid', 'Paid'].map((option) => (
                  <div 
                    key={option}
                    onClick={() => { setActiveFilter(option); setIsFilterOpen(false); }} 
                    className={`px-5 py-3.5 text-base cursor-pointer hover:bg-gray-50 transition ${activeFilter === option ? 'bg-orange-50 font-semibold text-[#f97316]' : 'text-gray-700'}`}
                  >
                    {option === 'All' ? 'All Canteens' : `${option} Only`}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="relative" ref={sortRef}>
            <button 
              onClick={() => { setIsSortOpen(!isSortOpen); setIsFilterOpen(false); }} 
              className="cursor-pointer bg-[#f97316] hover:bg-[#ea580c] text-white font-semibold px-6 py-3.5 rounded-xl shadow-md flex items-center gap-2 transition min-w-[170px] justify-between text-lg"
            >
              <div className="flex items-center gap-2">
                  <ArrowDownUp className="w-5 h-5" /> 
                  {activeSort === 'A-Z' ? 'Sort by' : activeSort}
              </div>
              <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${isSortOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isSortOpen && (
              <div className="absolute right-0 mt-3 w-56 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                {['A-Z', 'Z-A', 'High to Low', 'Low to High'].map((option) => (
                  <div 
                    key={option}
                    onClick={() => { setActiveSort(option); setIsSortOpen(false); }} 
                    className={`px-5 py-3.5 text-base cursor-pointer hover:bg-gray-50 transition ${activeSort === option ? 'bg-orange-50 font-semibold text-[#f97316]' : 'text-gray-700'}`}
                  >
                    {option.includes('High') ? `Debt: ${option}` : `Name: ${option}`}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Canteen Debt List */}
      <div className="flex flex-col">
        {processedDebts.length > 0 ? (
          processedDebts.map((canteen) => (
            <DebtCard key={canteen.id} data={canteen} />
          ))
        ) : (
          <div className="bg-white rounded-2xl p-10 shadow-sm border border-gray-100 text-center flex flex-col items-center justify-center gap-3">
            <AlertTriangle className="w-10 h-10 text-orange-400" />
            <p className="text-xl font-semibold text-gray-800">No debts found!</p>
            <button 
              onClick={() => {setSearchTerm(''); setActiveFilter('All'); setActiveSort('A-Z');}}
              className="mt-2 bg-[#f97316] hover:bg-[#ea580c] text-white font-semibold px-5 py-2 rounded-lg transition text-sm cursor-pointer"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>

    </main>
  );
}