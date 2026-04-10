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

  // ==========================================
  // STATE MANAGEMENT
  // ==========================================

  // View State: Controls which screen the user is currently seeing via URL params
  const basePath = '/student/canteens';
  const path = location.pathname.replace(basePath, '');
  const segments = path.split('/').filter(Boolean); // e.g. ['Hall%203', 'checkout']
  
  let step = 'list';
  let urlCanteenName = null;
  if (segments.length > 0) {
    urlCanteenName = decodeURIComponent(segments[0]);
    if (segments.length > 1 && segments[1] === 'checkout') {
      step = 'checkout';
    } else {
      step = 'menu';
    }
  }

  // Data State: Holds data fetched from the API
  const [canteensData, setCanteensData] = useState([]);
  const [menuData, setMenuData] = useState([]);
  const [selectedCanteen, setSelectedCanteen] = useState(null);

  // Cart State: Stores item IDs as keys and quantities as values (e.g., { "item123": 2 })
  const [cart, setCart] = useState({});

  // UI State
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [currentFilter, setCurrentFilter] = useState("all"); // 'all' | 'open'
  const [currentSort, setCurrentSort] = useState("name-az"); // 'name-az' | 'name-za' | 'price-low-high' | 'price-high-low'

  // Dropdown UI State
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const filterRef = useRef(null);
  const sortRef = useRef(null);

  // ==========================================
  // EFFECTS & LIFECYCLES
  // ==========================================

  // 1. Handle clicks outside filter/sort dropdowns to close them automatically
  useEffect(() => {
    function handleClickOutside(event) {
      if (filterRef.current && !filterRef.current.contains(event.target)) setIsFilterDropdownOpen(false);
      if (sortRef.current && !sortRef.current.contains(event.target)) setIsSortDropdownOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 2. Initial Data Load & Router State Management
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Fetch all available canteens
        const response = await axios.get(`${BASE_URL}/api/canteens`);
        let canteens = [];
        if (response.data.status === 'success') {
          canteens = response.data.data.canteens;
          setCanteensData(canteens);
        }

        const navState = location.state;

        // Scenario A: User navigated here to explicitly reset their view
        if (navState && navState.reset) {
          navigate('/student/canteens', { replace: true, state: null });
          setSelectedCanteen(null);
          setCart({});
          return;
        }

        // Scenario B: User clicked "Edit Order" from another page. 
        // We need to auto-load the specific canteen, its menu, and populate the cart.
        if (navState && navState.isChangingOrder && canteens.length > 0) {
          const autoCanteenId = navState.canteenId;
          const canteenToOpen = canteens.find(c => c._id === autoCanteenId);

          if (canteenToOpen) {
            if (canteenToOpen.status === "Closed") {
              showAlert("Canteen Closed", "This canteen is currently closed. You cannot modify your order right now.", "warning");
            } else {
              // Fetch the menu for the specific canteen being edited
              const menuRes = await axios.get(`${BASE_URL}/api/canteens/${autoCanteenId}/menu`);

              if (menuRes.data.status === 'success') {
                const availableMenu = menuRes.data.data.menu.filter(item => item.isAvailable);
                setMenuData(availableMenu);

                // Reconstruct the cart state from the saved items passed via router state
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

                // Auto-navigate user directly to the checkout review step
                setSelectedCanteen(canteenToOpen);
                const slug = canteenToOpen.name.toLowerCase().replace(/\s+/g, '-');
                navigate(`/student/canteens/${slug}/checkout`, { replace: true, state: null });
              }
            }
          }
          return; // Skip reading initialURLParams because we handled Edit Order
        }

        // Scenario C: User refreshed the page or directly navigated via URL params
        const currentPath = window.location.pathname.replace(basePath, '');
        const currentSegments = currentPath.split('/').filter(Boolean);
        let initialCanteenName = null;
        if (currentSegments.length > 0) {
           initialCanteenName = decodeURIComponent(currentSegments[0]);
        }
        
        if (initialCanteenName && canteens.length > 0) {
          const formatToSlug = (name) => name.toLowerCase().replace(/\s+/g, '-');
          const canteenToOpen = canteens.find(c => formatToSlug(c.name) === initialCanteenName.toLowerCase());
          if (canteenToOpen) {
            setSelectedCanteen(canteenToOpen);
            // fetch menu to restore state for 'menu' or 'checkout' step
            try {
              const menuRes = await axios.get(`${BASE_URL}/api/canteens/${canteenToOpen._id}/menu`);
              if (menuRes.data.status === 'success') {
                const availableMenu = menuRes.data.data.menu.filter(item => item.isAvailable);
                setMenuData(availableMenu);
              }
            } catch(e) {
              console.error("Failed to fetch menu on load", e);
            }
          } else {
             // Invalid canteen ID in URL, fallback to list
             navigate('/student/canteens', { replace: true });
          }
        }
      } catch (err) {
        console.error("Initialization error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [location.state, location.pathname, navigate]);

  // ==========================================
  // DATA FETCHING & SOCKET LISTENERS
  // ==========================================

  // Fetch the latest menu for a specific canteen and clean up the cart
  const fetchMenu = async (canteenId) => {
    try {
      const response = await axios.get(`${BASE_URL}/api/canteens/${canteenId}/menu`);
      if (response.data.status === 'success') {
        const availableMenu = response.data.data.menu.filter(item => item.isAvailable);
        setMenuData(availableMenu);

        // Remove items from the current cart if they are no longer available on the menu
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

  // Socket Listener: Real-time Menu Updates
  // Triggers only when the user is actively viewing a specific canteen's menu or checkout
  useEffect(() => {
    if (!selectedCanteen?._id || (step !== "menu" && step !== "checkout")) return;

    const canteenId = selectedCanteen._id;
    socket.emit("join-canteen", canteenId);

    const handleMenuUpdated = (payload) => {
      // Re-fetch the menu if the canteen owner makes a change
      if (payload.canteenId === canteenId) fetchMenu(canteenId);
    };
    socket.on("menu-updated", handleMenuUpdated);

    // Cleanup: Leave the socket room when component unmounts or selected canteen changes
    return () => {
      socket.off("menu-updated", handleMenuUpdated);
      socket.emit("leave-canteen", canteenId);
    };
  }, [step, selectedCanteen]);

  // Socket Listener: Real-time Canteen Status (Open/Closed)
  useEffect(() => {
    const handleCanteenStatusUpdated = (payload) => {
      // Update the status in the main canteen list
      setCanteensData(prev =>
        prev.map(c => c._id === payload.canteenId ? { ...c, status: payload.isOpen ? "Open" : "Closed" } : c)
      );

      // If the canteen the user is currently viewing closes, kick them back to the main list
      if (selectedCanteen?._id === payload.canteenId && !payload.isOpen) {
        showAlert("Canteen Closed", "This canteen has closed. Returning to the canteen list.", "info");
        goToList();
      }
    };
    socket.on("canteen-status-updated", handleCanteenStatusUpdated);
    return () => socket.off("canteen-status-updated", handleCanteenStatusUpdated);
  }, [selectedCanteen]);


  // ==========================================
  // ORDER SUBMISSION
  // ==========================================
  const handlePlaceDebtRequest = async () => {
    const validItems = Object.values(cart).filter(qty => qty !== '' && qty > 0);
    if (validItems.length === 0) {
      showAlert("Cart Empty", "Your cart is empty! Please add some items before ordering.", "warning");
      return;
    }

    try {
      const token = sessionStorage.getItem('token');

      // Format the cart data to match the backend Order schema
      const orderData = {
        canteenId: selectedCanteen._id,
        items: Object.entries(cart).map(([id, qty]) => {
          const item = menuData.find(i => i._id === id);
          return item ? { name: item.name, quantity: qty, price: item.price } : null;
        }).filter(Boolean), // Remove any null items
        totalAmount: getTotalCost()
      };

      const response = await axios.post(`${BASE_URL}/api/orders/place`, orderData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.status === 'success') {
        setToast(`Order sent to ${selectedCanteen.name}!`);
        setTimeout(() => setToast(null), 3500);
        goToList(); // Reset view after successful order
      }
    } catch (err) {
      showAlert("Order Failed", err.response?.data?.message || "Order failed. Please try again.", "error");
    }
  };


  // ==========================================
  // NAVIGATION HANDLERS
  // ==========================================
  const goToMenu = async (canteen) => {
    if (canteen.status === "Closed") return;
    
    // Clear cart if switching to a different canteen
    if (selectedCanteen?._id !== canteen._id) {
      setCart({});
    }

    await fetchMenu(canteen._id);
    setSelectedCanteen(canteen);
    setSearchQuery("");
    setCurrentSort("name-az");
    const slug = canteen.name.toLowerCase().replace(/\s+/g, '-');
    navigate(`/student/canteens/${slug}`);
  };

  const goToList = () => {
    navigate('/student/canteens'); // Remove URL params to go back to list
    setCart({}); // Clear cart when leaving the canteen
    setSelectedCanteen(null);
    setMenuData([]);
    setCurrentFilter("all");
    setCurrentSort("name-az");
  };


  // ==========================================
  // CART INPUT HANDLERS
  // ==========================================

  // Handles button clicks (+ / -)
  const updateQuantity = (id, delta) => {
    if (delta > 0 && (cart[id] || 0) >= 100) {
      showAlert("Limit Exceeded", "Quantity cannot exceed 100 for a single item.", "warning");
      return;
    }

    setCart(prev => {
      const currentQty = prev[id] === '' ? 0 : (prev[id] || 0);
      let newQty = currentQty + delta;

      if (newQty > 100) {
        newQty = 100;
      }

      // Remove item from cart if quantity drops to 0 or below
      if (newQty <= 0) {
        const newCart = { ...prev };
        delete newCart[id];
        return newCart;
      }
      return { ...prev, [id]: newQty };
    });
  };

  // Handles direct user typing in the input field
  const setAbsoluteQuantity = (id, value) => {
    if (value !== '' && value > 100) {
      showAlert("Limit Exceeded", "Quantity cannot exceed 100 for a single item.", "warning");
      value = 100;
    }
    setCart(prev => ({ ...prev, [id]: value }));
  };

  // Handles when the user clicks away from the input field
  // Prevents invalid states (like an empty string) from remaining in the cart object
  const handleQuantityBlur = (id) => {
    setCart(prev => {
      const currentVal = prev[id];
      if (currentVal === '' || currentVal <= 0) {
        const newCart = { ...prev };
        delete newCart[id];
        return newCart;
      }
      return prev;
    });
  };

  // Cart Utility: Calculates total price, handling potential empty string states during typing
  const getTotalCost = () => {
    return Object.entries(cart).reduce((total, [id, qty]) => {
      const item = menuData.find(i => i._id === id);
      const validQty = qty === '' ? 0 : qty;
      return total + (item ? item.price * validQty : 0);
    }, 0);
  };

  // Cart Utility: Generates the comma-separated string shown in the floating footer
  const getCartSummaryText = () => {
    return Object.entries(cart)
      .map(([id, qty]) => {
        const item = menuData.find(i => i._id === id);
        return item && qty !== '' ? `${item.name} x${qty}` : "";
      })
      .filter(Boolean)
      .join(", ");
  };


  // ==========================================
  // DERIVED STATE (FILTERING & SORTING)
  // ==========================================

  // Applies active filters and search query to the canteen list
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

  // Applies active filters and search query to the menu items
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


  // ==========================================
  // RENDER UI
  // ==========================================

  if (loading) {
    return (
      <div className="p-8 text-center text-xl font-medium bg-[#F8FAFC] h-full flex flex-col items-center justify-center gap-2">
        <ChevronsUpDown className="w-10 h-10 text-orange-400 animate-pulse" />
        Loading...
      </div>
    );
  }

  return (
    <main className="relative min-h-full w-full overflow-y-auto bg-[#F8FAFC] px-4 pb-40 pt-4 sm:px-6 sm:pt-6 lg:px-10 lg:pt-10">

      {/* --- DYNAMIC HEADER --- */}
      {step !== 'list' && (
        <h1 className="mb-6 flex items-start gap-3 text-2xl font-medium text-black sm:mb-10 sm:items-center sm:gap-4 sm:text-3xl">
          <ArrowLeft
            className="mt-0.5 h-6 w-6 cursor-pointer text-gray-500 transition hover:text-black sm:mt-0 sm:h-7 sm:w-7"
            onClick={step === 'menu' ? goToList : () => navigate(`/student/canteens/${selectedCanteen?.name.toLowerCase().replace(/\s+/g, '-')}`)}
          />
          {selectedCanteen?.name}
        </h1>
      )}

      {/* --- TOP SEARCH & FILTER BAR --- */}
      {step !== 'checkout' && (
        <div className="mb-6 flex flex-col gap-4 sm:mb-10 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
          <div className="flex h-11 w-full items-center rounded-full border border-gray-100 bg-white px-5 shadow-sm transition focus-within:border-[#f97316] focus-within:ring-2 focus-within:ring-[#f97316] lg:max-w-[450px]">
            <Search className="w-4 h-4 text-gray-400 mr-3" />
            <input
              type="text"
              placeholder={step === 'list' ? "Search for Canteen" : "Search for Item"}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full outline-none text-gray-700 bg-transparent text-sm"
            />
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row sm:gap-4 lg:w-auto">
            {step === 'list' && (
              <div className="relative" ref={filterRef}>
                <button
                  onClick={() => { setIsFilterDropdownOpen(!isFilterDropdownOpen); setIsSortDropdownOpen(false); }}
                  className="flex h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-xl bg-[#f97316] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#ea580c] sm:min-w-[140px]"
                >
                  <div className="flex items-center gap-2"><Filter className="w-5 h-5" />{getFilterText()}</div>
                  <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${isFilterDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {/* Filter Dropdown Content */}
                {isFilterDropdownOpen && (
                  <div className="absolute left-0 right-0 mt-3 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl z-50 sm:left-auto sm:right-0 sm:w-48">
                    <div onClick={() => { setCurrentFilter('all'); setIsFilterDropdownOpen(false); }} className={`px-5 py-3.5 text-base cursor-pointer hover:bg-gray-50 transition ${currentFilter === 'all' ? 'bg-orange-50 font-semibold text-[#f97316]' : 'text-gray-700'}`}>All Canteens</div>
                    <div onClick={() => { setCurrentFilter('open'); setIsFilterDropdownOpen(false); }} className={`px-5 py-3.5 text-base cursor-pointer hover:bg-gray-50 transition ${currentFilter === 'open' ? 'bg-orange-50 font-semibold text-[#f97316]' : 'text-gray-700'}`}>Open Only</div>
                  </div>
                )}
              </div>
            )}

            <div className="relative" ref={sortRef}>
              <button
                onClick={() => { setIsSortDropdownOpen(!isSortDropdownOpen); setIsFilterDropdownOpen(false); }}
                className="flex h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-xl bg-[#f97316] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#ea580c] sm:min-w-[140px]"
              >
                <div className="flex items-center gap-2"><ArrowDownUp className="w-5 h-5" />{getSortText()}</div>
                <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${isSortDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {/* Sort Dropdown Content */}
              {isSortDropdownOpen && (
                <div className="absolute left-0 right-0 mt-3 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl z-50 sm:left-auto sm:right-0 sm:w-56">
                  <div onClick={() => { setCurrentSort('name-az'); setIsSortDropdownOpen(false); }} className={`px-5 py-3.5 text-base cursor-pointer hover:bg-gray-50 transition ${currentSort === 'name-az' ? 'bg-orange-50 font-semibold text-[#f97316]' : 'text-gray-700'}`}>Name: A to Z</div>
                  <div onClick={() => { setCurrentSort('name-za'); setIsSortDropdownOpen(false); }} className={`px-5 py-3.5 text-base cursor-pointer hover:bg-gray-50 transition ${currentSort === 'name-za' ? 'bg-orange-50 font-semibold text-[#f97316]' : 'text-gray-700'}`}>Name: Z to A</div>
                  {/* Price sorting is only visible when looking at a specific menu */}
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

      {/* --- STEP 1: CANTEENS LIST VIEW --- */}
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
                className={`mb-4 flex flex-col gap-4 overflow-hidden rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all sm:flex-row sm:items-center sm:justify-between sm:p-6 ${isOpen ? 'cursor-pointer hover:shadow-md' : 'cursor-not-allowed opacity-70'}`}
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

      {/* --- STEP 2: CANTEEN MENU VIEW --- */}
      {step === 'menu' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">

          {/* Canteen Closed Notice */}
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

          {/* Empty Menu Notice */}
          {selectedCanteen?.status === "Open" && displayMenu.length === 0 && (
            <div className="col-span-2 text-center text-gray-500 py-10 text-xl font-bold bg-white rounded-2xl border border-gray-100 shadow-sm">
              This canteen has no food items available right now!
            </div>
          )}

          {/* Render Menu Items */}
          {selectedCanteen?.status === "Open" && displayMenu.length > 0 && displayMenu.map(item => (
            <div className="flex items-start justify-between gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition hover:shadow-md sm:items-center sm:p-6" key={item._id}>
              <div className="min-w-0 flex-1">
                <h3 className="text-xl font-medium text-black mb-1">{item.name}</h3>
                <p className="text-[#f97316] font-semibold text-lg">Rs.{item.price}</p>
              </div>

              {/* Add to Cart button OR +/- Controls */}
              {cart[item._id] === undefined ? (
                <button
                  className="shrink-0 cursor-pointer whitespace-nowrap rounded-xl bg-[#f97316] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#ea580c] sm:px-6 sm:text-base"
                  onClick={() => updateQuantity(item._id, 1)}
                >
                  Add to Cart
                </button>
              ) : (
                <div className="flex shrink-0 items-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50 shadow-inner">
                  <button className="cursor-pointer p-2.5 hover:bg-gray-200 transition text-gray-700" onClick={() => updateQuantity(item._id, -1)}>
                    <Minus className="w-5 h-5" />
                  </button>

                  {/* 🌟 KEYBOARD EDITABLE INPUT */}
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
                    className="w-10 text-center font-semibold text-black text-lg bg-transparent outline-none sm:w-14 sm:text-xl [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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

      {/* --- STEP 3: CHECKOUT REVIEW VIEW --- */}
      {step === 'checkout' && (
        <div className="mx-auto max-w-3xl rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6 lg:p-8">
          <div className="mb-6 flex flex-col gap-3 border-b border-gray-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-2xl font-medium text-black">Review Your Order</h2>
            <button
              onClick={() => navigate(`/student/canteens/${selectedCanteen?.name.toLowerCase().replace(/\s+/g, '-')}`)}
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
                  <div key={id} className="flex flex-col gap-4 border-b border-gray-50 pb-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1">
                      <p className="text-lg font-medium text-black">{item.name}</p>
                      <p className="text-sm text-gray-500">Rs.{item.price} each</p>
                    </div>

                    <div className="flex w-full items-center justify-between gap-4 sm:w-auto sm:justify-normal sm:gap-6">
                      <div className="flex items-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50 shadow-sm">
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
                      <p className="w-auto text-left text-lg font-bold text-black sm:w-20 sm:text-right">
                        Rs.{item.price * (qty === '' ? 0 : qty)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="mb-8 flex flex-col gap-2 rounded-xl bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <span className="text-xl font-medium text-black">Total Cost:</span>
            <span className="text-2xl font-bold text-[#f97316]">Rs.{getTotalCost()}</span>
          </div>

          <button
            className="cursor-pointer w-full bg-[#1e293b] hover:bg-slate-800 text-white py-4 rounded-xl font-medium text-lg transition disabled:bg-gray-400 disabled:cursor-not-allowed"
            onClick={handlePlaceDebtRequest}
            disabled={Object.values(cart).every(qty => qty === '' || qty <= 0)}
          >
            Confirm & Place Request
          </button>
        </div>
      )}

      {/* --- CART FOOTER (Floating Bar) --- */}
      {step === 'menu' && Object.values(cart).some(qty => qty !== '' && qty > 0) && (
        <div className="fixed bottom-0 left-0 right-0 z-40 flex flex-col gap-4 border-t border-gray-200 bg-white px-4 py-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] transition-[left] duration-300 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5 md:left-[var(--student-sidebar-width)] lg:px-10">
          <div className="flex min-w-0 items-center gap-4">
            <div className="bg-[#f97316]/10 p-3 rounded-full">
              <ShoppingCart className="w-6 h-6 text-[#f97316]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="max-w-none truncate text-sm text-gray-500 sm:max-w-md">{getCartSummaryText()}</p>
              <p className="text-xl font-bold text-black">Total: Rs.{getTotalCost()}</p>
            </div>
          </div>
          <button
            className="w-full cursor-pointer rounded-xl bg-[#f97316] px-8 py-3 text-lg font-medium text-white shadow-md transition hover:bg-[#ea580c] sm:w-auto"
            onClick={() => navigate(`/student/canteens/${selectedCanteen?.name.toLowerCase().replace(/\s+/g, '-')}/checkout`)}
          >
            Review Order
          </button>
        </div>
      )}

      {/* --- GREEN SUCCESS TOAST NOTIFICATION --- */}
      {toast && (
        <div className="fixed bottom-4 left-4 right-4 z-50 sm:bottom-8 sm:left-auto sm:right-8">
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
