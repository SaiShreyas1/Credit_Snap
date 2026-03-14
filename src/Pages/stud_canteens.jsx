import React, { useState } from 'react';

const StudentCanteens = () => {
  // --- 1. MOCK DATA ---
  const canteensData = [
    { id: 1, name: "Hall 1 Canteen", timings: "4:00 PM - 4:00 AM", status: "Open" },
    { id: 2, name: "Hall 10 Canteen", timings: "2:00 PM - 2:00 AM", status: "Closed" },
    { id: 3, name: "Hall 3 Canteen", timings: "2:00 PM - 2:00 AM", status: "Closed" },
    { id: 4, name: "Hall 12 Canteen", timings: "2:00 PM - 2:00 AM", status: "Open" },
    { id: 5, name: "Hall 8 Canteen", timings: "2:00 PM - 2:00 AM", status: "Closed" },
    { id: 6, name: "Hall 7 Canteen", timings: "2:00 PM - 2:00 AM", status: "Closed" },
  ];

  const menuData = [
    { id: 1, name: "Plain Maggie", price: 25, type: "veg" },
    { id: 2, name: "Plain Dosa", price: 50, type: "veg" },
    { id: 3, name: "Cheese Maggie", price: 50, type: "veg" },
    { id: 4, name: "Masala Maggie", price: 35, type: "veg" },
    { id: 5, name: "Chicken Biryani", price: 120, type: "non-veg" },
    { id: 6, name: "Veg Biryani", price: 60, type: "veg" },
  ];

  // --- 2. STATES ---
  const [step, setStep] = useState('list'); 
  const [selectedCanteen, setSelectedCanteen] = useState(null);
  const [cart, setCart] = useState({}); 

  // Filter & Sort States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterBy, setFilterBy] = useState("all"); 
  const [sortBy, setSortBy] = useState(""); 
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);

  // --- 3. HELPER FUNCTIONS ---
  const goToMenu = (canteen) => {
    if (canteen.status === "Closed") return;
    setSelectedCanteen(canteen);
    setSearchQuery("");
    setFilterBy("all");
    setSortBy("");
    setStep('menu');
  };

  const goToList = () => {
    setStep('list');
    setCart({}); 
    setSelectedCanteen(null);
    setSearchQuery("");
    setFilterBy("all");
    setSortBy("");
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

  // --- 4. PROCESSING DATA FOR VIEWS ---
  let displayCanteens = [...canteensData];
  let displayMenu = [...menuData];

  if (step === 'list') {
    displayCanteens = displayCanteens.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
    if (filterBy === 'open') displayCanteens = displayCanteens.filter(c => c.status === "Open");
    if (filterBy === 'closed') displayCanteens = displayCanteens.filter(c => c.status === "Closed");
    
    if (sortBy === 'asc') displayCanteens.sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === 'desc') displayCanteens.sort((a, b) => b.name.localeCompare(a.name));
  } 
  else if (step === 'menu') {
    displayMenu = displayMenu.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()));
    if (filterBy === 'veg') displayMenu = displayMenu.filter(m => m.type === "veg");
    if (filterBy === 'non-veg') displayMenu = displayMenu.filter(m => m.type === "non-veg");
    
    if (sortBy === 'price') displayMenu.sort((a, b) => a.price - b.price);
    if (sortBy === 'name') displayMenu.sort((a, b) => a.name.localeCompare(b.name));
  }

  // --- 5. CLEANED UP CSS (Only for inner content now!) ---
  const styles = `
    @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');

    /* Controls Row */
    .controls-row { display: flex; justify-content: space-between; margin-bottom: 30px; align-items: center;}
    .search-bar { background: white; padding: 12px 20px; border-radius: 25px; display: flex; align-items: center; width: 450px; border: 1px solid #ddd;}
    .search-bar i { color: #A0ABC0;}
    .search-bar input { border: none; outline: none; margin-left: 10px; width: 100%; font-size: 16px; color: #333;}
    
    .filter-sort { display: flex; gap: 10px;}
    .dropdown-container { position: relative; }
    .dropdown-btn { background: #f97316; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; min-width: 120px; display: flex; justify-content: space-between; align-items: center;}
    .dropdown-menu { position: absolute; top: 110%; left: 0; background: white; width: 100%; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); overflow: hidden; z-index: 10; border: 1px solid #eee;}
    .dropdown-menu div { padding: 10px; text-align: center; cursor: pointer; font-weight: 500; border-bottom: 1px solid #eee; color: #333;}
    .dropdown-menu div:hover { background: #f9f9f9; color: #f97316;}

    /* Step 1: Canteen List */
    .canteen-list { display: flex; flex-direction: column; gap: 15px; }
    .canteen-card { background: white; padding: 20px 30px; border-radius: 15px; border: 1px solid #E5E7EB; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: 0.2s;}
    .canteen-card:hover { border-color: #f97316; box-shadow: 0 4px 10px rgba(0,0,0,0.05);}
    .canteen-card.closed { opacity: 0.7; cursor: not-allowed;}
    .canteen-card.closed:hover { border-color: #E5E7EB; box-shadow: none;}
    .canteen-info h2 { font-size: 22px; color: #1e293b; margin-bottom: 5px;}
    .canteen-info p { color: #64748B; font-size: 14px;}
    .status-badge { padding: 6px 16px; border-radius: 20px; font-weight: bold; font-size: 14px;}
    .status-badge.open { background-color: #D1FAE5; color: #065F46;}
    .status-badge.closed { background-color: #FECACA; color: #991B1B;}

    /* Step 2: Menu */
    .menu-header { font-size: 28px; color: #1e293b; margin-bottom: 20px;}
    .menu-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .menu-card { background: white; padding: 20px; border-radius: 12px; border: 1px solid #E5E7EB; display: flex; justify-content: space-between; align-items: center;}
    .menu-info h3 { font-size: 18px; color: #1e293b; margin-bottom: 8px;}
    .menu-info p { color: #64748B; font-size: 14px;}
    .menu-price { color: #4A90E2; font-weight: bold;}
    
    .btn-order { background: #D1FAE5; color: #065F46; border: none; padding: 8px 20px; border-radius: 20px; font-weight: bold; cursor: pointer;}
    .qty-selector { display: flex; align-items: center; border: 1px solid #ddd; border-radius: 20px; overflow: hidden; background: white;}
    .qty-selector button { background: #f9f9f9; border: none; padding: 8px 12px; cursor: pointer; font-weight: bold; font-size: 16px;}
    .qty-selector span { padding: 0 15px; font-weight: bold;}

    /* Step 2: Bottom Cart Bar */
    .cart-bar { position: fixed; bottom: 0; right: 0; width: calc(100% - 192px); background: #F8FAFC; border-top: 1px solid #ddd; padding: 20px 40px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 -4px 10px rgba(0,0,0,0.05); z-index: 40;}
    .cart-details h4 { color: #1e293b; margin-bottom: 5px; font-size: 16px;}
    .cart-details p { font-weight: bold; font-size: 18px; color: #333;}
    .btn-checkout { background: #f97316; color: white; border: none; padding: 12px 30px; border-radius: 8px; font-weight: bold; font-size: 16px; cursor: pointer;}

    /* Step 3: Checkout Table */
    .checkout-table-container { background: white; border-radius: 12px; border: 1px solid #E5E7EB; overflow: hidden;}
    .checkout-table { width: 100%; border-collapse: collapse;}
    .checkout-table th { background: #E2E8F0; padding: 15px; text-align: left; color: #475569; font-weight: 600;}
    .checkout-table td { padding: 15px; border-bottom: 1px solid #E5E7EB; color: #1E293B;}
    .checkout-table tr:last-child td { border-bottom: none;}
    .total-row { background: #E2E8F0; font-weight: bold;}
    .total-row td { color: #1e293b;}
    
    .debt-request-container { display: flex; justify-content: center; margin-top: 40px;}
    .btn-debt { background: #f97316; color: white; border: none; padding: 15px 40px; border-radius: 8px; font-weight: bold; font-size: 18px; cursor: pointer;}
  `;

  return (
    <>
      <style>{styles}</style>
      
      {/* INNER CANTEEN CONTENT (Loads inside the Layout Frame!) */}
      <main className="p-8 overflow-y-auto w-full h-full pb-32">
        
        {/* Conditional Header based on Step */}
        {step !== 'list' && (
          <h1 className="menu-header">
            <i className="fa-solid fa-arrow-left" style={{marginRight: '15px', cursor: 'pointer', color: '#64748B'}} onClick={step === 'menu' ? goToList : () => setStep('menu')}></i>
            {selectedCanteen?.name}
          </h1>
        )}

        {/* Top Controls (Search, Filters) */}
        <div className="controls-row">
          <div className="search-bar">
            <i className="fa-solid fa-magnifying-glass"></i>
            <input 
              type="text" 
              placeholder={step === 'list' ? "Search for Canteen" : "Search for Item"} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="filter-sort">
            {/* Dynamic Filter Dropdown */}
            <div className="dropdown-container">
              <button className="dropdown-btn" onClick={() => setIsFilterOpen(!isFilterOpen)}>
                {filterBy === 'all' ? 'Filter by' : filterBy} 
                <i 
                  className="fa-solid fa-caret-down" 
                  style={{ transform: isFilterOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }}
                ></i>
              </button>
              {isFilterOpen && (
                <div className="dropdown-menu">
                  <div onClick={() => {setFilterBy('all'); setIsFilterOpen(false)}}>All</div>
                  {step === 'list' ? (
                    <>
                      <div onClick={() => {setFilterBy('open'); setIsFilterOpen(false)}}>Open</div>
                      <div onClick={() => {setFilterBy('closed'); setIsFilterOpen(false)}}>Closed</div>
                    </>
                  ) : (
                    <>
                      <div onClick={() => {setFilterBy('veg'); setIsFilterOpen(false)}}>Veg</div>
                      <div onClick={() => {setFilterBy('non-veg'); setIsFilterOpen(false)}}>Non-Veg</div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Dynamic Sort Dropdown */}
            <div className="dropdown-container">
              <button className="dropdown-btn" onClick={() => setIsSortOpen(!isSortOpen)}>
                {sortBy === '' ? 'Sort by' : sortBy} 
                <i 
                  className="fa-solid fa-caret-down" 
                  style={{ transform: isSortOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }}
                ></i>
              </button>
              {isSortOpen && (
                <div className="dropdown-menu">
                  {step === 'list' ? (
                    <>
                      <div onClick={() => {setSortBy('asc'); setIsSortOpen(false)}}>A-Z</div>
                      <div onClick={() => {setSortBy('desc'); setIsSortOpen(false)}}>Z-A</div>
                    </>
                  ) : (
                    <>
                      <div onClick={() => {setSortBy('name'); setIsSortOpen(false)}}>Name</div>
                      <div onClick={() => {setSortBy('price'); setIsSortOpen(false)}}>Price</div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* VIEW 1: CANTEEN LIST */}
        {step === 'list' && (
          <div className="canteen-list">
            {displayCanteens.map(canteen => (
              <div 
                key={canteen.id} 
                className={`canteen-card ${canteen.status === 'Closed' ? 'closed' : ''}`}
                onClick={() => goToMenu(canteen)}
              >
                <div className="canteen-info">
                  <h2>{canteen.name}</h2>
                  <p>Timings: {canteen.timings}</p>
                </div>
                <div className={`status-badge ${canteen.status.toLowerCase()}`}>
                  {canteen.status}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* VIEW 2: MENU GRID */}
        {step === 'menu' && (
          <div className="menu-grid">
            {displayMenu.map(item => (
              <div className="menu-card" key={item.id}>
                <div className="menu-info">
                  <h3>{item.name}</h3>
                  <p>Price: <span className="menu-price">₹{item.price}</span></p>
                </div>
                <div className="menu-action">
                  {!cart[item.id] ? (
                    <button className="btn-order" onClick={() => updateQuantity(item.id, 1)}>Order Now</button>
                  ) : (
                    <div className="qty-selector">
                      <button onClick={() => updateQuantity(item.id, -1)}>-</button>
                      <span>{cart[item.id]}</span>
                      <button onClick={() => updateQuantity(item.id, 1)}>+</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* VIEW 3: CHECKOUT TABLE */}
        {step === 'checkout' && (
          <>
            <div className="checkout-table-container">
              <table className="checkout-table">
                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>Food items</th>
                    <th>Quantity</th>
                    <th>Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(cart).map(([id, qty], index) => {
                    const item = menuData.find(i => i.id === parseInt(id));
                    return (
                      <tr key={id}>
                        <td>{index + 1}.</td>
                        <td>{item.name}</td>
                        <td>
                          <div className="qty-selector" style={{display: 'inline-flex'}}>
                            <button onClick={() => updateQuantity(item.id, -1)}>-</button>
                            <span>{qty}</span>
                            <button onClick={() => updateQuantity(item.id, 1)}>+</button>
                          </div>
                        </td>
                        <td className="menu-price">₹{item.price * qty}</td>
                      </tr>
                    );
                  })}
                  <tr className="total-row">
                    <td colSpan="3" style={{textAlign: 'right', paddingRight: '30px'}}>Total</td>
                    <td className="menu-price">₹{getTotalCost()}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="debt-request-container">
              <button className="btn-debt" onClick={() => alert("Debt Request Sent to Canteen Owner!")}>
                Place Debt Request
              </button>
            </div>
          </>
        )}

      </main>
      
      {/* --- BOTTOM CART SUMMARY BAR (Stays attached to bottom of screen) --- */}
      {step === 'menu' && Object.keys(cart).length > 0 && (
        <div className="cart-bar">
          <div className="cart-details">
            <h4>{getCartSummaryText()}</h4>
            <p>₹{getTotalCost()}</p>
          </div>
          <button className="btn-checkout" onClick={() => setStep('checkout')}>Check Out</button>
        </div>
      )}

    </>
  );
};

export default StudentCanteens;