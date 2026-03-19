import React, { useState, useEffect } from 'react';

export default function CreditSnapDashboard() {
  const [isCanteenOpen, setIsCanteenOpen] = useState(() => {
    const saved = localStorage.getItem('canteenStatus');
    return saved === 'true'; 
  });

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- 1. FETCH LIVE ORDERS FROM BACKEND ---
  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/v1/orders/my-orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.status === 'success') {
        setOrders(data.data);
      }
      setLoading(false);
    } catch (err) {
      console.error("Error fetching orders:", err);
    }
  };

  useEffect(() => {
    fetchOrders();
    // Optional: Refresh orders every 30 seconds
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    localStorage.setItem('canteenStatus', isCanteenOpen);
  }, [isCanteenOpen]);

  // --- 2. BACKEND ACTION: ACCEPT/REJECT/REMOVE ---
  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/v1/orders/update-status', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ orderId, status: newStatus })
      });

      const data = await response.json();
      if (data.status === 'success') {
        // Refresh the list to show the updated status/debt badge
        fetchOrders();
      } else {
        alert(data.message); // Shows "Credit limit exceeded" if applicable
      }
    } catch (err) {
      alert("Failed to update order.");
    }
  };

  const clearAllOrders = () => {
    // Usually, you'd want a backend "archive" route for this, 
    // but for now, we'll just filter the UI
    setOrders(orders.filter(order => order.status !== 'accepted'));
  };

  if (loading) return <div className="p-8">Loading Dashboard...</div>;

  return (
    <div className="active-orders-container">
      <style>{`
        /* ... Your existing CSS styles remain exactly the same ... */
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
              onChange={() => setIsCanteenOpen(!isCanteenOpen)} 
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
            <button className="clear-all-btn" onClick={clearAllOrders}>Clear History</button>
          </div>

          {orders.map((order) => (
            <div className="order-card" key={order._id}>
              {/* Show X button if order is processed */}
              {order.status !== 'pending' && (
                <button className="close-x" onClick={() => handleUpdateStatus(order._id, 'archived')}>✕</button>
              )}
              
              <div className="info-col">
                {/* Student data comes from the .populate() in your backend */}
                <h2>{order.student?.name || "Unknown Student"}</h2>
                <p>Roll: {order.student?.rollNo}</p>
                <p>Time: {new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
              </div>
              
              <div className="items-col">
                {order.items.map((item, index) => (
                  <span className="item-text" key={index}>{item.name} x{item.quantity}</span>
                ))}
              </div>
              
              <div className="action-col">
                <span className="price">₹{order.totalAmount}</span>
                
                {order.status === 'pending' ? (
                  <div className="btn-group">
                    <button className="btn btn-accept" onClick={() => handleUpdateStatus(order._id, 'accepted')}>Accept</button>
                    <button className="btn btn-reject" onClick={() => handleUpdateStatus(order._id, 'rejected')}>Reject</button>
                  </div>
                ) : (
                  <span className={`debt-badge ${order.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {order.status === 'accepted' ? 'Added to Debt' : 'Rejected'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}