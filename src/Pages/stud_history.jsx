import React, { useState } from 'react';
import { 
  Menu, Home, Utensils, Wallet, History, HelpCircle, 
  Bell, UserCircle, Search, ChevronDown 
} from 'lucide-react';

// Using your exact import path from your friend's code
import studentLogo from '../assets/CreditSnap_logo_Student.png';

export default function StudHistory() {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Mock data matching the Student History wireframe
  const [historyData, setHistoryData] = useState([
    { id: 1, canteen: 'Hall-2 Canteen', amount: 1500, date: '30-01-2026', time: '2:37 PM' },
    { id: 2, canteen: 'Hall-3 Canteen', amount: 1000, date: '29-01-2026', time: '4:34 PM' },
    { id: 3, canteen: 'OAT Canteen', amount: 1200, date: '29-01-2026', time: '3:32 PM' },
    { id: 4, canteen: 'Hall-12 Canteen', amount: 500, date: '27-01-2026', time: '11:47 PM' },
    { id: 5, canteen: 'RM Canteen', amount: 600, date: '27-01-2026', time: '9:30 PM' },
    { id: 6, canteen: 'MT Canteen', amount: 800, date: '25-01-2026', time: '8:47 PM' },
  ]);

  const filteredData = historyData.filter(record => 
    record.canteen.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      
      {/* ================= SIDEBAR (Exactly from friend's StudDashboard) ================= */}
      <aside className="w-48 bg-[#1e293b] text-white flex flex-col justify-between">
        <div>
          <div className="p-4">
            <Menu className="w-8 h-8 cursor-pointer hover:text-orange-400 transition" />
          </div>

          <nav className="mt-4 flex flex-col gap-2">
            <div className="py-3 px-4 flex flex-col items-center justify-center text-gray-300 hover:text-white cursor-pointer opacity-70 transition">
              <Home className="w-6 h-6 mb-1" />
              <span className="text-sm">Home</span>
            </div>

            <div className="py-3 px-4 flex flex-col items-center justify-center text-gray-300 hover:text-white cursor-pointer opacity-70 transition">
              <Utensils className="w-6 h-6 mb-1" />
              <span className="text-sm">Canteens</span>
            </div>

            <div className="py-3 px-4 flex flex-col items-center justify-center text-gray-300 hover:text-white cursor-pointer opacity-70 transition">
              <Wallet className="w-6 h-6 mb-1" />
              <span className="text-sm text-center leading-tight">View debts</span>
            </div>

            {/* ACTIVE TAB: History */}
            <div className="bg-[#f97316] mx-2 py-3 px-4 rounded-xl flex flex-col items-center justify-center cursor-pointer shadow-lg">
              <History className="w-6 h-6 mb-1 text-white" />
              <span className="text-sm font-semibold text-white">History</span>
            </div>

            <div className="py-3 px-4 flex flex-col items-center justify-center text-gray-300 hover:text-white cursor-pointer opacity-70 transition">
              <HelpCircle className="w-6 h-6 mb-1" />
              <span className="text-sm">Help</span>
            </div>
          </nav>
        </div>

        <div className="p-4 border-t border-slate-700 text-center cursor-pointer hover:bg-slate-700 transition">
          <span className="text-sm text-gray-300">About us</span>
        </div>
      </aside>

      {/* ================= MAIN CONTENT AREA ================= */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Top Navbar (Exactly from friend's StudDashboard) */}
        <header className="h-16 bg-[#f4f7fb] border-b flex justify-between items-center px-4 shadow-sm z-10 overflow-hidden">
          <div className="flex items-center h-full">
             <img 
                src={studentLogo} 
                alt="CreditSnap Logo" 
                className="h-full w-auto object-contain mix-blend-multiply scale-[1.1] origin-left ml-2" 
             />
          </div>
          <div className="flex items-center gap-4 pr-2">
            <Bell className="w-6 h-6 text-gray-700 cursor-pointer hover:text-orange-500 transition" />
            <UserCircle className="w-8 h-8 text-gray-900 cursor-pointer hover:text-orange-500 transition" />
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="p-8 overflow-y-auto flex-1">
          
          <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            {/* Search Bar matching the wireframe */}
            <div className="flex items-center bg-white border border-[#D9D9D9] rounded-full px-5 py-2.5 flex-1 max-w-lg shadow-sm">
              <Search className="w-5 h-5 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search for Transaction" 
                className="ml-3 w-full outline-none text-gray-700 bg-transparent placeholder-gray-400 font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Filter and Sort buttons matching your friend's orange */}
            <div className="flex gap-4">
              <button className="bg-[#f97316] text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm hover:opacity-90 transition">
                Filter by <ChevronDown className="w-4 h-4 text-white" />
              </button>
              <button className="bg-[#f97316] text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm hover:opacity-90 transition">
                Sort by <ChevronDown className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {filteredData.length === 0 ? (
               <div className="bg-white p-12 rounded-2xl shadow-sm border border-[#D9D9D9] flex flex-col items-center justify-center min-h-[400px]">
                 <History className="w-16 h-16 text-gray-300 mb-4" />
                 <h2 className="text-xl font-semibold text-gray-800 mb-2">No Transactions Found</h2>
               </div>
            ) : (
              filteredData.map((record, index) => (
                <div key={index} className="bg-white p-5 rounded-xl shadow-sm border border-[#D9D9D9] flex justify-between items-center hover:shadow-md transition">
                  <div>
                    {/* Displaying the Canteen name instead of student name */}
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{record.canteen}</h3>
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

        </main>
      </div>
    </div>
  );
}