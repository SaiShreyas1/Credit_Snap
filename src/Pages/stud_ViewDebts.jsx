import React, { useState, useRef, useEffect } from 'react';

// Mock data simulating backend response
const canteenDebtsData = [
  {
    id: '1',
    name: 'Hall 10 Canteen',
    currentDebt: 3915,
    limit: 5000,
    totalPaid: 6500,
    transactions: [
      { id: 't1', date: 'Dec 20, 2025', time: '5:30pm', type: 'Paid Online', amount: -500 },
      { id: 't2', date: 'Dec 19, 2025', time: '7:35pm', type: 'Paid Offline', amount: -1000 },
      { id: 't3', date: 'Dec 16, 2025', time: '10:30pm', type: 'Debt taken', amount: 350 },
      { id: 't4', date: 'Dec 16, 2025', time: '5:50pm', type: 'Debt taken', amount: 200 },
    ]
  },
  {
    id: '2',
    name: 'Hall 1 Canteen',
    currentDebt: 1180,
    limit: 10000,
    totalPaid: 1200,
    transactions: []
  },
  {
    id: '3',
    name: 'Hall 12 Canteen',
    currentDebt: 875,
    limit: 6000,
    totalPaid: 500,
    transactions: []
  },
  {
    id: '4',
    name: 'Hall 6 Canteen',
    currentDebt: 530,
    limit: 5000,
    totalPaid: 200,
    transactions: []
  },
  {
    id: '5',
    name: 'Hall 3 Canteen',
    currentDebt: 0, 
    limit: 3000,
    totalPaid: 1500,
    transactions: []
  }
];

