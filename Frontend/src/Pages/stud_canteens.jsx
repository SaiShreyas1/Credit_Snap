import React, { useState, useEffect } from 'react';

const StudentCanteens = () => {
  // --- 1. STATES ---
  const [step, setStep] = useState('list'); 
  const [canteensData, setCanteensData] = useState([]); // Now dynamic!
  const [selectedCanteen, setSelectedCanteen] = useState(null);
  const [cart, setCart] = useState({}); 
  const [loading, setLoading] = useState(true);

  // Filter & Sort States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterBy, setFilterBy] = useState("all"); 
  const [sortBy, setSortBy] = useState(""); 
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);

  // --- 2. FETCH CANTEENS FROM BACKEND ---
  useEffect(() => {
    const fetchCanteens = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/v1/canteens');
        const data = await response.json();
        if (data.status === 'success') {
          setCanteensData(data.data);
        }
        setLoading(false);
      } catch (err) {
        console.error("Error fetching canteens:", err);
      }
    };
    fetchCanteens();
  }, []);

  // --- 3. HARDCODED MENU (Keep this or fetch from backend/canteen later) ---
  const menuData = [
    { id: 1, name: "Plain Maggie", price: 25, type: "veg" },
    { id: 2, name: "Plain Dosa", price: 50, type: "veg" },
    { id: 3, name: "Cheese Maggie", price: 50, type: "veg" },
    { id: 4, name: "Masala Maggie", price: 35, type: "veg" },
    { id: 5, name: "Chicken Biryani", price: 120, type: "non-veg" },
    { id: 6, name: "Veg Biryani", price: 60, type: "veg" },
  ];

  // --- 4. BACKEND INTEGRATION: PLACE DEBT REQUEST ---
  const handlePlaceDebtRequest = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const orderData = {
        canteenId: selectedCanteen._id, // Using MongoDB _id
        items: Object.entries(cart).map(([id, qty]) => {
          const item = menuData.find(i => i.id === parseInt(id));
          return { name: item.name, quantity: qty, price: item.price };
        }),
        totalAmount: getTotalCost()
      };

      const response = await fetch('http://localhost:5000/api/v1/orders/place', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderData)
      });

      const data = await response.json();

      if (data.status === 'success') {
        alert("Success! Debt Request sent to " + selectedCanteen.name);
        goToList(); // Reset page
      } else {
        alert("Error: " + data.message);
      }
    } catch (err) {
      alert("Something went wrong with the connection.");
    }
  };

  // --- 5. HELPER FUNCTIONS ---
  const goToMenu = (canteen) => {
    if (canteen.status === "Closed") return;
    setSelectedCanteen(canteen);
    setSearchQuery(""); setFilterBy("all"); setSortBy("");
    setStep('menu');
  };

  const goToList = () => {
    setStep('list'); setCart({}); setSelectedCanteen(null);
    setSearchQuery(""); setFilterBy("all"); setSortBy("");
  };

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
      const item = menuData.find(i => i.id === parseInt(id));
      return total + (item.price * qty);
    }, 0);
  };

  const getCartSummaryText = () => {
    return Object.entries(cart).map(([id, qty]) => {
      const item = menuData.find(i => i.id === parseInt(id));
      return `${item.name} x${qty}`;
    }).join(", ");
  };

  // --- 6. FILTER/SORT LOGIC ---
  let displayCanteens = [...canteensData];
  let displayMenu = [...menuData];

  if (step === 'list') {
    displayCanteens = displayCanteens.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
    if (filterBy === 'open') displayCanteens = displayCanteens.filter(c => c.status === "Open");
    if (filterBy === 'closed') displayCanteens = displayCanteens.filter(c => c.status === "Closed");
    if (sortBy === 'asc') displayCanteens.sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === 'desc') displayCanteens.sort((a, b) => b.name.localeCompare(a.name));
  } else if (step === 'menu') {
    displayMenu = displayMenu.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()));
    if (filterBy === 'veg') displayMenu = displayMenu.filter(m => m.type === "veg");
    if (filterBy === 'non-veg') displayMenu = displayMenu.filter(m => m.type === "non-veg");
    if (sortBy === 'price') displayMenu.sort((a, b) => a.price - b.price);
    if (sortBy === 'name') displayMenu.sort((a, b) => a.name.localeCompare(b.name));
  }

  const styles = `... (Your existing styles) ...`;

  if (loading) return <div className="p-8">Loading Canteens...</div>;

  return (
    <>
      <style>{styles}</style>
      <main className="p-8 overflow-y-auto w-full h-full pb-32 bg-[#EEF4ED]">
        {/* Header and Controls remain the same as your code */}
        {step !== 'list' && (
          <h1 className="menu-header">
            <i className="fa-solid fa-arrow-left" style={{marginRight: '15px', cursor: 'pointer', color: '#64748B'}} onClick={step === 'menu' ? goToList : () => setStep('menu')}></i>
            {selectedCanteen?.name}
          </h1>
        )}

        {/* Canteen List View */}
        {step === 'list' && (
          <div className="canteen-list">
            {displayCanteens.map(canteen => (
              <div key={canteen._id} className={`canteen-card ${canteen.status === 'Closed' ? 'closed' : ''}`} onClick={() => goToMenu(canteen)}>
                <div className="canteen-info">
                  <h2>{canteen.name}</h2>
                  <p>Timings: {canteen.timings}</p>
                </div>
                <div className={`status-badge ${canteen.status.toLowerCase()}`}>{canteen.status}</div>
              </div>
            ))}
          </div>
        )}

        {/* Menu and Checkout views remain the same, just update the Place Debt Request button: */}
        {step === 'checkout' && (
            <div className="debt-request-container">
              <button className="btn-debt" onClick={handlePlaceDebtRequest}>
                Place Debt Request
              </button>
            </div>
        )}
      </main>

      {/* Cart summary bar remains the same */}
    </>
  );
};

export default StudentCanteens;