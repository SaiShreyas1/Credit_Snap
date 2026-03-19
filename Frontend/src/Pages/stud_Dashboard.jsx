import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function StudDashboard() {
  const [totalDebt, setTotalDebt] = useState(0); 
  const [currentOrders, setCurrentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔄 FETCH DATA FROM BACKEND
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem('token');
        
        // 1. Fetch Student Orders
        const orderRes = await fetch('http://localhost:5000/api/v1/orders/my-active-orders', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const orderData = await orderRes.json();

        // 2. Fetch User Profile (to get the updated Total Debt)
        const profileRes = await fetch('http://localhost:5000/api/v1/users/my-profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const profileData = await profileRes.json();

        if (orderData.status === 'success') setCurrentOrders(orderData.data);
        if (profileData.status === 'success') setTotalDebt(profileData.data.user.totalDebt);
        
        setLoading(false);
      } catch (err) {
        console.error("Dashboard error:", err);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) return <div className="p-8 text-center">Loading Dashboard...</div>;

  return (
    <main className="p-8 overflow-y-auto flex-1 bg-gray-50 min-h-screen">
      {/* ... Total Debt Card remains the same ... */}
      <div className="flex flex-col md:flex-row gap-6 mb-8">
         <div className="bg-gradient-to-r from-[#1e3a8a] to-[#3b82f6] rounded-2xl p-6 text-white flex-1 shadow-lg h-40 flex flex-col justify-between">
           <div>
             <p className="text-lg opacity-90">Total Debt:</p>
             <h1 className="text-4xl font-bold tracking-tight">₹{totalDebt.toFixed(2)}</h1>
           </div>
           {totalDebt > 0 && <button className="bg-[#f97316] w-max px-6 py-1.5 rounded-full font-semibold shadow-md">Pay Now</button>}
         </div>
         {/* ... Alerts box ... */}
      </div>

      <div>
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Current Orders:</h2>
        <div className="space-y-4">
          {currentOrders.length === 0 ? (
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center text-gray-500">
                You have no active orders. Go to Canteens to order some food!
            </div>
          ) : (
            currentOrders.map((order) => (
              <div key={order._id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-1">
                    {order.items.map(item => `${item.name} x${item.quantity}`).join(', ')}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {order.canteen.name}, <span className="text-gray-500">{new Date(order.createdAt).toLocaleTimeString()}</span>
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide ${
                    order.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {order.status.toUpperCase()}
                  </span>
                  <span className="font-semibold text-blue-900">Price: <span className="text-blue-600">₹{order.totalAmount}</span></span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}