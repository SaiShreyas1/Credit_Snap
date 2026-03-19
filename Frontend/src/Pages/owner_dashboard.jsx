import React, { useState, useEffect } from 'react';
import axios from 'axios'; 

export default function CreditSnapDashboard() {
  // ==========================================
  // 1. CANTEEN DATABASE STATE (Integrated)
  // ==========================================
  const [canteen, setCanteen] = useState(null);
  const [isCanteenOpen, setIsCanteenOpen] = useState(false);

  // ==========================================
  // 2. ORDERS LOCAL STATE (Kept from your original code)
  // ==========================================
  const [orders, setOrders] = useState(() => {
    const savedOrders = localStorage.getItem('canteenOrders');
    if (savedOrders) {
      return JSON.parse(savedOrders); 
    }
    return [
      { id: 1, name: "Sai Chaitanya", phone: "+91xxxxxxxxx, Hall 3", time: "12:30 AM", items: ["Paneer Fried Rice x1", "Cold Coffee x1"], price: "₹80", type: "pending" },
      { id: 2, name: "Sai Shreyas", phone: "+91xxxxxxxxx, Hall 12, A513", time: "12:37 AM", items: ["Cheese Maggie x1", "Chai x1"], price: "₹60", type: "pending" },
      { id: 3, name: "Ram Charan", phone: "+91xxxxxxxxx, Hall 5, C204", time: "12:42 AM", items: ["Chicken Biryani x1", "Thumbs Up x1"], price: "₹150", type: "pending" },
      { id: 4, name: "Rahul Kumar", phone: "+91xxxxxxxxx, Hall 1, D102", time: "12:15 AM", items: ["Chicken Roll x1", "Coke x1"], price: "₹90", type: "debt" }
    ];
  });

  useEffect(() => {
    localStorage.setItem('canteenOrders', JSON.stringify(orders));
  }, [orders]);

  // ==========================================
  // 3. FETCH CANTEEN ON LOAD (Integration!)
  // ==========================================
  useEffect(() => {
    const fetchMyCanteen = async () => {
      try {
        const token = localStorage.getItem('token'); 
        
        // 🚨 Using the correct plural 'canteens' URL
        const res = await axios.get('http://localhost:5000/api/canteens/my', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setCanteen(res.data.data.canteen);
        setIsCanteenOpen(res.data.data.canteen.isOpen); // Sets UI based on MongoDB!
        localStorage.setItem('canteenId', res.data.data.canteen._id);
      } catch (err) {
        console.error("Failed to load canteen", err);
      }
    };
    fetchMyCanteen();
  }, []);

  // ==========================================
  // 4. TOGGLE SWITCH API CALL (Integration!)
  // ==========================================
  const toggleStatus = async () => {
    if (!canteen) return;
    try {
      const newStatus = !isCanteenOpen;
      const token = localStorage.getItem('token');
      
      // 🚨 Using the correct plural 'canteens' URL
      await axios.put(`http://localhost:5000/api/canteens/${canteen._id}/status`, 
        { isOpen: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setIsCanteenOpen(newStatus); // Updates the UI only if database update succeeds
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  // ==========================================
  // 5. ORDER BUTTON LOGIC (Unchanged)
  // ==========================================
  const removeOrder = (orderIdToRemove) => {
    setOrders(orders.filter(order => order.id !== orderIdToRemove));
  };

  const acceptOrder = (orderIdToAccept) => {
    setOrders(prevOrders => {
      const orderToMove = prevOrders.find(order => order.id === orderIdToAccept);
      if (!orderToMove) return prevOrders;
      const updatedOrder = { ...orderToMove, type: 'debt' };
      const remainingOrders = prevOrders.filter(order => order.id !== orderIdToAccept);
      return [...remainingOrders, updatedOrder];
    });
  };

  const clearAllOrders = () => {
    setOrders(orders.filter(order => order.type !== 'debt'));
  };

  // ==========================================
  // 6. RENDER UI
  // ==========================================
  return (
    <div className="active-orders-container">
      <style>{`
        .active-orders-container {
          display: flex;
          flex-direction: column;
          height: 100%; 
          width: 100%;
          background-color: #EEF4ED; 
          overflow: hidden;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 30px 40px 20px 40px;
          flex-shrink: 0;
        }

        .page-title {
          font-size: 34px;
          font-weight: 400;
          color: #000;
        }

        .status-container {
          display: flex;
          align-items: center;
          gap: 15px;
          font-size: 22px;
          font-weight: 400;
          color: #000;
        }

        /* --- TOGGLE SWITCH --- */
        .switch {
          position: relative;
          display: inline-block;
          width: 64px;
          height: 34px;
        }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider {
          position: absolute;
          cursor: pointer;
          top: 0; left: 0; right: 0; bottom: 0;
          background-color: #D00000;
          transition: .4s;
          border-radius: 34px;
        }
        .slider:before {
          position: absolute;
          content: "";
          height: 26px;
          width: 26px;
          left: 4px;
          bottom: 4px;
          background-color: white;
          transition: .4s;
          border-radius: 50%;
        }
        input:checked + .slider { background-color: #38b000; }
        input:checked + .slider:before { transform: translateX(30px); }

        /* --- EMPTY STATE TEXT --- */
        .empty-state-wrapper {
          flex-grow: 1; 
          display: flex;
          align-items: center;
          justify-content: center;
          padding-bottom: 80px; 
        }

        .empty-text {
          font-family: "Righteous", "Arial Black", sans-serif;
          font-size: 80px;
          font-weight: 700;
          color: #000;
          letter-spacing: -1px;
        }

        /* --- ORDER CARDS --- */
        .card-container {
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          gap: 20px;
          padding: 0px 40px 40px 40px;
          overflow-y: auto;
          flex-grow: 1;
        }

        .clear-all-row {
          display: flex;
          justify-content: flex-end;
          margin-bottom: -5px;
        }

        .clear-all-btn {
          background: none;
          border: none;
          color: #D00000;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
        }
        .clear-all-btn:hover { text-decoration: underline; }

        .order-card {
          background: white;
          border-radius: 20px;
          padding: 25px 35px;
          display: grid;
          grid-template-columns: 1.5fr 1fr 0.8fr; 
          align-items: center;
          gap: 30px; 
          position: relative;
          box-shadow: 0 4px 10px rgba(0,0,0,0.06);
          animation: fadeIn 0.3s ease;
          flex: 0 0 auto; 
          height: max-content; 
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .info-col h2 {
          font-size: 22px;
          font-weight: 500;
          color: #000;
          margin-bottom: 4px; 
        }
        .info-col p {
          font-size: 13px;
          color: #888;
          margin-bottom: 2px; 
          line-height: 1.4;
        }

        .items-col {
          display: flex;
          flex-direction: column;
          gap: 4px; 
          justify-content: center;
        }
        .item-text {
          font-size: 16px;
          color: #000;
          font-weight: 400;
        }

        .action-col {
          display: flex;
          flex-direction: column;
          align-items: flex-end; 
          justify-content: center;
          gap: 15px;
        }
        
        .price {
          font-size: 26px;
          font-weight: 500;
          color: #000;
          margin-right: 25px; 
        }

        .btn-group {
          display: flex;
          gap: 15px;
        }
        .btn {
          border: none;
          padding: 8px 25px;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          transition: 0.2s;
        }
        .btn-accept { background-color: #A8E6A3; color: #1E6019; }
        .btn-reject { background-color: #FF9E9E; color: #7A1818; }
        .btn:hover { filter: brightness(0.95); }
        
        .debt-badge {
          background-color: #FFECCB;
          color: #E68A00;
          padding: 6px 20px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 700;
          margin-right: 5px;
        }

        .close-x {
          position: absolute;
          top: 15px;
          right: 20px;
          font-size: 20px; 
          color: #999;
          cursor: pointer;
          background: none;
          border: none;
          transition: 0.2s;
        }
        .close-x:hover { color: #000; }
      `}</style>

      {/* Top Header Row */}
      <div className="page-header">
        <h1 className="page-title">Active Orders</h1>
        <div className="status-container">
          <span>Canteen Status:</span>
          <label className="switch">
            <input 
              type="checkbox" 
              checked={isCanteenOpen} 
              onChange={toggleStatus} // 🚨 INTEGRATED HERE!
            />
            <span className="slider"></span>
          </label>
        </div>
      </div>

      {/* MAIN LOGIC CONTROLLER */}
      {!isCanteenOpen ? (
        <div className="empty-state-wrapper">
          <div style={{ textAlign: 'center' }}>
            <h2 className="empty-text">Canteen Closed</h2>
            <p style={{ fontSize: '22px', color: '#666', marginTop: '10px' }}>
              Turn on the status to start receiving orders
            </p>
          </div>
        </div>
      ) : orders.length === 0 ? (
        <div className="empty-state-wrapper">
          <h2 className="empty-text">No Current Orders</h2>
        </div>
      ) : (
        <div className="card-container">
          
          <div className="clear-all-row">
            <button className="clear-all-btn" onClick={clearAllOrders}>Clear All</button>
          </div>

          {orders.map((order) => (
            <div className="order-card" key={order.id}>
              {/* Show X button only if it's a debt order */}
              {order.type === 'debt' && (
                <button className="close-x" onClick={() => removeOrder(order.id)}>✕</button>
              )}
              
              <div className="info-col">
                <h2>{order.name}</h2>
                <p>Ph no. {order.phone}</p>
                <p>Time: {order.time}</p>
              </div>
              
              <div className="items-col">
                {order.items.map((item, index) => (
                  <span className="item-text" key={index}>{item}</span>
                ))}
              </div>
              
              <div className="action-col">
                <span className="price" style={order.type === 'debt' ? { marginRight: '30px' } : {}}>{order.price}</span>
                
                {order.type === 'pending' ? (
                  <div className="btn-group">
                    <button className="btn btn-accept" onClick={() => acceptOrder(order.id)}>Accept</button>
                    <button className="btn btn-reject" onClick={() => removeOrder(order.id)}>Reject</button>
                  </div>
                ) : (
                  <span className="debt-badge">Added to debt</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}