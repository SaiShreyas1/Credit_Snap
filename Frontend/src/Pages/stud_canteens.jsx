import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import { Search, ArrowLeft, Filter, ArrowDownUp, Plus, Minus, ShoppingCart, AlertTriangle, ChevronsUpDown, ChevronDown } from 'lucide-react'; 

const StudentCanteens = () => {
  const location = useLocation();
  // ==========================================
  // 1. STATES
  // ==========================================
  const [step, setStep] = useState('list'); 
  const [canteensData, setCanteensData] = useState([]); 
  const [selectedCanteen, setSelectedCanteen] = useState(null);
  const [cart, setCart] = useState({}); 
  const [loading, setLoading] = useState(true);

  // Search & Filter & Sorting States
  const [searchQuery, setSearchQuery] = useState("");
  const [currentFilter, setCurrentFilter] = useState("all"); 
  const [currentSort, setCurrentSort] = useState("name-az"); 
  
  // State for dropdown visibility
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

  // Refs for clicking outside (THE FIX FOR STICKY MENUS!)
  const filterRef = useRef(null);
  const sortRef = useRef(null);

  // Live menu for a selected canteen
  const [menuData, setMenuData] = useState([]);

  // ==========================================
  // 1.5 CLOSE DROPDOWNS ON OUTSIDE CLICK
  // ==========================================
  useEffect(() => {
    function handleClickOutside(event) {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setIsFilterDropdownOpen(false);
      }
      if (sortRef.current && !sortRef.current.contains(event.target)) {
        setIsSortDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ==========================================
  // 2. FETCH REAL CANTEENS FROM BACKEND
  // ==========================================
  useEffect(() => {
    const fetchCanteens = async () => {
      try {
        const token = sessionStorage.getItem('token');
        const response = await axios.get('http://localhost:5000/api/canteens', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data.status === 'success') {
          setCanteensData(response.data.data);
        }
      } catch (err) {
        console.error("Error fetching canteens:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCanteens();
  }, []);

  // ==========================================
  // 3. INTEGRATION: PLACE DEBT REQUEST
  // ==========================================
  const handlePlaceDebtRequest = async () => {
    try {
      const token = sessionStorage.getItem('token');
      
      const orderData = {
        canteenId: selectedCanteen._id,
        items: Object.entries(cart).map(([id, qty]) => {
          const item = menuData.find(i => i._id === id);
          return { name: item.name, quantity: qty, price: item.price };
        }),
        totalAmount: getTotalCost()
      };

      const response = await axios.post('http://localhost:5000/api/orders/place', orderData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.status === 'success') {
        alert(`Success! Request sent to ${selectedCanteen.name}`);
        goToList(); 
      }
    } catch (err) {
      alert(err.response?.data?.message || "Order failed. Please log in again.");
    }
  };

  // ==========================================
  // 4. HELPER FUNCTIONS
  // ==========================================
  const goToMenu = async (canteen) => {
    if (canteen.status === "Closed") return;
    
    try {
      const token = sessionStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/canteens/${canteen._id}/menu`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.status === 'success') {
        setMenuData(response.data.data.menu.filter(item => item.isAvailable));
      }
    } catch (err) {
      console.error("Failed to load live menu", err);
      setMenuData([]); 
    }

    setSelectedCanteen(canteen);
    setSearchQuery("");
    setCurrentSort("name-az"); 
    setStep('menu');
  };

  const goToList = () => {
    setStep('list');
    setCart({}); 
    setSelectedCanteen(null);
    setCurrentFilter("all"); 
    setCurrentSort("name-az");
  };

  // Reset to list view when clicking "Canteens" in sidebar again
  useEffect(() => {
    goToList();
  }, [location.key]);

  const updateQuantity = (id, delta) => {
    setCart(prev => {
      const newQty = (prev[id] || 0) + delta;
      if (newQty <= 0) {
        const newCart = { ...prev };
        delete newCart[id];
        return newCart;
      }
      return { ...prev, [id]: newQty };
    });
  };

  const getTotalCost = () => {
    return Object.entries(cart).reduce((total, [id, qty]) => {
      const item = menuData.find(i => i._id === id);
      return total + (item ? item.price * qty : 0);
    }, 0);
  };

  const getCartSummaryText = () => {
    return Object.entries(cart).map(([id, qty]) => {
      const item = menuData.find(i => i._id === id);
      return item ? `${item.name} x${qty}` : "";
    }).filter(Boolean).join(", ");
  };

  // ==========================================
  // 5. DERIVED STATES (Search, Filter, Sort)
  // ==========================================
  
  let displayCanteens = canteensData
    .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter(c => {
      if (currentFilter === 'open') return c.status === "Open" || c.isOpen;
      return true; 
    })
    .sort((a, b) => {
      if (currentSort === 'name-az') return a.name.localeCompare(b.name);
      if (currentSort === 'name-za') return b.name.localeCompare(a.name);
      return 0; 
    });

  const getFilterText = () => {
    if (currentFilter === 'open') return "Open Only";
    return "All Canteens";
  };

  let displayMenu = menuData
    .filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (currentSort === 'name-az') return a.name.localeCompare(b.name);
      if (currentSort === 'name-za') return b.name.localeCompare(a.name);
      if (currentSort === 'price-low-high') return a.price - b.price;
      if (currentSort === 'price-high-low') return b.price - a.price;
      return 0;
    });

  const getSortText = () => {
    if (currentSort === 'name-az') return "Name: A → Z";
    if (currentSort === 'name-za') return "Name: Z → A";
    if (currentSort === 'price-low-high') return "Price: Low → High";
    if (currentSort === 'price-high-low') return "Price: High → Low";
    return "Sort by";
  };

  // ==========================================
  // 6. RENDER
  // ==========================================
  if (loading) return <div className="p-8 text-center text-xl font-medium bg-[#F8FAFC] h-full flex flex-col items-center justify-center gap-2">
    <ChevronsUpDown className="w-10 h-10 text-orange-400" />
    Connecting to Canteens...
  </div>;

  return (
    <main className="p-10 pb-32 w-full h-full bg-[#F8FAFC] overflow-y-auto relative">
      
      {/* HEADER WITH BACK BUTTON */}
      {step !== 'list' && (
        <h1 className="text-3xl font-medium text-black mb-10 flex items-center gap-4">
          <ArrowLeft className="w-7 h-7 cursor-pointer text-gray-500 hover:text-black transition" onClick={step === 'menu' ? goToList : () => setStep('menu')} />
          {selectedCanteen?.name}
        </h1>
      )}

      {/* DYNAMIC TOP ROW (Matches ViewDebts exactly) */}
      {step !== 'checkout' && (
        <div className="flex justify-between items-center mb-10 gap-6">
          
          {/* Large Pill-shaped Search Bar */}
          <div className="bg-white rounded-full flex items-center px-6 py-3.5 w-[450px] shadow-sm border border-gray-100 focus-within:ring-2 focus-within:ring-[#f97316] focus-within:border-[#f97316] transition">
            <Search className="w-5 h-5 text-gray-400 mr-3" />
            <input 
              type="text" 
              placeholder={step === 'list' ? "Search for Canteen" : "Search for Item"} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full outline-none text-gray-700 bg-transparent text-lg"
            />
          </div>

          {/* Filter & Sort Buttons */}
          <div className="flex gap-4">
            
            {/* Filter Dropdown */}
            {step === 'list' && (
              <div className="relative" ref={filterRef}>
                <button 
                  onClick={() => { setIsFilterDropdownOpen(!isFilterDropdownOpen); setIsSortDropdownOpen(false); }} 
                  className="cursor-pointer bg-[#f97316] hover:bg-[#ea580c] text-white font-semibold px-6 py-3.5 rounded-xl shadow-md flex items-center gap-2 transition min-w-[150px] justify-between text-lg"
                >
                  <div className="flex items-center gap-2">
                      <Filter className="w-5 h-5" /> 
                      {getFilterText()}
                  </div>
                  <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${isFilterDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isFilterDropdownOpen && (
                  <div className="absolute right-0 mt-3 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                    <div onClick={() => { setCurrentFilter('all'); setIsFilterDropdownOpen(false); }} className={`px-5 py-3.5 text-base cursor-pointer hover:bg-gray-50 transition ${currentFilter === 'all' ? 'bg-orange-50 font-semibold text-[#f97316]' : 'text-gray-700'}`}>All Canteens</div>
                    <div onClick={() => { setCurrentFilter('open'); setIsFilterDropdownOpen(false); }} className={`px-5 py-3.5 text-base cursor-pointer hover:bg-gray-50 transition ${currentFilter === 'open' ? 'bg-orange-50 font-semibold text-[#f97316]' : 'text-gray-700'}`}>Open Only</div>
                  </div>
                )}
              </div>
            )}

            {/* Sort Dropdown */}
            <div className="relative" ref={sortRef}>
              <button 
                onClick={() => { setIsSortDropdownOpen(!isSortDropdownOpen); setIsFilterDropdownOpen(false); }} 
                className="cursor-pointer bg-[#f97316] hover:bg-[#ea580c] text-white font-semibold px-6 py-3.5 rounded-xl shadow-md flex items-center gap-2 transition min-w-[170px] justify-between text-lg"
              >
                <div className="flex items-center gap-2">
                    <ArrowDownUp className="w-5 h-5" /> 
                    {getSortText()}
                </div>
                <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${isSortDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isSortDropdownOpen && (
                <div className="absolute right-0 mt-3 w-56 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                  <div onClick={() => { setCurrentSort('name-az'); setIsSortDropdownOpen(false); }} className={`px-5 py-3.5 text-base cursor-pointer hover:bg-gray-50 transition ${currentSort === 'name-az' ? 'bg-orange-50 font-semibold text-[#f97316]' : 'text-gray-700'}`}>Name: A → Z</div>
                  <div onClick={() => { setCurrentSort('name-za'); setIsSortDropdownOpen(false); }} className={`px-5 py-3.5 text-base cursor-pointer hover:bg-gray-50 transition ${currentSort === 'name-za' ? 'bg-orange-50 font-semibold text-[#f97316]' : 'text-gray-700'}`}>Name: Z → A</div>
                  
                  {step === 'menu' && (
                    <>
                      <div onClick={() => { setCurrentSort('price-low-high'); setIsSortDropdownOpen(false); }} className={`px-5 py-3.5 text-base cursor-pointer hover:bg-gray-50 transition ${currentSort === 'price-low-high' ? 'bg-orange-50 font-semibold text-[#f97316]' : 'text-gray-700'}`}>Price: Low → High</div>
                      <div onClick={() => { setCurrentSort('price-high-low'); setIsSortDropdownOpen(false); }} className={`px-5 py-3.5 text-base cursor-pointer hover:bg-gray-50 transition ${currentSort === 'price-high-low' ? 'bg-orange-50 font-semibold text-[#f97316]' : 'text-gray-700'}`}>Price: High → Low</div>
                    </>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* 1. CANTEEN LIST VIEW (Step 1) */}
      {step === 'list' && (
        <div className="flex flex-col">
          
          {displayCanteens.length === 0 && (
            <div className="bg-white rounded-2xl p-10 shadow-sm border border-gray-100 text-center flex flex-col items-center justify-center gap-3">
              <AlertTriangle className="w-10 h-10 text-orange-400" />
              <p className="text-xl font-semibold text-gray-800">No matching canteens found!</p>
              <button onClick={() => { setSearchQuery(''); setCurrentFilter('all'); setCurrentSort('name-az'); }} className="mt-2 bg-[#f97316] hover:bg-[#ea580c] text-white font-semibold px-5 py-2 rounded-lg transition text-sm">Clear All Filters</button>
            </div>
          )}

          {displayCanteens.map(canteen => {
            const isOpen = canteen.status === "Open";
            return (
              <div 
                key={canteen._id} 
                className={`bg-white rounded-xl mb-4 p-6 flex justify-between items-center shadow-sm border border-gray-100 transition-all overflow-hidden ${isOpen ? 'cursor-pointer hover:shadow-md' : 'opacity-70 cursor-not-allowed'}`}
                onClick={() => goToMenu(canteen)}
              >
                <div>
                  <h2 className="text-2xl font-medium text-black mb-1">{canteen.name}</h2>
                  <p className="text-gray-400 text-sm">Timings: {canteen.timings || "4:00 PM - 4:00 AM"}</p>
                </div>
                <div className={`px-6 py-2 rounded-full font-medium text-sm ${isOpen ? 'bg-[#D1FAE5] text-[#065F46]' : 'bg-[#D1FAE5] text-[#065F46]'}`}>
                  {isOpen ? "Open" : "Closed"}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 2. MENU VIEW (Step 2) */}
      {step === 'menu' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
          
          {(selectedCanteen.status === "Closed") && (
            <div className="col-span-1 md:col-span-2 bg-white rounded-2xl p-10 shadow-sm border border-gray-100 text-center flex flex-col items-center justify-center gap-2">
                <AlertTriangle className="w-10 h-10 text-orange-400" />
                <h2 className="text-2xl font-semibold text-black mb-1">Canteen Closed</h2>
                <p className="text-gray-500 max-w-sm">This canteen is currently not accepting orders. Timings: {selectedCanteen.timings || "4:00 PM - 4:00 AM"}</p>
                <button onClick={goToList} className="mt-4 bg-[#1e293b] hover:bg-slate-800 text-white font-medium px-6 py-2.5 rounded-lg transition text-sm">Go Back to Canteens</button>
            </div>
          )}

          {selectedCanteen.status === "Open" && displayMenu.length === 0 && (
            <div className="col-span-2 text-center text-gray-500 py-10 text-xl font-bold bg-white rounded-2xl border border-gray-100 shadow-sm">
                This canteen has no food items available right now!
            </div>
          )}

          {selectedCanteen.status === "Open" && displayMenu.length > 0 && displayMenu.map(item => (
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center transition hover:shadow-md" key={item._id}>
              <div>
                <h3 className="text-xl font-medium text-black mb-1">{item.name}</h3>
                <p className="text-[#f97316] font-semibold text-lg">₹{item.price}</p>
              </div>
              
              {!cart[item._id] ? (
                <button 
                  className="cursor-pointer bg-[#f97316] hover:bg-[#ea580c] text-white px-6 py-2.5 rounded-xl font-medium transition text-base shadow-sm" 
                  onClick={() => updateQuantity(item._id, 1)}
                >
                  Add to Cart
                </button>
              ) : (
                <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-gray-50 shadow-inner">
                  <button className="cursor-pointer p-2.5 hover:bg-gray-200 transition text-gray-700" onClick={() => updateQuantity(item._id, -1)}>
                    <Minus className="w-5 h-5" />
                  </button>
                  <span className="px-5 font-semibold text-black text-xl">{cart[item._id]}</span>
                  <button className="cursor-pointer p-2.5 hover:bg-gray-200 transition text-gray-700" onClick={() => updateQuantity(item._id, 1)}>
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 3. CHECKOUT VIEW (Step 3) */}
      {step === 'checkout' && (
        <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-2xl font-medium text-black mb-6">Order Summary</h2>
          <div className="space-y-4 mb-8">
            {Object.entries(cart).map(([id, qty]) => {
              const item = menuData.find(i => i._id === id);
              if (!item) return null;
              return (
                <div key={id} className="flex justify-between items-center border-b border-gray-100 pb-4">
                  <div>
                    <p className="text-lg text-black">{item.name}</p>
                    <p className="text-sm text-gray-500">Qty: {qty}</p>
                  </div>
                  <p className="text-lg font-medium text-black">₹{item.price * qty}</p>
                </div>
              );
            })}
          </div>
          
          <div className="flex justify-between items-center bg-gray-50 p-6 rounded-xl mb-8">
            <span className="text-xl font-medium text-black">Total Cost:</span>
            <span className="text-2xl font-bold text-[#f97316]">₹{getTotalCost()}</span>
          </div>

          <button 
            className="cursor-pointer w-full bg-[#1e293b] hover:bg-slate-800 text-white py-4 rounded-xl font-medium text-lg transition" 
            onClick={handlePlaceDebtRequest}
          >
            Place Debt Request
          </button>
        </div>
      )}

      {/* FLOATING CART BAR */}
      {step === 'menu' && Object.keys(cart).length > 0 && (
        <div className="fixed bottom-0 right-0 w-[calc(100%-192px)] bg-white border-t border-gray-200 px-10 py-5 flex justify-between items-center shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-40">
          <div className="flex items-center gap-4">
            <div className="bg-[#f97316]/10 p-3 rounded-full">
              <ShoppingCart className="w-6 h-6 text-[#f97316]" />
            </div>
            <div>
              <p className="text-gray-500 text-sm max-w-md truncate">{getCartSummaryText()}</p>
              <p className="text-xl font-bold text-black">Total: ₹{getTotalCost()}</p>
            </div>
          </div>
          <button 
            className="cursor-pointer bg-[#f97316] hover:bg-[#ea580c] text-white px-8 py-3 rounded-xl font-medium text-lg transition shadow-md" 
            onClick={() => setStep('checkout')}
          >
            Review Order
          </button>
        </div>
      )}

    </main>
  );
};

export default StudentCanteens;
