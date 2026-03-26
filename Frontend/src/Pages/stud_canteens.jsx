import { BASE_URL } from '../config';
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { socket } from '../socket'; // Ensure this matches your actual import path
import {
  Search,
  ArrowLeft,
  Filter,
  ArrowDownUp,
  Plus,
  Minus,
  ShoppingCart,
  AlertTriangle,
  ChevronsUpDown,
  ChevronDown,
  CheckCircle,
  X
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

const StudentCanteens = () => {
  const { showAlert } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();

  const [step, setStep] = useState('list');
  const [canteensData, setCanteensData] = useState([]);
  const [selectedCanteen, setSelectedCanteen] = useState(null);
  const [cart, setCart] = useState({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [currentFilter, setCurrentFilter] = useState("all");
  const [currentSort, setCurrentSort] = useState("name-az");

  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

  const filterRef = useRef(null);
  const sortRef = useRef(null);
  const [menuData, setMenuData] = useState([]);

  // Handle clicks outside dropdowns
  useEffect(() => {
    function handleClickOutside(event) {
      if (filterRef.current && !filterRef.current.contains(event.target)) setIsFilterDropdownOpen(false);
      if (sortRef.current && !sortRef.current.contains(event.target)) setIsSortDropdownOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Bulletproof Initialization using React Router State
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/api/canteens`);
        let canteens = [];
        if (response.data.status === 'success') {
          canteens = response.data.data.canteens;
          setCanteensData(canteens);
        }

        const navState = location.state;
        
        if (navState && navState.reset) {
          setStep('list');
          setSelectedCanteen(null);
          setCart({});
          return;
        }
        
        if (navState && navState.isChangingOrder && canteens.length > 0) {
          const autoCanteenId = navState.canteenId;
          const canteenToOpen = canteens.find(c => c._id === autoCanteenId);
          
          if (canteenToOpen) {
            if (canteenToOpen.status === "Closed") {
              showAlert("Canteen Closed", "This canteen is currently closed. You cannot modify your order right now.", "warning");
            } else {
              const menuRes = await axios.get(`${BASE_URL}/api/canteens/${autoCanteenId}/menu`);
              
              if (menuRes.data.status === 'success') {
                const availableMenu = menuRes.data.data.menu.filter(item => item.isAvailable);
                setMenuData(availableMenu);
                
                try {
                  const savedItems = navState.cartItems || [];
                  const newCartState = {};
                  
                  savedItems.forEach(savedItem => {
                    const menuItem = availableMenu.find(m => m.name === savedItem.name);
                    if (menuItem) {
                      newCartState[menuItem._id] = savedItem.quantity; 
                    }
                  });
                  setCart(newCartState);
                } catch (e) {
                  console.error("Cart Recovery Failed:", e);
                }

                setSelectedCanteen(canteenToOpen);
                setStep('checkout');
              }
            }
          }
          
          navigate(location.pathname, { replace: true, state: null });
        }
      } catch (err) {
        console.error("Initialization error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [location.state, location.pathname, navigate]); 

  // Normal Menu Fetching
  const fetchMenu = async (canteenId) => {
    try {
      const response = await axios.get(`${BASE_URL}/api/canteens/${canteenId}/menu`);
      if (response.data.status === 'success') {
        const availableMenu = response.data.data.menu.filter(item => item.isAvailable);
        setMenuData(availableMenu);

        setCart(prev =>
          Object.fromEntries(
            Object.entries(prev).filter(([id]) =>
              availableMenu.some(item => item._id === id)
            )
          )
        );
      }
    } catch (err) {
      console.error("Failed to load live menu", err);
      setMenuData([]);
    }
  };

  // Socket: Live Menu Updates
  useEffect(() => {
    if (!selectedCanteen?._id || (step !== "menu" && step !== "checkout")) return;

    const canteenId = selectedCanteen._id;
    socket.emit("join-canteen", canteenId);

    const handleMenuUpdated = (payload) => {
      if (payload.canteenId === canteenId) fetchMenu(canteenId);
    };
    socket.on("menu-updated", handleMenuUpdated);

    return () => {
      socket.off("menu-updated", handleMenuUpdated);
      socket.emit("leave-canteen", canteenId);
    };
  }, [step, selectedCanteen]);

  // Socket: Canteen Status Updates
  useEffect(() => {
    const handleCanteenStatusUpdated = (payload) => {
      setCanteensData(prev =>
        prev.map(c => c._id === payload.canteenId ? { ...c, status: payload.isOpen ? "Open" : "Closed" } : c)
      );

      if (selectedCanteen?._id === payload.canteenId && !payload.isOpen) {
        showAlert("Canteen Closed", "This canteen has closed. Returning to the canteen list.", "info");
        goToList();
      }
    };
    socket.on("canteen-status-updated", handleCanteenStatusUpdated);
    return () => socket.off("canteen-status-updated", handleCanteenStatusUpdated);
  }, [selectedCanteen]);

  // Order Placement
  const handlePlaceDebtRequest = async () => {
    if (Object.keys(cart).length === 0) {
      showAlert("Cart Empty", "Your cart is empty! Please add some items before ordering.", "warning");
      return;
    }
    
    try {
      const token = sessionStorage.getItem('token');
      const orderData = {
        canteenId: selectedCanteen._id,
        items: Object.entries(cart).map(([id, qty]) => {
          const item = menuData.find(i => i._id === id);
          return item ? { name: item.name, quantity: qty, price: item.price } : null;
        }).filter(Boolean),
        totalAmount: getTotalCost()
      };

      const response = await axios.post(`${BASE_URL}/api/orders/place`, orderData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.status === 'success') {
        setToast(`Order sent to ${selectedCanteen.name}!`);
        setTimeout(() => setToast(null), 3500);
        goToList();
      }
    } catch (err) {
      showAlert("Order Failed", err.response?.data?.message || "Order failed. Please try again.", "error");
    }
  };

  // Navigation Handlers
  const goToMenu = async (canteen) => {
    if (canteen.status === "Closed") return;
    await fetchMenu(canteen._id);
    setSelectedCanteen(canteen);
    setSearchQuery("");
    setCurrentSort("name-az");
    setStep('menu');
  };

  const goToList = () => {
    setStep('list');
    setCart({});
    setSelectedCanteen(null);
    setMenuData([]);
    setCurrentFilter("all");
    setCurrentSort("name-az");
  };

  // --- NEW CART HANDLERS FOR KEYBOARD INPUT ---
  
  const updateQuantity = (id, delta) => {
    setCart(prev => {
      const currentQty = prev[id] === '' ? 0 : (prev[id] || 0);
      const newQty = currentQty + delta;
      if (newQty <= 0) {
        const newCart = { ...prev };
        delete newCart[id];
        return newCart;
      }
      return { ...prev, [id]: newQty };
    });
  };

  // Handles typing direct numbers
  const setAbsoluteQuantity = (id, value) => {
    setCart(prev => ({ ...prev, [id]: value }));
  };

  // Handles clicking away from the input field
  const handleQuantityBlur = (id) => {
    setCart(prev => {
      const currentVal = prev[id];
      if (currentVal === '' || currentVal <= 0) {
        const newCart = { ...prev };
        delete newCart[id]; // Safely remove if left empty
        return newCart;
      }
      return prev;
    });
  };

  const getTotalCost = () => {
    return Object.entries(cart).reduce((total, [id, qty]) => {
      const item = menuData.find(i => i._id === id);
      const validQty = qty === '' ? 0 : qty; // Fix to prevent NaN when typing
      return total + (item ? item.price * validQty : 0);
    }, 0);
  };

  const getCartSummaryText = () => {
    return Object.entries(cart)
      .map(([id, qty]) => {
        const item = menuData.find(i => i._id === id);
        return item && qty !== '' ? `${item.name} x${qty}` : "";
      })
      .filter(Boolean)
      .join(", ");
  };

  // Filters & Sorting
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

  const getFilterText = () => currentFilter === 'open' ? "Open Only" : "All Canteens";

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
    if (currentSort === 'name-az') return "Name: A to Z";
    if (currentSort === 'name-za') return "Name: Z to A";
    if (currentSort === 'price-low-high') return "Price: Low to High";
    if (currentSort === 'price-high-low') return "Price: High to Low";
    return "Sort by";
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-xl font-medium bg-[#F8FAFC] h-full flex flex-col items-center justify-center gap-2">
        <ChevronsUpDown className="w-10 h-10 text-orange-400 animate-pulse" />
        Loading...
      </div>
    );
  }

  return (
    <main className="p-10 pb-32 w-full h-full bg-[#F8FAFC] overflow-y-auto relative">
      {/* Dynamic Header */}
      {step !== 'list' && (
        <h1 className="text-3xl font-medium text-black mb-10 flex items-center gap-4">
          <ArrowLeft
            className="w-7 h-7 cursor-pointer text-gray-500 hover:text-black transition"
            onClick={step === 'menu' ? goToList : () => setStep('menu')}
          />
          {selectedCanteen?.name}
        </h1>
      )}

      {/* Top Search & Filter Bar */}
      {step !== 'checkout' && (
        <div className="flex justify-between items-center mb-10 gap-6">
          <div className="bg-white rounded-full flex items-center px-5 h-11 w-[450px] shadow-sm border border-gray-100 focus-within:ring-2 focus-within:ring-[#f97316] focus-within:border-[#f97316] transition">
            <Search className="w-4 h-4 text-gray-400 mr-3" />
            <input
              type="text"
              placeholder={step === 'list' ? "Search for Canteen" : "Search for Item"}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full outline-none text-gray-700 bg-transparent text-sm"
            />
          </div>

          <div className="flex gap-4">
            {step === 'list' && (
              <div className="relative" ref={filterRef}>
                <button
                  onClick={() => { setIsFilterDropdownOpen(!isFilterDropdownOpen); setIsSortDropdownOpen(false); }}
                  className="cursor-pointer bg-[#f97316] hover:bg-[#ea580c] text-white font-semibold px-5 h-11 rounded-xl shadow-sm flex items-center gap-2 transition min-w-[140px] justify-between text-sm"
                >
                  <div className="flex items-center gap-2"><Filter className="w-5 h-5" />{getFilterText()}</div>
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

            <div className="relative" ref={sortRef}>
              <button
                onClick={() => { setIsSortDropdownOpen(!isSortDropdownOpen); setIsFilterDropdownOpen(false); }}
                className="cursor-pointer bg-[#f97316] hover:bg-[#ea580c] text-white font-semibold px-5 h-11 rounded-xl shadow-sm flex items-center gap-2 transition min-w-[140px] justify-between text-sm"
              >
                <div className="flex items-center gap-2"><ArrowDownUp className="w-5 h-5" />{getSortText()}</div>
                <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${isSortDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {isSortDropdownOpen && (
                <div className="absolute right-0 mt-3 w-56 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                  <div onClick={() => { setCurrentSort('name-az'); setIsSortDropdownOpen(false); }} className={`px-5 py-3.5 text-base cursor-pointer hover:bg-gray-50 transition ${currentSort === 'name-az' ? 'bg-orange-50 font-semibold text-[#f97316]' : 'text-gray-700'}`}>Name: A to Z</div>
                  <div onClick={() => { setCurrentSort('name-za'); setIsSortDropdownOpen(false); }} className={`px-5 py-3.5 text-base cursor-pointer hover:bg-gray-50 transition ${currentSort === 'name-za' ? 'bg-orange-50 font-semibold text-[#f97316]' : 'text-gray-700'}`}>Name: Z to A</div>
                  {step === 'menu' && (
                    <>
                      <div onClick={() => { setCurrentSort('price-low-high'); setIsSortDropdownOpen(false); }} className={`px-5 py-3.5 text-base cursor-pointer hover:bg-gray-50 transition ${currentSort === 'price-low-high' ? 'bg-orange-50 font-semibold text-[#f97316]' : 'text-gray-700'}`}>Price: Low to High</div>
                      <div onClick={() => { setCurrentSort('price-high-low'); setIsSortDropdownOpen(false); }} className={`px-5 py-3.5 text-base cursor-pointer hover:bg-gray-50 transition ${currentSort === 'price-high-low' ? 'bg-orange-50 font-semibold text-[#f97316]' : 'text-gray-700'}`}>Price: High to Low</div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STEP: CANTEENS LIST */}
      {step === 'list' && (
        <div className="flex flex-col">
          {displayCanteens.length === 0 && (
            <div className="bg-white rounded-2xl p-10 shadow-sm border border-gray-100 text-center flex flex-col items-center justify-center gap-3">
              <AlertTriangle className="w-10 h-10 text-orange-400" />
              <p className="text-xl font-semibold text-gray-800">No matching canteens found!</p>
              <button
                onClick={() => { setSearchQuery(''); setCurrentFilter('all'); setCurrentSort('name-az'); }}
                className="mt-2 bg-[#f97316] hover:bg-[#ea580c] text-white font-semibold px-5 py-2 rounded-lg transition text-sm cursor-pointer"
              >
                Clear All Filters
              </button>
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
                <div className={`px-6 py-2 rounded-full font-medium text-sm ${isOpen ? 'bg-[#D1FAE5] text-[#065F46]' : 'bg-[#FEE2E2] text-[#991B1B]'}`}>
                  {isOpen ? "Open" : "Closed"}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* STEP: CANTEEN MENU */}
      {step === 'menu' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
          {selectedCanteen?.status === "Closed" && (
            <div className="col-span-1 md:col-span-2 bg-white rounded-2xl p-10 shadow-sm border border-gray-100 text-center flex flex-col items-center justify-center gap-2">
              <AlertTriangle className="w-10 h-10 text-orange-400" />
              <h2 className="text-2xl font-semibold text-black mb-1">Canteen Closed</h2>
              <p className="text-gray-500 max-w-sm">This canteen is currently not accepting orders. Timings: {selectedCanteen.timings || "4:00 PM - 4:00 AM"}</p>
              <button onClick={goToList} className="mt-4 bg-[#1e293b] hover:bg-slate-800 text-white font-medium px-6 py-2.5 rounded-lg transition text-sm cursor-pointer">
                Go Back to Canteens
              </button>
            </div>
          )}

          {selectedCanteen?.status === "Open" && displayMenu.length === 0 && (
            <div className="col-span-2 text-center text-gray-500 py-10 text-xl font-bold bg-white rounded-2xl border border-gray-100 shadow-sm">
              This canteen has no food items available right now!
            </div>
          )}

          {selectedCanteen?.status === "Open" && displayMenu.length > 0 && displayMenu.map(item => (
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center transition hover:shadow-md" key={item._id}>
              <div>
                <h3 className="text-xl font-medium text-black mb-1">{item.name}</h3>
                <p className="text-[#f97316] font-semibold text-lg">Rs.{item.price}</p>
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
                  
                  {/* 🌟 KEYBOARD EDITABLE INPUT (MENU) */}
                  <input
                    type="number"
                    value={cart[item._id]}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setAbsoluteQuantity(item._id, '');
                      } else {
                        const parsed = parseInt(val, 10);
                        if (!isNaN(parsed) && parsed >= 0) setAbsoluteQuantity(item._id, parsed);
                      }
                    }}
                    onBlur={() => handleQuantityBlur(item._id)}
                    className="w-14 text-center font-semibold text-black text-xl bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />

                  <button className="cursor-pointer p-2.5 hover:bg-gray-200 transition text-gray-700" onClick={() => updateQuantity(item._id, 1)}>
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* STEP: CHECKOUT */}
      {step === 'checkout' && (
        <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
            <h2 className="text-2xl font-medium text-black">Review Your Order</h2>
            <button 
              onClick={() => setStep('menu')} 
              className="text-[#f97316] hover:text-[#ea580c] font-semibold text-sm underline cursor-pointer"
            >
              + Add more items
            </button>
          </div>
          
          <div className="space-y-4 mb-8">
            {Object.keys(cart).length === 0 ? (
              <p className="text-gray-500 italic text-center py-4">Your cart is completely empty. Please add items.</p>
            ) : (
              Object.entries(cart).map(([id, qty]) => {
                const item = menuData.find(i => i._id === id);
                if (!item) return null;
                return (
                  <div key={id} className="flex justify-between items-center border-b border-gray-50 pb-4">
                    <div className="flex-1">
                      <p className="text-lg font-medium text-black">{item.name}</p>
                      <p className="text-sm text-gray-500">Rs.{item.price} each</p>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-gray-50 shadow-sm">
                        <button className="cursor-pointer p-2 hover:bg-gray-200 transition text-gray-700" onClick={() => updateQuantity(id, -1)}>
                          <Minus className="w-4 h-4" />
                        </button>
                        
                        {/* 🌟 KEYBOARD EDITABLE INPUT (CHECKOUT) */}
                        <input
                          type="number"
                          value={qty}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '') {
                              setAbsoluteQuantity(id, '');
                            } else {
                              const parsed = parseInt(val, 10);
                              if (!isNaN(parsed) && parsed >= 0) setAbsoluteQuantity(id, parsed);
                            }
                          }}
                          onBlur={() => handleQuantityBlur(id)}
                          className="w-12 text-center font-semibold text-black text-lg bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />

                        <button className="cursor-pointer p-2 hover:bg-gray-200 transition text-gray-700" onClick={() => updateQuantity(id, 1)}>
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-lg font-bold text-black w-20 text-right">
                        Rs.{item.price * (qty === '' ? 0 : qty)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex justify-between items-center bg-gray-50 p-6 rounded-xl mb-8">
            <span className="text-xl font-medium text-black">Total Cost:</span>
            <span className="text-2xl font-bold text-[#f97316]">Rs.{getTotalCost()}</span>
          </div>

          <button
            className="cursor-pointer w-full bg-[#1e293b] hover:bg-slate-800 text-white py-4 rounded-xl font-medium text-lg transition disabled:bg-gray-400 disabled:cursor-not-allowed"
            onClick={handlePlaceDebtRequest}
            disabled={Object.keys(cart).length === 0}
          >
            Confirm & Place Request
          </button>
        </div>
      )}

      {/* CART FOOTER */}
      {step === 'menu' && Object.keys(cart).length > 0 && (
        <div className="fixed bottom-0 right-0 w-[calc(100%-192px)] bg-white border-t border-gray-200 px-10 py-5 flex justify-between items-center shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-40">
          <div className="flex items-center gap-4">
            <div className="bg-[#f97316]/10 p-3 rounded-full">
              <ShoppingCart className="w-6 h-6 text-[#f97316]" />
            </div>
            <div>
              <p className="text-gray-500 text-sm max-w-md truncate">{getCartSummaryText()}</p>
              <p className="text-xl font-bold text-black">Total: Rs.{getTotalCost()}</p>
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

      {/* GREEN SUCCESS TOAST */}
      {toast && (
        <div className="fixed bottom-8 right-8 z-50">
          <div className="flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl text-white font-medium bg-green-600">
            <CheckCircle className="w-5 h-5" />
            {toast}
            <button onClick={() => setToast(null)} className="ml-4 text-white/70 hover:text-white transition cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </main>
  );
};

export default StudentCanteens;