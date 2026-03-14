import React, { useState, useRef, useEffect } from 'react';
import { History, Search, ChevronDown, Filter, ArrowUpDown } from 'lucide-react';

const parseDateTime = (dateStr, timeStr) => {
  const [day, month, year] = dateStr.split('-');
  return new Date(`${year}-${month}-${day} ${timeStr}`);
};

export default function StudHistory() {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dropdowns
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // States
  const [sortConfig, setSortConfig] = useState(''); // 'date_desc', 'date_asc', 'price_desc', 'price_asc'
  const [filterStatus, setFilterStatus] = useState(''); // '', 'Accepted', 'Rejected'
  const [filterCanteen, setFilterCanteen] = useState(''); // Specific canteen name

  const sortRef = useRef(null);
  const filterRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (sortRef.current && !sortRef.current.contains(event.target)) setIsSortOpen(false);
      if (filterRef.current && !filterRef.current.contains(event.target)) setIsFilterOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Updated Mock data with Statuses for filtering
  const [historyData] = useState([
    { id: 1, canteen: 'Hall-2 Canteen', amount: 1500, date: '30-01-2026', time: '2:37 PM', status: 'Accepted' },
    { id: 2, canteen: 'Hall-3 Canteen', amount: 1000, date: '29-01-2026', time: '4:34 PM', status: 'Accepted' },
    { id: 3, canteen: 'OAT Canteen', amount: 1200, date: '29-01-2026', time: '3:32 PM', status: 'Rejected' },
    { id: 4, canteen: 'Hall-12 Canteen', amount: 500, date: '27-01-2026', time: '11:47 PM', status: 'Accepted' },
    { id: 5, canteen: 'RM Canteen', amount: 600, date: '27-01-2026', time: '9:30 PM', status: 'Accepted' },
    { id: 6, canteen: 'MT Canteen', amount: 800, date: '25-01-2026', time: '8:47 PM', status: 'Rejected' },
  ]);

  // Unique canteens for the filter dropdown
  const uniqueCanteens = [...new Set(historyData.map(item => item.canteen))];

  // Process data based on active filters/sorts
  let processedData = historyData.filter(record => {
    const matchesSearch = record.canteen.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === '' ? true : record.status === filterStatus;
    const matchesCanteen = filterCanteen === '' ? true : record.canteen === filterCanteen;
    return matchesSearch && matchesStatus && matchesCanteen;
  });

  if (sortConfig) {
    processedData.sort((a, b) => {
      if (sortConfig.includes('date')) {
        const dateA = parseDateTime(a.date, a.time);
        const dateB = parseDateTime(b.date, b.time);
        return sortConfig === 'date_desc' ? dateB - dateA : dateA - dateB;
      } else if (sortConfig.includes('price')) {
        return sortConfig === 'price_desc' ? b.amount - a.amount : a.amount - b.amount;
      }
      return 0;
    });
  }

  return (
    <div className="p-8">
      {/* Action Bar */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 relative z-20">
        
        <div className="flex items-center bg-white border border-[#D9D9D9] rounded-full px-5 py-2.5 flex-1 max-w-lg shadow-sm">
          <Search className="w-5 h-5 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search for Transaction by Canteen" 
            className="ml-3 w-full outline-none text-gray-700 bg-transparent placeholder-gray-400 font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex gap-4 relative">
          
          {/* FILTER DROPDOWN */}
          <div ref={filterRef}>
            <button onClick={() => {setIsFilterOpen(!isFilterOpen); setIsSortOpen(false);}} className="bg-[#f97316] text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm hover:opacity-90 transition">
               <Filter className="w-4 h-4 text-white" /> Filter by
            </button>
            {isFilterOpen && (
              <div className="absolute top-12 right-32 w-64 bg-white border border-gray-200 shadow-xl rounded-xl p-4 z-50">
                <h4 className="font-semibold text-gray-800 mb-3 border-b pb-2">Filter Options</h4>
                
                <div className="mb-4">
                  <label className="text-xs text-gray-500 font-semibold mb-2 block">Status</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm outline-none bg-gray-50"
                          value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                    <option value="">All Statuses</option>
                    <option value="Accepted">Accepted</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                <div className="mb-4">
                  <label className="text-xs text-gray-500 font-semibold mb-2 block">Canteen Name</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm outline-none bg-gray-50"
                          value={filterCanteen} onChange={(e) => setFilterCanteen(e.target.value)}>
                    <option value="">All Canteens</option>
                    {uniqueCanteens.map((canteenName, i) => (
                      <option key={i} value={canteenName}>{canteenName}</option>
                    ))}
                  </select>
                </div>
                
                <button onClick={() => {setFilterStatus(''); setFilterCanteen('');}} className="text-xs text-orange-600 hover:underline w-full text-center">Clear Filters</button>
              </div>
            )}
          </div>

          {/* SORT DROPDOWN */}
          <div ref={sortRef}>
            <button onClick={() => {setIsSortOpen(!isSortOpen); setIsFilterOpen(false);}} className="bg-[#f97316] text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm hover:opacity-90 transition">
              <ArrowUpDown className="w-4 h-4 text-white" /> Sort by <ChevronDown className="w-4 h-4 text-white" />
            </button>
            {isSortOpen && (
              <div className="absolute top-12 right-0 w-48 bg-white border border-gray-200 shadow-xl rounded-xl p-2 z-50 flex flex-col">
                <button onClick={() => setSortConfig('date_desc')} className={`text-left px-3 py-2 text-sm rounded-lg hover:bg-orange-50 ${sortConfig === 'date_desc' ? 'font-bold text-orange-600' : 'text-gray-700'}`}>Recent (Newest)</button>
                <button onClick={() => setSortConfig('date_asc')} className={`text-left px-3 py-2 text-sm rounded-lg hover:bg-orange-50 ${sortConfig === 'date_asc' ? 'font-bold text-orange-600' : 'text-gray-700'}`}>Recent (Oldest)</button>
                <div className="border-t my-1 border-gray-100"></div>
                <button onClick={() => setSortConfig('price_desc')} className={`text-left px-3 py-2 text-sm rounded-lg hover:bg-orange-50 ${sortConfig === 'price_desc' ? 'font-bold text-orange-600' : 'text-gray-700'}`}>Price (High to Low)</button>
                <button onClick={() => setSortConfig('price_asc')} className={`text-left px-3 py-2 text-sm rounded-lg hover:bg-orange-50 ${sortConfig === 'price_asc' ? 'font-bold text-orange-600' : 'text-gray-700'}`}>Price (Low to High)</button>
                <button onClick={() => setSortConfig('')} className="text-left px-3 py-2 text-xs text-gray-400 hover:text-gray-600 mt-1">Clear Sort</button>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* History List */}
      <div className="space-y-4 relative z-10">
        {processedData.length === 0 ? (
           <div className="bg-white p-12 rounded-2xl shadow-sm border border-[#D9D9D9] flex flex-col items-center justify-center min-h-[400px]">
             <History className="w-16 h-16 text-gray-300 mb-4" />
             <h2 className="text-xl font-semibold text-gray-800 mb-2">No Transactions Found</h2>
             <p className="text-gray-500 text-sm">Try adjusting your filters or search term.</p>
           </div>
        ) : (
          processedData.map((record, index) => (
            <div key={index} className="bg-white p-5 rounded-xl shadow-sm border border-[#D9D9D9] flex justify-between items-center hover:shadow-md transition">
              <div className="flex flex-col items-start gap-1">
                <h3 className="text-lg font-semibold text-gray-900">{record.canteen}</h3>
                {/* Status Badge */}
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${record.status === 'Accepted' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {record.status}
                </span>
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