// Sub-component for individual Canteen Debt Cards
const DebtCard = ({ data }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mb-4">
      <div 
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col sm:flex-row justify-between items-center cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h2 className="text-xl font-medium text-gray-800 mb-2 sm:mb-0">
          {data.name}
        </h2>

        <div className="flex items-center gap-4 sm:gap-6">
          <div className="text-right">
            <p className="text-base text-gray-900 mb-1">
              Debt: {data.currentDebt}/{data.limit}
            </p>
            <button 
              className={`px-4 py-1 rounded-md text-sm font-medium transition-colors ${data.currentDebt > 0 ? 'bg-[#5b52d6] hover:bg-[#4a42b0] text-white' : 'bg-green-100 text-green-700 cursor-default'}`}
              onClick={(e) => {
                e.stopPropagation();
                if(data.currentDebt > 0) alert(`Clearing debt for ${data.name}`);
              }}
            >
              {data.currentDebt > 0 ? 'Clear Debt' : 'Settled'}
            </button>
          </div>
          <div className="text-gray-500">
            <i className="fa-solid fa-chevron-down" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease', fontSize: '18px' }}></i>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-3 pl-2 pr-2">
          <div className="flex justify-end mb-3">
            <span className="bg-white border border-gray-200 shadow-sm px-4 py-1.5 rounded-md text-gray-800 font-medium">
              Total Paid: <span className="text-green-600">₹{data.totalPaid}</span>
            </span>
          </div>

          <div className="space-y-3">
            {data.transactions.length > 0 ? (
              data.transactions.map((txn) => (
                <div key={txn.id} className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 flex justify-between items-center">
                  <div className="text-gray-700">
                    <p className="font-medium">{txn.date}</p>
                    <p className="text-sm">{txn.time}</p>
                  </div>
                  <div className="text-gray-800 font-medium">
                    {txn.type}
                  </div>
                  <div className={`font-semibold ${txn.amount < 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {txn.amount < 0 ? `-${'₹' + Math.abs(txn.amount)}` : `+₹${txn.amount}`}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 italic py-4">No recent transactions found.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Main View Debts Component
export default function ViewDebts() {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dropdown States
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  
  // Active Selections
  const [activeFilter, setActiveFilter] = useState('All'); 
  const [activeSort, setActiveSort] = useState(''); 

  // Refs for clicking outside
  const filterRef = useRef(null);
  const sortRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (filterRef.current && !filterRef.current.contains(event.target)) setIsFilterOpen(false);
      if (sortRef.current && !sortRef.current.contains(event.target)) setIsSortOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- LOGIC: Filter and Sort ---
  let processedDebts = [...canteenDebtsData];

  // 1. Search
  if (searchTerm) {
    processedDebts = processedDebts.filter(canteen => 
      canteen.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  // 2. Filter
  if (activeFilter === 'Unpaid') {
    processedDebts = processedDebts.filter(canteen => canteen.currentDebt > 0);
  } else if (activeFilter === 'Paid') {
    processedDebts = processedDebts.filter(canteen => canteen.currentDebt === 0);
  }

  // 3. Sort
  processedDebts.sort((a, b) => {
    if (activeSort === 'High to Low') return b.currentDebt - a.currentDebt;
    if (activeSort === 'Low to High') return a.currentDebt - b.currentDebt;
    if (activeSort === 'A-Z') return a.name.localeCompare(b.name);
    if (activeSort === 'Z-A') return b.name.localeCompare(a.name);
    return 0;
  });

  // --- EXACT CSS FROM CANTEENS PAGE ---
  const styles = `
    @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');

    .controls-row { display: flex; justify-content: space-between; margin-bottom: 30px; align-items: center;}
    .search-bar { background: white; padding: 12px 20px; border-radius: 25px; display: flex; align-items: center; width: 450px; border: 1px solid #ddd;}
    .search-bar i { color: #A0ABC0;}
    .search-bar input { border: none; outline: none; margin-left: 10px; width: 100%; font-size: 16px; color: #333;}
    
    .filter-sort { display: flex; gap: 10px;}
    .dropdown-container { position: relative; }
    .dropdown-btn { background: #f97316; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; min-width: 130px; display: flex; justify-content: space-between; align-items: center; font-size: 15px;}
    .dropdown-menu { position: absolute; top: 110%; left: 0; background: white; width: 100%; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); overflow: hidden; z-index: 10; border: 1px solid #eee;}
    .dropdown-menu div { padding: 10px; text-align: center; cursor: pointer; font-weight: 500; border-bottom: 1px solid #eee; color: #333;}
    .dropdown-menu div:hover { background: #f9f9f9; color: #f97316;}
  `;

  return (
    <>
      <style>{styles}</style>
      <main className="p-8 overflow-y-auto w-full h-full pb-32 bg-gray-50 min-h-screen">
        
        {/* Top Controls (Search, Filter, Sort) exactly matched to Canteens */}
        <div className="controls-row">
          <div className="search-bar">
            <i className="fa-solid fa-magnifying-glass"></i>
            <input 
              type="text" 
              placeholder="Search for Canteen" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="filter-sort">
            
            {/* Filter Dropdown */}
            <div className="dropdown-container" ref={filterRef}>
              <button className="dropdown-btn" onClick={() => setIsFilterOpen(!isFilterOpen)}>
                {activeFilter === 'All' ? 'Filter by' : activeFilter} 
                <i 
                  className="fa-solid fa-caret-down" 
                  style={{ transform: isFilterOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }}
                ></i>
              </button>
              {isFilterOpen && (
                <div className="dropdown-menu">
                  {['All', 'Unpaid', 'Paid'].map((option) => (
                    <div 
                      key={option} 
                      onClick={() => { setActiveFilter(option); setIsFilterOpen(false); }}
                      style={{ color: activeFilter === option ? '#f97316' : '#333' }}
                    >
                      {option}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="dropdown-container" ref={sortRef}>
              <button className="dropdown-btn" onClick={() => setIsSortOpen(!isSortOpen)}>
                {activeSort === '' ? 'Sort by' : activeSort} 
                <i 
                  className="fa-solid fa-caret-down" 
                  style={{ transform: isSortOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }}
                ></i>
              </button>
              {isSortOpen && (
                <div className="dropdown-menu">
                  {['High to Low', 'Low to High', 'A-Z', 'Z-A'].map((option) => (
                    <div 
                      key={option} 
                      onClick={() => { setActiveSort(option); setIsSortOpen(false); }}
                      style={{ color: activeSort === option ? '#f97316' : '#333' }}
                    >
                      {option}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Canteen Debt List */}
        <div className="max-w-5xl mx-auto">
          {processedDebts.length > 0 ? (
            processedDebts.map((canteen) => (
              <DebtCard key={canteen.id} data={canteen} />
            ))
          ) : (
            <div className="bg-white rounded-xl p-10 text-center border border-gray-200 shadow-sm mt-4">
              <p className="text-gray-500 text-lg font-medium">No canteens match your current filters.</p>
              <button 
                onClick={() => {setSearchTerm(''); setActiveFilter('All'); setActiveSort('');}}
                className="mt-4 text-[#f97316] font-semibold hover:underline cursor-pointer bg-transparent border-none"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

      </main>
    </>
  );
}